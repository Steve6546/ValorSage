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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  avatarUrl: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  type: text("type").default("html").notNull(),
  status: text("status").default("draft").notNull(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  type: true,
  status: true,
  ownerId: true,
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

export const insertProjectCollaboratorSchema = createInsertSchema(projectCollaborators).pick({
  projectId: true,
  userId: true,
  role: true,
});

export type InsertProjectCollaborator = z.infer<typeof insertProjectCollaboratorSchema>;
export type ProjectCollaborator = typeof projectCollaborators.$inferSelect;

// Files
export enum FileType {
  FILE = "file",
  DIRECTORY = "directory",
}

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

export const insertFileSchema = createInsertSchema(files).pick({
  name: true,
  type: true,
  extension: true,
  content: true,
  projectId: true,
  parentId: true,
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

export const insertActivitySchema = createInsertSchema(activities).pick({
  title: true,
  type: true,
  details: true,
  projectId: true,
  userId: true,
  projectUrl: true,
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
