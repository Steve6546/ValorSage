import { 
  users, 
  projects, 
  projectCollaborators, 
  files,
  activities,
  type User, 
  type InsertUser,
  type Project,
  type InsertProject,
  type ProjectWithCollaborators,
  type InsertFile,
  type FileItem,
  type FileType,
  type InsertActivity,
  type Activity,
  type Collaborator,
  type UsageStats
} from "@shared/schema";

// interface for storage operations
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Session Store
  sessionStore: session.Store;
  // User Operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Project Operations
  getProjectById(id: number): Promise<ProjectWithCollaborators | undefined>;
  getProjectsByUser(userId: number): Promise<ProjectWithCollaborators[]>;
  getRecentProjects(userId: number, limit: number): Promise<ProjectWithCollaborators[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, data: Partial<Project>): Promise<Project>;
  deleteProject(id: number): Promise<void>;
  updateProjectTimestamp(id: number): Promise<void>;
  
  // Project Collaborator Operations
  isProjectCollaborator(projectId: number, userId: number): Promise<boolean>;
  getCollaborators(userId: number): Promise<Collaborator[]>;
  
  // File Operations
  getFileById(id: number): Promise<FileItem | undefined>;
  getProjectFiles(projectId: number): Promise<FileItem[]>;
  createFile(file: InsertFile): Promise<FileItem>;
  updateFileContent(id: number, content: string): Promise<FileItem>;
  updateFileName(id: number, name: string, extension: string): Promise<FileItem>;
  deleteFile(id: number): Promise<void>;
  createDefaultProjectFiles(projectId: number, projectType: string): Promise<void>;
  
  // Activity Operations
  createActivity(activity: InsertActivity): Promise<Activity>;
  getUserActivities(userId: number): Promise<Activity[]>;
  
  // Stats Operations
  getUserStats(userId: number): Promise<UsageStats>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private collaborators: Map<number, { projectId: number, userId: number, role: string }[]>;
  private files: Map<number, FileItem>;
  private activities: Map<number, Omit<Activity, 'by'> & { userId: number }>;
  
  public sessionStore: session.Store;
  
  private currentUserId: number;
  private currentProjectId: number;
  private currentFileId: number;
  private currentActivityId: number;
  
  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    this.users = new Map();
    this.projects = new Map();
    this.collaborators = new Map();
    this.files = new Map();
    this.activities = new Map();
    
    this.currentUserId = 1;
    this.currentProjectId = 1;
    this.currentFileId = 1;
    this.currentActivityId = 1;
    
    // Initialize with a default user for easier testing
    this.createUser({
      username: 'أحمد محمد',
      password: 'password123',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=80&q=80'
    });
    
    // Create sample collaborators for demo
    const collaborators = [
      {
        username: 'سارة أحمد',
        password: 'password123',
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=40&q=80'
      },
      {
        username: 'محمد علي',
        password: 'password123',
        avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=40&q=80'
      },
      {
        username: 'نورا حسن',
        password: 'password123',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=40&q=80'
      }
    ];
    
    collaborators.forEach(collab => {
      this.createUser(collab);
    });
    
    // Create sample projects
    this.createSampleData();
  }
  
  private createSampleData() {
    // Create two sample projects for the main user
    const project1 = this.createProject({
      name: 'موقع الشركة',
      description: 'موقع تعريفي للشركة باستخدام HTML و CSS و JavaScript',
      type: 'html',
      status: 'published',
      ownerId: 1
    });
    
    const project2 = this.createProject({
      name: 'تطبيق قائمة المهام',
      description: 'تطبيق لإدارة المهام اليومية باستخدام React و TypeScript',
      type: 'react',
      status: 'draft',
      ownerId: 1
    });
    
    // Add collaborators to the first project
    this.addCollaborator(project1.id, 2, 'editor');
    this.addCollaborator(project1.id, 3, 'viewer');
    
    // Create default files for projects
    this.createDefaultProjectFiles(project1.id, 'html');
    this.createDefaultProjectFiles(project2.id, 'react');
    
    // Create sample activities
    this.createActivity({
      title: 'تم حفظ مشروع "موقع الشركة"',
      type: 'save',
      details: 'تم تحديث ملفات HTML وإضافة صفحة التواصل',
      projectId: project1.id,
      userId: 1
    });
    
    this.createActivity({
      title: 'تم نشر مشروع "موقع الشركة"',
      type: 'publish',
      details: '',
      projectId: project1.id,
      userId: 1,
      projectUrl: 'https://ako.js/projects/company-website'
    });
    
    this.createActivity({
      title: 'انضمت سارة إلى مشروع "تطبيق قائمة المهام"',
      type: 'collaborate',
      projectId: project2.id,
      userId: 1
    });
  }
  
  // User Operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const timestamp = new Date().toISOString();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: timestamp
    };
    this.users.set(id, user);
    return user;
  }
  
  // Project Operations
  async getProjectById(id: number): Promise<ProjectWithCollaborators | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    // Get project collaborators
    const projectCollabs = this.collaborators.get(id) || [];
    const collaborators: Collaborator[] = await Promise.all(
      projectCollabs.map(async (collab) => {
        const user = await this.getUser(collab.userId);
        if (!user) throw new Error(`User ${collab.userId} not found`);
        
        // For demo purposes, generate random online status
        const isOnline = Math.random() > 0.5;
        const lastSeen = isOnline ? null : new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString();
        
        return {
          id: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl || '',
          isOnline,
          lastSeen
        };
      })
    );
    
    // Add owner as a collaborator if not already included
    const ownerExists = collaborators.find(c => c.id === project.ownerId);
    if (!ownerExists) {
      const owner = await this.getUser(project.ownerId);
      if (owner) {
        collaborators.unshift({
          id: owner.id,
          username: owner.username,
          avatarUrl: owner.avatarUrl || '',
          isOnline: true,
          lastSeen: null
        });
      }
    }
    
    return {
      ...project,
      collaborators
    };
  }
  
  async getProjectsByUser(userId: number): Promise<ProjectWithCollaborators[]> {
    // Get projects where user is owner
    const ownedProjects = Array.from(this.projects.values())
      .filter(project => project.ownerId === userId);
    
    // Get projects where user is a collaborator
    const collabProjects = Array.from(this.collaborators.entries())
      .filter(([_, collabs]) => collabs.some(c => c.userId === userId))
      .map(([projectId]) => this.projects.get(Number(projectId)))
      .filter(Boolean) as Project[];
    
    // Combine lists and remove duplicates
    const uniqueProjects = [...ownedProjects];
    collabProjects.forEach(project => {
      if (!uniqueProjects.find(p => p.id === project.id)) {
        uniqueProjects.push(project);
      }
    });
    
    // Sort by updated date (most recent first)
    uniqueProjects.sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    
    // Convert to ProjectWithCollaborators
    const projectsWithCollabs = await Promise.all(
      uniqueProjects.map(project => this.getProjectById(project.id))
    );
    
    return projectsWithCollabs.filter(Boolean) as ProjectWithCollaborators[];
  }
  
  async getRecentProjects(userId: number, limit: number): Promise<ProjectWithCollaborators[]> {
    const projects = await this.getProjectsByUser(userId);
    return projects.slice(0, limit);
  }
  
  async createProject(project: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const timestamp = new Date().toISOString();
    const newProject: Project = {
      ...project,
      id,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.projects.set(id, newProject);
    return newProject;
  }
  
  async updateProject(id: number, data: Partial<Project>): Promise<Project> {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project ${id} not found`);
    }
    
    const updatedProject = {
      ...project,
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  
  async deleteProject(id: number): Promise<void> {
    // Delete all files associated with this project
    const projectFiles = Array.from(this.files.values())
      .filter(file => file.projectId === id);
    
    for (const file of projectFiles) {
      await this.deleteFile(file.id);
    }
    
    // Delete project collaborators
    this.collaborators.delete(id);
    
    // Delete the project
    this.projects.delete(id);
  }
  
  async updateProjectTimestamp(id: number): Promise<void> {
    const project = this.projects.get(id);
    if (project) {
      project.updatedAt = new Date().toISOString();
      this.projects.set(id, project);
    }
  }
  
  // Project Collaborator Operations
  async isProjectCollaborator(projectId: number, userId: number): Promise<boolean> {
    const projectCollabs = this.collaborators.get(projectId) || [];
    return projectCollabs.some(collab => collab.userId === userId);
  }
  
  async addCollaborator(projectId: number, userId: number, role: string): Promise<void> {
    const projectCollabs = this.collaborators.get(projectId) || [];
    
    // Check if collaborator already exists
    const existingCollab = projectCollabs.find(collab => collab.userId === userId);
    if (existingCollab) {
      // Update role if different
      if (existingCollab.role !== role) {
        existingCollab.role = role;
        this.collaborators.set(projectId, projectCollabs);
      }
      return;
    }
    
    // Add new collaborator
    projectCollabs.push({
      projectId,
      userId,
      role
    });
    
    this.collaborators.set(projectId, projectCollabs);
  }
  
  async getCollaborators(userId: number): Promise<Collaborator[]> {
    // Find all projects where this user is owner or collaborator
    const projects = await this.getProjectsByUser(userId);
    
    // Get unique collaborators across all projects
    const uniqueCollaborators = new Map<number, Collaborator>();
    
    for (const project of projects) {
      for (const collaborator of project.collaborators) {
        if (collaborator.id !== userId && !uniqueCollaborators.has(collaborator.id)) {
          uniqueCollaborators.set(collaborator.id, collaborator);
        }
      }
    }
    
    return Array.from(uniqueCollaborators.values());
  }
  
  // File Operations
  async getFileById(id: number): Promise<FileItem | undefined> {
    return this.files.get(id);
  }
  
  async getProjectFiles(projectId: number): Promise<FileItem[]> {
    return Array.from(this.files.values())
      .filter(file => file.projectId === projectId);
  }
  
  async createFile(file: InsertFile): Promise<FileItem> {
    const id = this.currentFileId++;
    const timestamp = new Date().toISOString();
    const newFile: FileItem = {
      ...file,
      id,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.files.set(id, newFile);
    return newFile;
  }
  
  async updateFileContent(id: number, content: string): Promise<FileItem> {
    const file = this.files.get(id);
    if (!file) {
      throw new Error(`File ${id} not found`);
    }
    
    const updatedFile = {
      ...file,
      content,
      updatedAt: new Date().toISOString()
    };
    
    this.files.set(id, updatedFile);
    return updatedFile;
  }
  
  async updateFileName(id: number, name: string, extension: string): Promise<FileItem> {
    const file = this.files.get(id);
    if (!file) {
      throw new Error(`File ${id} not found`);
    }
    
    const updatedFile = {
      ...file,
      name,
      extension,
      updatedAt: new Date().toISOString()
    };
    
    this.files.set(id, updatedFile);
    return updatedFile;
  }
  
  async deleteFile(id: number): Promise<void> {
    // Delete any child files (if the file is a directory)
    const childFiles = Array.from(this.files.values())
      .filter(file => file.parentId === id);
    
    for (const child of childFiles) {
      await this.deleteFile(child.id);
    }
    
    // Delete the file
    this.files.delete(id);
  }
  
  async createDefaultProjectFiles(projectId: number, projectType: string): Promise<void> {
    if (projectType === 'html') {
      // Create a basic HTML project structure
      await this.createFile({
        name: 'index.html',
        type: 'file',
        extension: 'html',
        content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>موقع جديد</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <h1>مرحباً بالعالم!</h1>
  </header>
  
  <main>
    <p>هذا هو موقع الويب الجديد الخاص بك.</p>
  </main>
  
  <footer>
    <p>جميع الحقوق محفوظة &copy; 2023</p>
  </footer>
  
  <script src="script.js"></script>
</body>
</html>`,
        projectId,
        parentId: null
      });
      
      await this.createFile({
        name: 'styles.css',
        type: 'file',
        extension: 'css',
        content: `body {
  font-family: 'Arial', sans-serif;
  line-height: 1.6;
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
  color: #333;
}

header, main, footer {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

header {
  background-color: #3b82f6;
  color: white;
  text-align: center;
}

footer {
  background-color: #ddd;
  text-align: center;
  font-size: 0.8rem;
}`,
        projectId,
        parentId: null
      });
      
      await this.createFile({
        name: 'script.js',
        type: 'file',
        extension: 'js',
        content: `// JavaScript Code
console.log('مرحباً بالعالم!');

document.addEventListener('DOMContentLoaded', function() {
  const header = document.querySelector('header h1');
  
  header.addEventListener('click', function() {
    alert('مرحباً بك في موقعك الجديد!');
  });
});`,
        projectId,
        parentId: null
      });
    } else if (projectType === 'react') {
      // Create a basic React project structure
      await this.createFile({
        name: 'index.html',
        type: 'file',
        extension: 'html',
        content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تطبيق React</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
        projectId,
        parentId: null
      });
      
      // Create src directory
      const srcDir = await this.createFile({
        name: 'src',
        type: 'directory',
        projectId,
        parentId: null
      });
      
      await this.createFile({
        name: 'App.js',
        type: 'file',
        extension: 'js',
        content: `import React, { useState } from 'react';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [taskText, setTaskText] = useState('');
  
  const addTask = () => {
    if (taskText.trim() === '') return;
    
    setTasks([...tasks, { 
      id: Date.now(), 
      text: taskText, 
      completed: false 
    }]);
    
    setTaskText('');
  };
  
  const toggleTask = (id) => {
    setTasks(tasks.map(task => 
      task.id === id 
        ? { ...task, completed: !task.completed } 
        : task
    ));
  };
  
  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };
  
  return (
    <div className="app">
      <h1>قائمة المهام</h1>
      
      <div className="task-form">
        <input
          type="text"
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          placeholder="أضف مهمة جديدة..."
        />
        <button onClick={addTask}>إضافة</button>
      </div>
      
      <ul className="task-list">
        {tasks.length === 0 ? (
          <p className="no-tasks">لا توجد مهام بعد. أضف بعض المهام!</p>
        ) : (
          tasks.map(task => (
            <li key={task.id} className={\`task \${task.completed ? 'completed' : ''}\`}>
              <span onClick={() => toggleTask(task.id)}>{task.text}</span>
              <button onClick={() => deleteTask(task.id)}>حذف</button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default App;`,
        projectId,
        parentId: srcDir.id
      });
      
      await this.createFile({
        name: 'App.css',
        type: 'file',
        extension: 'css',
        content: `.app {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Arial', sans-serif;
}

h1 {
  text-align: center;
  color: #3b82f6;
}

.task-form {
  display: flex;
  margin-bottom: 20px;
}

.task-form input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
  font-size: 16px;
}

.task-form button {
  padding: 10px 15px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  font-size: 16px;
}

.task-list {
  list-style: none;
  padding: 0;
}

.task {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  margin-bottom: 10px;
  background-color: #f9f9f9;
  border-radius: 4px;
  align-items: center;
}

.task.completed span {
  text-decoration: line-through;
  color: #888;
}

.task span {
  cursor: pointer;
}

.task button {
  background-color: #ff4d4d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
}

.no-tasks {
  text-align: center;
  color: #888;
}`,
        projectId,
        parentId: srcDir.id
      });
      
      await this.createFile({
        name: 'index.js',
        type: 'file',
        extension: 'js',
        content: `import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);`,
        projectId,
        parentId: srcDir.id
      });
      
      await this.createFile({
        name: 'index.css',
        type: 'file',
        extension: 'css',
        content: `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f5;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}`,
        projectId,
        parentId: srcDir.id
      });
    }
  }
  
  // Activity Operations
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.currentActivityId++;
    const timestamp = new Date().toISOString();
    
    const newActivity = {
      ...activity,
      id,
      timestamp
    };
    
    this.activities.set(id, newActivity);
    
    // Get user name for 'by' field
    const user = await this.getUser(activity.userId);
    return {
      ...newActivity,
      by: user ? user.username : 'Unknown User'
    };
  }
  
  async getUserActivities(userId: number): Promise<Activity[]> {
    // Get all projects where user is owner or collaborator
    const userProjects = await this.getProjectsByUser(userId);
    const projectIds = userProjects.map(project => project.id);
    
    // Get activities for these projects or activities by the user
    const userActivities = Array.from(this.activities.values())
      .filter(activity => 
        activity.userId === userId || 
        (activity.projectId && projectIds.includes(activity.projectId))
      );
    
    // Sort by timestamp (newest first)
    userActivities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Get 'by' field for each activity
    const activitiesWithBy = await Promise.all(
      userActivities.map(async (activity) => {
        const user = await this.getUser(activity.userId);
        return {
          ...activity,
          by: user ? user.username : 'Unknown User'
        };
      })
    );
    
    return activitiesWithBy.slice(0, 10); // Return last 10 activities
  }
  
  // Stats Operations
  async getUserStats(userId: number): Promise<UsageStats> {
    // Get projects for this user
    const projects = await this.getProjectsByUser(userId);
    
    // Get collaborators for this user
    const collaborators = await this.getCollaborators(userId);
    
    // Calculate storage used (based on file content length)
    let totalStorageBytes = 0;
    
    for (const project of projects) {
      const projectFiles = await this.getProjectFiles(project.id);
      
      for (const file of projectFiles) {
        totalStorageBytes += (file.content?.length || 0) * 2; // UTF-16 characters are 2 bytes
      }
    }
    
    // Convert bytes to human-readable format
    const storageUsedGB = (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(1);
    
    // Demo limits
    const storageLimit = "10 GB";
    const projectsLimit = 20;
    const collaboratorsLimit = 5;
    
    return {
      storage: {
        used: `${storageUsedGB} GB`,
        total: storageLimit,
        usedPercent: Math.min(100, (parseFloat(storageUsedGB) / 10) * 100)
      },
      projects: {
        count: projects.length,
        limit: projectsLimit,
        usedPercent: Math.min(100, (projects.length / projectsLimit) * 100)
      },
      collaborators: {
        count: collaborators.length,
        limit: collaboratorsLimit,
        usedPercent: Math.min(100, (collaborators.length / collaboratorsLimit) * 100)
      }
    };
  }
}

export const storage = new MemStorage();
