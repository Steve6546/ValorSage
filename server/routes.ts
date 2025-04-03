import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer } from "ws";
import { WebSocket } from "ws";
import { z } from "zod";
import { insertUserSchema, insertProjectSchema, insertFileSchema, insertActivitySchema } from "@shared/schema";
import { randomBytes } from "crypto";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication with Passport
  setupAuth(app);
  
  const httpServer = createServer(app);
  
  // WebSocket server for real-time collaboration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store client connections
  const clients = new Map();
  
  wss.on('connection', (ws) => {
    const clientId = randomBytes(4).toString('hex');
    clients.set(clientId, ws);
    
    // Handle messages from clients
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle file updates for real-time collaboration
        if (data.type === 'file_update') {
          // Update file in the database
          await storage.updateFileContent(data.fileId, data.content);
          
          // Broadcast to all connected clients except sender
          clients.forEach((client, id) => {
            if (id !== clientId && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'file_update',
                projectId: data.projectId,
                file: {
                  id: data.fileId,
                  content: data.content,
                  name: data.fileName || 'Untitled'
                },
                user: data.username || 'Anonymous'
              }));
            }
          });
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });
    
    // Handle client disconnection
    ws.on('close', () => {
      clients.delete(clientId);
    });
  });
  
  // Middleware to check authentication
  const authenticate = async (req, res, next) => {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = user;
    next();
  };
  
  // Projects routes
  app.get('/api/projects', authenticate, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUser(req.user.id);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.get('/api/projects/recent', authenticate, async (req, res) => {
    try {
      const recentProjects = await storage.getRecentProjects(req.user.id, 4);
      res.json(recentProjects);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.post('/api/projects', authenticate, async (req, res) => {
    try {
      const projectData = {
        ...req.body,
        ownerId: req.user.id
      };
      
      const validatedData = insertProjectSchema.parse(projectData);
      const project = await storage.createProject(validatedData);
      
      // Create default files for the project based on type
      await storage.createDefaultProjectFiles(project.id, project.type);
      
      // Record activity
      await storage.createActivity({
        title: `تم إنشاء مشروع "${project.name}"`,
        type: 'create',
        details: 'تم إنشاء مشروع جديد',
        projectId: project.id,
        userId: req.user.id
      });
      
      // Get project with collaborators
      const fullProject = await storage.getProjectById(project.id);
      
      res.status(201).json(fullProject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.get('/api/projects/:id', authenticate, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user has access to the project
      if (project.ownerId !== req.user.id && !await storage.isProjectCollaborator(projectId, req.user.id)) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.delete('/api/projects/:id', authenticate, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user is the owner
      if (project.ownerId !== req.user.id) {
        return res.status(403).json({ message: 'Only the owner can delete a project' });
      }
      
      await storage.deleteProject(projectId);
      
      res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Files routes
  app.get('/api/projects/:projectId/files', authenticate, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user has access to the project
      if (project.ownerId !== req.user.id && !await storage.isProjectCollaborator(projectId, req.user.id)) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const files = await storage.getProjectFiles(projectId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.post('/api/projects/:projectId/files', authenticate, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user has access to the project
      if (project.ownerId !== req.user.id && !await storage.isProjectCollaborator(projectId, req.user.id)) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Set file extension based on name
      const fileName = req.body.name;
      const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
      
      const fileData = {
        ...req.body,
        projectId,
        extension,
        type: req.body.type || 'file'
      };
      
      const validatedData = insertFileSchema.parse(fileData);
      const file = await storage.createFile(validatedData);
      
      // Record activity
      await storage.createActivity({
        title: `تم إنشاء ملف "${file.name}"`,
        type: 'create',
        details: `تم إنشاء ملف جديد في مشروع "${project.name}"`,
        projectId,
        userId: req.user.id
      });
      
      res.status(201).json(file);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.put('/api/projects/:projectId/files/:fileId', authenticate, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const fileId = parseInt(req.params.fileId);
      
      if (isNaN(projectId) || isNaN(fileId)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user has access to the project
      if (project.ownerId !== req.user.id && !await storage.isProjectCollaborator(projectId, req.user.id)) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const file = await storage.getFileById(fileId);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      if (file.projectId !== projectId) {
        return res.status(400).json({ message: 'File does not belong to this project' });
      }
      
      let updatedFile;
      
      // Update content if provided
      if (req.body.content !== undefined) {
        updatedFile = await storage.updateFileContent(fileId, req.body.content);
      }
      
      // Update name if provided
      if (req.body.name) {
        const extension = req.body.name.includes('.') ? req.body.name.split('.').pop() : '';
        updatedFile = await storage.updateFileName(fileId, req.body.name, extension);
      }
      
      // Record activity if name was changed
      if (req.body.name && req.body.name !== file.name) {
        await storage.createActivity({
          title: `تم تغيير اسم ملف "${file.name}" إلى "${req.body.name}"`,
          type: 'update',
          projectId,
          userId: req.user.id
        });
      }
      
      // Update project's updatedAt timestamp
      await storage.updateProjectTimestamp(projectId);
      
      res.json(updatedFile || file);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.delete('/api/projects/:projectId/files/:fileId', authenticate, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const fileId = parseInt(req.params.fileId);
      
      if (isNaN(projectId) || isNaN(fileId)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user has access to the project
      if (project.ownerId !== req.user.id && !await storage.isProjectCollaborator(projectId, req.user.id)) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const file = await storage.getFileById(fileId);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      if (file.projectId !== projectId) {
        return res.status(400).json({ message: 'File does not belong to this project' });
      }
      
      await storage.deleteFile(fileId);
      
      // Record activity
      await storage.createActivity({
        title: `تم حذف ملف "${file.name}"`,
        type: 'delete',
        projectId,
        userId: req.user.id
      });
      
      res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Collaborators routes
  app.get('/api/collaborators', authenticate, async (req, res) => {
    try {
      const collaborators = await storage.getCollaborators(req.user.id);
      res.json(collaborators);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Activities routes
  app.get('/api/activities', authenticate, async (req, res) => {
    try {
      const activities = await storage.getUserActivities(req.user.id);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Usage stats
  app.get('/api/stats/usage', authenticate, async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.user.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  return httpServer;
}
