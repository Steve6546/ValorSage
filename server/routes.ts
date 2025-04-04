import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer } from "ws";
import { WebSocket } from "ws";
import { z } from "zod";
import { insertUserSchema, insertProjectSchema, insertFileSchema, insertActivitySchema, User, ProjectType } from "@shared/schema";
import { randomBytes } from "crypto";
import { setupAuth } from "./auth";

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Define an authenticated request type that ensures user is present
type AuthenticatedRequest = Request & { user: User };

// دوال مساعدة لمعلومات أنواع المشاريع
function getProjectTypeName(type: string): string {
  switch(type) {
    case ProjectType.HTML: return 'HTML, CSS, JavaScript';
    case ProjectType.REACT: return 'React';
    case ProjectType.VUE: return 'Vue.js';
    case ProjectType.ANGULAR: return 'Angular';
    case ProjectType.NODEJS: return 'Node.js';
    case ProjectType.PYTHON: return 'Python';
    case ProjectType.PHP: return 'PHP';
    case ProjectType.JAVA: return 'Java';
    case ProjectType.GO: return 'Go';
    case ProjectType.TYPESCRIPT: return 'TypeScript';
    default: return type;
  }
}

function getProjectTypeDescription(type: string): string {
  switch(type) {
    case ProjectType.HTML: 
      return 'إنشاء موقع ويب باستخدام HTML و CSS و JavaScript الأساسية';
    case ProjectType.REACT: 
      return 'إطار عمل JavaScript لبناء واجهات المستخدم التفاعلية';
    case ProjectType.VUE: 
      return 'إطار عمل JavaScript تدريجي لبناء واجهات المستخدم';
    case ProjectType.ANGULAR: 
      return 'منصة لبناء تطبيقات ويب على نطاق واسع';
    case ProjectType.NODEJS: 
      return 'بيئة تشغيل JavaScript على الخادم';
    case ProjectType.PYTHON: 
      return 'لغة برمجة عامة الأغراض سهلة التعلم والاستخدام';
    case ProjectType.PHP: 
      return 'لغة برمجة مخصصة لتطوير الويب';
    case ProjectType.JAVA: 
      return 'لغة برمجة قوية وآمنة للتطبيقات متعددة المنصات';
    case ProjectType.GO: 
      return 'لغة مفتوحة المصدر مصممة للأداء العالي والتزامن';
    case ProjectType.TYPESCRIPT: 
      return 'امتداد لـ JavaScript يضيف الأنواع الثابتة والواجهات';
    default: 
      return 'نوع مشروع غير معروف';
  }
}

function getProjectTypeIcon(type: string): string {
  switch(type) {
    case ProjectType.HTML: return 'html';
    case ProjectType.REACT: return 'react';
    case ProjectType.VUE: return 'vue';
    case ProjectType.ANGULAR: return 'angular';
    case ProjectType.NODEJS: return 'nodejs';
    case ProjectType.PYTHON: return 'python';
    case ProjectType.PHP: return 'php';
    case ProjectType.JAVA: return 'java';
    case ProjectType.GO: return 'go';
    case ProjectType.TYPESCRIPT: return 'typescript';
    default: return 'code';
  }
}

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
  // Custom authenticate middleware that ensures req.user is defined
  const authenticate = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Passport.js guarantees that req.user exists if req.isAuthenticated() is true
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // At this point, TypeScript can be sure that req.user is defined
    next();
  };
  
  // Projects routes
  app.get('/api/projects', authenticate, async (req: Request, res: Response) => {
    try {
      const projects = await storage.getProjectsByUser(req.user!.id);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.get('/api/projects/recent', authenticate, async (req, res) => {
    try {
      const recentProjects = await storage.getRecentProjects(req.user!.id, 4);
      res.json(recentProjects);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.post('/api/projects', authenticate, async (req, res) => {
    try {
      // تحقق من قيمة نوع المشروع
      if (req.body.type && !Object.values(ProjectType).includes(req.body.type)) {
        return res.status(400).json({ 
          message: 'نوع المشروع غير صالح', 
          validTypes: Object.values(ProjectType) 
        });
      }
      
      const projectData = {
        ...req.body,
        ownerId: req.user!.id
      };
      
      const validatedData = insertProjectSchema.parse(projectData);
      const project = await storage.createProject(validatedData);
      
      // إنشاء الملفات الافتراضية بناءً على نوع المشروع
      await storage.createDefaultProjectFiles(project.id, project.type);
      
      // تسجيل النشاط
      await storage.createActivity({
        title: `تم إنشاء مشروع "${project.name}"`,
        type: 'create',
        details: `تم إنشاء مشروع جديد من نوع ${project.type}`,
        projectId: project.id,
        userId: req.user!.id
      });
      
      // الحصول على المشروع مع المتعاونين
      const fullProject = await storage.getProjectById(project.id);
      
      res.status(201).json(fullProject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      console.error('Error creating project:', error);
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
  
  // الحصول على لغات البرمجة المدعومة
  app.get('/api/project-types', (req, res) => {
    try {
      // إرجاع كل لغات البرمجة المدعومة مع وصف مختصر لكل منها
      const supportedTypes = Object.values(ProjectType).map(type => ({
        id: type,
        name: getProjectTypeName(type),
        description: getProjectTypeDescription(type),
        icon: getProjectTypeIcon(type)
      }));
      
      res.json(supportedTypes);
    } catch (error) {
      console.error('Error getting project types:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  return httpServer;
}
