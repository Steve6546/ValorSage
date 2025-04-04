import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// تعريف مخطط الإدخال لجدول المستخدمين
export const insertUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  avatarUrl: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Projects
// تعريف أنواع المشاريع (لغات البرمجة المدعومة)
export const ProjectType = {
  HTML: "html",
  REACT: "react",
  VUE: "vue",
  ANGULAR: "angular",
  NODEJS: "nodejs",
  PYTHON: "python", // إضافة دعم بايثون
  PHP: "php",       // إضافة دعم PHP
  JAVA: "java",     // إضافة دعم جافا
  GO: "go",         // إضافة دعم Go
  TYPESCRIPT: "typescript", // إضافة دعم TypeScript
} as const;

export type ProjectType = typeof ProjectType[keyof typeof ProjectType];

// تعريف حالات المشروع
export const ProjectStatus = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export type ProjectStatus = typeof ProjectStatus[keyof typeof ProjectStatus];

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  type: text("type").default(ProjectType.HTML).notNull(),
  status: text("status").default(ProjectStatus.DRAFT).notNull(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// تعريف مخطط الإدخال لجدول المشاريع
export const insertProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().default(""),
  type: z.union([
    z.literal(ProjectType.HTML),
    z.literal(ProjectType.REACT),
    z.literal(ProjectType.VUE),
    z.literal(ProjectType.ANGULAR),
    z.literal(ProjectType.NODEJS),
    z.literal(ProjectType.PYTHON),
    z.literal(ProjectType.PHP),
    z.literal(ProjectType.JAVA),
    z.literal(ProjectType.GO),
    z.literal(ProjectType.TYPESCRIPT)
  ]).default(ProjectType.HTML),
  status: z.union([
    z.literal(ProjectStatus.DRAFT),
    z.literal(ProjectStatus.PUBLISHED),
    z.literal(ProjectStatus.ARCHIVED)
  ]).default(ProjectStatus.DRAFT),
  ownerId: z.number().int().positive(),
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Project collaborators junction table
export const projectCollaborators = pgTable("project_collaborators", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").default("editor").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// تعريف مخطط الإدخال لجدول المتعاونين على المشاريع
export const insertProjectCollaboratorSchema = z.object({
  projectId: z.number().int().positive(),
  userId: z.number().int().positive(),
  role: z.string().default("editor"),
});

export type InsertProjectCollaborator = z.infer<typeof insertProjectCollaboratorSchema>;
export type ProjectCollaborator = typeof projectCollaborators.$inferSelect;

// Files
export const FileType = {
  FILE: "file",
  DIRECTORY: "directory",
} as const;

export type FileType = typeof FileType[keyof typeof FileType];

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  extension: text("extension"),
  content: text("content"),
  projectId: integer("project_id").notNull().references(() => projects.id),
  parentId: integer("parent_id").references(() => files.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// تعريف مخطط الإدخال لجدول الملفات
export const insertFileSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.union([z.literal(FileType.FILE), z.literal(FileType.DIRECTORY)]),
  extension: z.string().optional(),
  content: z.string().optional(),
  projectId: z.number().int().positive(),
  parentId: z.number().int().positive().optional().nullable(),
});

export type InsertFile = z.infer<typeof insertFileSchema>;
export type FileItem = typeof files.$inferSelect;

// Activities
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  details: text("details"),
  projectId: integer("project_id").references(() => projects.id),
  userId: integer("user_id").references(() => users.id),
  projectUrl: text("project_url"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// تعريف مخطط الإدخال لجدول الأنشطة
export const insertActivitySchema = z.object({
  title: z.string(),
  type: z.string(),
  details: z.string().optional(),
  projectId: z.number().int().positive().optional(),
  userId: z.number().int().positive().optional(),
  projectUrl: z.string().optional(),
});

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect & {
  by: string;  // Username of the user who performed the activity
};

// Additional Types (not directly mapped to tables)
export interface Collaborator {
  id: number;
  username: string;
  avatarUrl: string;
  isOnline: boolean;
  lastSeen: string | null;
}

export interface UsageStats {
  storage: {
    used: string;
    total: string;
    usedPercent: number;
  };
  projects: {
    count: number;
    limit: number;
    usedPercent: number;
  };
  collaborators: {
    count: number;
    limit: number;
    usedPercent: number;
  };
}

export interface ProjectWithCollaborators extends Project {
  collaborators: Collaborator[];
}

export type RecentProject = ProjectWithCollaborators;
