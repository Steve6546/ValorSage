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
import { db } from "./db";
import { eq, and, desc, sql, isNull, count } from "drizzle-orm";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

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

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;
  
  constructor() {
    // Set up PostgreSQL session store
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true
    });
  }
  
  // User Operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Project Operations
  async getProjectById(id: number): Promise<ProjectWithCollaborators | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) return undefined;
    
    // Get project collaborators
    const collabs = await db
      .select({
        userId: projectCollaborators.userId,
        role: projectCollaborators.role
      })
      .from(projectCollaborators)
      .where(eq(projectCollaborators.projectId, id));
    
    // Get collaborator information
    const collaborators: Collaborator[] = [];
    
    // Add all collaborators
    for (const collab of collabs) {
      const [user] = await db.select().from(users).where(eq(users.id, collab.userId));
      if (user) {
        // For demo purposes, generate random online status
        const isOnline = Math.random() > 0.5;
        const lastSeen = isOnline ? null : new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString();
        
        collaborators.push({
          id: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl || '',
          isOnline,
          lastSeen
        });
      }
    }
    
    // Add owner as a collaborator if not already included
    const ownerExists = collaborators.find(c => c.id === project.ownerId);
    if (!ownerExists) {
      const [owner] = await db.select().from(users).where(eq(users.id, project.ownerId));
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
    const ownedProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, userId));
    
    // Get projects where user is a collaborator
    const collaboratorProjects = await db
      .select({
        projectId: projectCollaborators.projectId
      })
      .from(projectCollaborators)
      .where(eq(projectCollaborators.userId, userId));
    
    const collaboratedProjectIds = collaboratorProjects.map(cp => cp.projectId);
    
    let collabProjects: typeof ownedProjects = [];
    if (collaboratedProjectIds.length > 0) {
      collabProjects = await db
        .select()
        .from(projects)
        .where(
          sql`${projects.id} IN (${collaboratedProjectIds.join(',')})`
        );
    }
    
    // Combine lists and remove duplicates
    const uniqueProjectsMap = new Map();
    
    // Add owned projects to map
    for (const project of ownedProjects) {
      uniqueProjectsMap.set(project.id, project);
    }
    
    // Add collaborated projects to map if they don't exist yet
    for (const project of collabProjects) {
      if (!uniqueProjectsMap.has(project.id)) {
        uniqueProjectsMap.set(project.id, project);
      }
    }
    
    // Convert to array and sort by updated date (most recent first)
    const uniqueProjects = Array.from(uniqueProjectsMap.values());
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
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();
    return newProject;
  }
  
  async updateProject(id: number, data: Partial<Project>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(projects.id, id))
      .returning();
    
    if (!updatedProject) {
      throw new Error(`Project ${id} not found`);
    }
    
    return updatedProject;
  }
  
  async deleteProject(id: number): Promise<void> {
    // Delete all files associated with this project
    await db.delete(files).where(eq(files.projectId, id));
    
    // Delete project collaborators
    await db.delete(projectCollaborators).where(eq(projectCollaborators.projectId, id));
    
    // Delete activities associated with this project
    await db.delete(activities).where(eq(activities.projectId, id));
    
    // Delete the project
    await db.delete(projects).where(eq(projects.id, id));
  }
  
  async updateProjectTimestamp(id: number): Promise<void> {
    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, id));
  }
  
  // Project Collaborator Operations
  async isProjectCollaborator(projectId: number, userId: number): Promise<boolean> {
    const [result] = await db
      .select({ count: count() })
      .from(projectCollaborators)
      .where(
        and(
          eq(projectCollaborators.projectId, projectId),
          eq(projectCollaborators.userId, userId)
        )
      );
    
    return result.count > 0;
  }
  
  async addCollaborator(projectId: number, userId: number, role: string): Promise<void> {
    // Check if collaborator already exists
    const isCollab = await this.isProjectCollaborator(projectId, userId);
    
    if (isCollab) {
      // Update role if user is already a collaborator
      await db
        .update(projectCollaborators)
        .set({ role })
        .where(
          and(
            eq(projectCollaborators.projectId, projectId),
            eq(projectCollaborators.userId, userId)
          )
        );
    } else {
      // Add new collaborator
      await db
        .insert(projectCollaborators)
        .values({
          projectId,
          userId,
          role
        });
    }
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
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }
  
  async getProjectFiles(projectId: number): Promise<FileItem[]> {
    return db.select().from(files).where(eq(files.projectId, projectId));
  }
  
  async createFile(file: InsertFile): Promise<FileItem> {
    const [newFile] = await db
      .insert(files)
      .values(file)
      .returning();
    return newFile;
  }
  
  async updateFileContent(id: number, content: string): Promise<FileItem> {
    const [updatedFile] = await db
      .update(files)
      .set({
        content,
        updatedAt: new Date()
      })
      .where(eq(files.id, id))
      .returning();
    
    if (!updatedFile) {
      throw new Error(`File ${id} not found`);
    }
    
    return updatedFile;
  }
  
  async updateFileName(id: number, name: string, extension: string): Promise<FileItem> {
    const [updatedFile] = await db
      .update(files)
      .set({
        name,
        extension,
        updatedAt: new Date()
      })
      .where(eq(files.id, id))
      .returning();
    
    if (!updatedFile) {
      throw new Error(`File ${id} not found`);
    }
    
    return updatedFile;
  }
  
  async deleteFile(id: number): Promise<void> {
    // Delete any child files first (if the file is a directory)
    await db.delete(files).where(eq(files.parentId, id));
    
    // Delete the file
    await db.delete(files).where(eq(files.id, id));
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
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
    const [newActivity] = await db
      .insert(activities)
      .values(activity)
      .returning();
    
    // Get the username of the user who performed the action
    const [user] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, newActivity.userId || 0));
    
    return {
      ...newActivity,
      by: user ? user.username : 'مستخدم مجهول'
    };
  }
  
  async getUserActivities(userId: number): Promise<Activity[]> {
    const activityResults = await db
      .select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.timestamp));
    
    // Create a map of user IDs to usernames
    const userIds = activityResults
      .map(a => a.userId)
      .filter(Boolean) as number[];
    
    const uniqueUserIds = [...new Set(userIds)];
    const userMap = new Map<number, string>();
    
    if (uniqueUserIds.length) {
      const userResults = await db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(sql`${users.id} IN (${uniqueUserIds.join(',')})`);
      
      for (const user of userResults) {
        userMap.set(user.id, user.username);
      }
    }
    
    // Add the username to each activity
    return activityResults.map(activity => ({
      ...activity,
      by: activity.userId ? userMap.get(activity.userId) || 'مستخدم مجهول' : 'مستخدم مجهول'
    }));
  }
  
  // Stats Operations
  async getUserStats(userId: number): Promise<UsageStats> {
    // Get count of user's projects
    const [projectCount] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.ownerId, userId));
    
    // Get count of user's collaborators
    const [collaboratorCount] = await db
      .select({ count: count() })
      .from(projectCollaborators)
      .innerJoin(
        projects,
        eq(projects.id, projectCollaborators.projectId)
      )
      .where(eq(projects.ownerId, userId));
    
    return {
      storage: {
        used: '1.2 GB',  // For demo purposes, hardcoded
        total: '5 GB',   // For demo purposes, hardcoded
        usedPercent: 24  // For demo purposes, hardcoded
      },
      projects: {
        count: projectCount.count,
        limit: 20,       // For demo purposes, hardcoded
        usedPercent: (projectCount.count / 20) * 100
      },
      collaborators: {
        count: collaboratorCount.count,
        limit: 10,       // For demo purposes, hardcoded
        usedPercent: (collaboratorCount.count / 10) * 100
      }
    };
  }
}

export const storage = new DatabaseStorage();