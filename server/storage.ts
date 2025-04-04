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
      .values({
        username: insertUser.username,
        password: insertUser.password,
        avatarUrl: insertUser.avatarUrl
      })
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
      .values({
        name: project.name,
        description: project.description || "",
        type: project.type,
        status: project.status,
        ownerId: project.ownerId
      })
      .returning();
    return newProject;
  }
  
  async updateProject(id: number, data: Partial<Project>): Promise<Project> {
    // استخراج البيانات القابلة للتحديث
    const { name, description, type, status, ownerId } = data;
    const updateData: Record<string, any> = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (ownerId !== undefined) updateData.ownerId = ownerId;
    
    const [updatedProject] = await db
      .update(projects)
      .set(updateData)
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
      .set({ 
        updatedAt: sql`NOW()` 
      })
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
      .values({
        name: file.name,
        type: file.type, 
        extension: file.extension,
        content: file.content,
        projectId: file.projectId,
        parentId: file.parentId
      })
      .returning();
    return newFile;
  }
  
  async updateFileContent(id: number, content: string): Promise<FileItem> {
    const [updatedFile] = await db
      .update(files)
      .set({
        content,
        updatedAt: sql`NOW()`
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
        updatedAt: sql`NOW()`
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
    // استخدام الـ enum من schema لضمان الاتساق
    switch(projectType) {
      case 'html':
        await this.createHtmlProjectFiles(projectId);
        break;
      case 'react':
        await this.createReactProjectFiles(projectId);
        break;
      case 'python':
        await this.createPythonProjectFiles(projectId);
        break;
      case 'nodejs':
        await this.createNodejsProjectFiles(projectId);
        break;
      case 'typescript':
        await this.createTypescriptProjectFiles(projectId);
        break;
      case 'vue':
        await this.createVueProjectFiles(projectId);
        break;
      default:
        // إذا لم يكن النوع معروفاً، استخدم HTML كنوع افتراضي
        await this.createHtmlProjectFiles(projectId);
    }
  }
  
  // دالة مساعدة لإنشاء ملفات مشروع HTML
  private async createHtmlProjectFiles(projectId: number): Promise<void> {
    // Create a basic HTML project structure
    await this.createFile({
      name: 'index',
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
      name: 'styles',
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
      name: 'script',
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
  }
  
  // دالة مساعدة لإنشاء ملفات مشروع React
  private async createReactProjectFiles(projectId: number): Promise<void> {
    // Create a basic React project structure
    await this.createFile({
      name: 'index',
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
      name: 'App',
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
      name: 'App',
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
      name: 'index',
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
      name: 'index',
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
  
  // دالة مساعدة لإنشاء ملفات مشروع Python
  private async createPythonProjectFiles(projectId: number): Promise<void> {
    // إنشاء الملف الرئيسي
    await this.createFile({
      name: 'main',
      type: 'file',
      extension: 'py',
      content: `# مرحباً بك في مشروع Python الجديد

def main():
    print("مرحباً بالعالم من Python!")
    name = input("ما هو اسمك؟ ")
    print(f"مرحباً بك {name}!")
    
    # مثال على استخدام الشروط
    age = input("كم عمرك؟ ")
    try:
        age = int(age)
        if age < 18:
            print("أنت لازلت صغيراً!")
        else:
            print("أنت بالغ!")
    except ValueError:
        print("الرجاء إدخال رقم صحيح للعمر")

if __name__ == "__main__":
    main()
`,
      projectId,
      parentId: null,
    });

    // إنشاء ملف للدوال المساعدة
    await this.createFile({
      name: 'utils',
      type: 'file',
      extension: 'py',
      content: `# ملف للدوال المساعدة

def calculate_sum(numbers):
    """
    حساب مجموع قائمة من الأرقام
    """
    return sum(numbers)

def calculate_average(numbers):
    """
    حساب متوسط قائمة من الأرقام
    """
    if not numbers:
        return 0
    return sum(numbers) / len(numbers)

def is_prime(n):
    """
    التحقق ما إذا كان الرقم أولياً
    """
    if n <= 1:
        return False
    if n <= 3:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True
`,
      projectId,
      parentId: null,
    });

    // إنشاء ملف للتجارب وللاختبارات
    await this.createFile({
      name: 'test',
      type: 'file',
      extension: 'py',
      content: `# ملف للاختبارات

import utils

def test_calculate_sum():
    assert utils.calculate_sum([1, 2, 3, 4, 5]) == 15
    print("اختبار calculate_sum نجح!")

def test_calculate_average():
    assert utils.calculate_average([1, 2, 3, 4, 5]) == 3
    print("اختبار calculate_average نجح!")

def test_is_prime():
    assert utils.is_prime(7) == True
    assert utils.is_prime(10) == False
    print("اختبار is_prime نجح!")

if __name__ == "__main__":
    print("بدء تشغيل الاختبارات...")
    test_calculate_sum()
    test_calculate_average()
    test_is_prime()
    print("جميع الاختبارات نجحت!")
`,
      projectId,
      parentId: null,
    });
  }
  
  // دالة مساعدة لإنشاء ملفات مشروع Node.js
  private async createNodejsProjectFiles(projectId: number): Promise<void> {
    // إنشاء ملف package.json
    await this.createFile({
      name: 'package',
      type: 'file',
      extension: 'json',
      content: `{
  "name": "nodejs-project",
  "version": "1.0.0",
  "description": "مشروع Node.js بسيط",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}`,
      projectId,
      parentId: null,
    });

    // إنشاء الملف الرئيسي
    await this.createFile({
      name: 'index',
      type: 'file',
      extension: 'js',
      content: `// مشروع Node.js بسيط
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// ضبط الخادم لاستقبال البيانات بتنسيق JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// توجيه بسيط
app.get('/', (req, res) => {
  res.json({ message: 'مرحباً بك في خادم Node.js الخاص بك!' });
});

// مسار API بسيط
app.get('/api/users', (req, res) => {
  const users = [
    { id: 1, name: 'أحمد' },
    { id: 2, name: 'محمد' },
    { id: 3, name: 'سارة' }
  ];
  res.json(users);
});

// استقبال بيانات من المستخدم
app.post('/api/users', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'الرجاء إدخال اسم المستخدم' });
  }
  
  // في تطبيق حقيقي، سيتم إضافة المستخدم إلى قاعدة البيانات
  res.status(201).json({ id: Date.now(), name });
});

// تشغيل الخادم
app.listen(port, () => {
  console.log(\`الخادم يعمل على المنفذ \${port}\`);
});`,
      projectId,
      parentId: null,
    });
  }
  
  // دالة مساعدة لإنشاء ملفات مشروع TypeScript
  private async createTypescriptProjectFiles(projectId: number): Promise<void> {
    // إنشاء ملف tsconfig.json
    await this.createFile({
      name: 'tsconfig',
      type: 'file',
      extension: 'json',
      content: `{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}`,
      projectId,
      parentId: null,
    });

    // إنشاء ملف package.json
    await this.createFile({
      name: 'package',
      type: 'file',
      extension: 'json',
      content: `{
  "name": "typescript-project",
  "version": "1.0.0",
  "description": "مشروع TypeScript بسيط",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "watch": "tsc -w"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/node": "^18.15.11",
    "ts-node": "^10.9.1",
    "typescript": "^5.0.4"
  }
}`,
      projectId,
      parentId: null,
    });

    // إنشاء مجلد المصدر
    const srcDir = await this.createFile({
      name: 'src',
      type: 'directory',
      projectId,
      parentId: null,
    });

    // إنشاء الملف الرئيسي
    await this.createFile({
      name: 'index',
      type: 'file',
      extension: 'ts',
      content: `// مشروع TypeScript بسيط
import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 3000;

// ضبط الخادم لاستقبال البيانات بتنسيق JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تعريف الأنواع
interface User {
  id: number;
  name: string;
  email?: string;
}

// توجيه بسيط
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'مرحباً بك في خادم TypeScript الخاص بك!' });
});

// مسار API بسيط
app.get('/api/users', (req: Request, res: Response) => {
  const users: User[] = [
    { id: 1, name: 'أحمد' },
    { id: 2, name: 'محمد' },
    { id: 3, name: 'سارة' }
  ];
  res.json(users);
});

// استقبال بيانات من المستخدم
app.post('/api/users', (req: Request, res: Response) => {
  const { name, email } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'الرجاء إدخال اسم المستخدم' });
  }
  
  // في تطبيق حقيقي، سيتم إضافة المستخدم إلى قاعدة البيانات
  const newUser: User = { id: Date.now(), name, email };
  res.status(201).json(newUser);
});

// تشغيل الخادم
app.listen(port, () => {
  console.log(\`الخادم يعمل على المنفذ \${port}\`);
});`,
      projectId,
      parentId: srcDir.id,
    });
  }
  
  // دالة مساعدة لإنشاء ملفات مشروع Vue.js
  private async createVueProjectFiles(projectId: number): Promise<void> {
    // إنشاء ملف index.html
    await this.createFile({
      name: 'index',
      type: 'file',
      extension: 'html',
      content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>مشروع Vue.js</title>
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app">
    <!-- سيتم استبدال هذا بتطبيق Vue -->
  </div>
  
  <script src="main.js"></script>
</body>
</html>`,
      projectId,
      parentId: null,
    });

    // إنشاء ملف JavaScript الرئيسي
    await this.createFile({
      name: 'main',
      type: 'file',
      extension: 'js',
      content: `// التطبيق الرئيسي Vue

const { createApp, ref, computed } = Vue;

const app = createApp({
  setup() {
    const newTask = ref('');
    const tasks = ref([
      { id: 1, text: 'تعلم Vue.js', completed: false },
      { id: 2, text: 'إنشاء مشروع', completed: false },
      { id: 3, text: 'نشر المشروع', completed: false }
    ]);
    
    const remainingTasks = computed(() => {
      return tasks.value.filter(task => !task.completed).length;
    });
    
    function addTask() {
      if (newTask.value.trim()) {
        const newId = tasks.value.length ? Math.max(...tasks.value.map(t => t.id)) + 1 : 1;
        tasks.value.push({
          id: newId,
          text: newTask.value,
          completed: false
        });
        newTask.value = '';
      }
    }
    
    function removeTask(id) {
      tasks.value = tasks.value.filter(task => task.id !== id);
    }
    
    function toggleComplete(id) {
      const task = tasks.value.find(task => task.id === id);
      if (task) {
        task.completed = !task.completed;
      }
    }
    
    return {
      newTask,
      tasks,
      remainingTasks,
      addTask,
      removeTask,
      toggleComplete
    };
  },
  template: \`
    <div class="todo-app">
      <h1>قائمة المهام</h1>
      
      <div class="add-task">
        <input 
          v-model="newTask" 
          @keyup.enter="addTask"
          placeholder="أضف مهمة جديدة..."
        />
        <button @click="addTask">إضافة</button>
      </div>
      
      <ul class="task-list">
        <li v-for="task in tasks" :key="task.id" :class="{ completed: task.completed }">
          <span class="task-text" @click="toggleComplete(task.id)">{{ task.text }}</span>
          <button class="delete-btn" @click="removeTask(task.id)">×</button>
        </li>
      </ul>
      
      <div class="task-counter">
        المهام المتبقية: {{ remainingTasks }}
      </div>
    </div>
  \`
});

app.mount('#app');`,
      projectId,
      parentId: null,
    });

    // إنشاء ملف CSS
    await this.createFile({
      name: 'styles',
      type: 'file',
      extension: 'css',
      content: `body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f9f9f9;
  margin: 0;
  padding: 0;
  display: flex;
  justify-content: center;
  min-height: 100vh;
}

.todo-app {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 500px;
  margin: 20px;
  padding: 20px;
}

h1 {
  color: #42b983;
  text-align: center;
  margin-top: 0;
  margin-bottom: 20px;
}

.add-task {
  display: flex;
  margin-bottom: 20px;
}

input {
  flex-grow: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

button {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  margin-right: 8px;
  cursor: pointer;
  font-size: 16px;
}

.task-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.task-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #f5f5f5;
  margin-bottom: 8px;
  border-radius: 4px;
  transition: all 0.3s;
}

.task-list li:hover {
  background-color: #eee;
}

.task-text {
  cursor: pointer;
  flex-grow: 1;
}

.completed .task-text {
  text-decoration: line-through;
  color: #999;
}

.delete-btn {
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  margin: 0;
}

.task-counter {
  margin-top: 20px;
  color: #666;
  font-size: 14px;
  text-align: center;
}`,
      projectId,
      parentId: null,
    });
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
    
    // Convert array to Set and back to array to get unique values
    const uniqueUserIds: number[] = [];
    const uniqueSet = new Set<number>();
    for (const id of userIds) {
      if (!uniqueSet.has(id)) {
        uniqueSet.add(id);
        uniqueUserIds.push(id);
      }
    }
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