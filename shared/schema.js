import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    name: text("name"),
    createdAt: timestamp("created_at").defaultNow()
});
export const mowers = pgTable("mowers", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    name: text("name").notNull(),
    model: text("model").notNull(),
    serialNumber: text("serial_number").notNull(),
    coverageArea: integer("coverage_area"),
    installationDate: text("installation_date"),
    status: text("status").default("inactive"),
    batteryLevel: integer("battery_level").default(100),
    lastActivity: text("last_activity"),
    createdAt: timestamp("created_at").defaultNow()
});
export const notes = pgTable("notes", {
    id: serial("id").primaryKey(),
    mowerId: integer("mower_id").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    imageCaption: text("image_caption"),
    createdAt: timestamp("created_at").defaultNow()
});
export const documents = pgTable("documents", {
    id: serial("id").primaryKey(),
    mowerId: integer("mower_id").notNull(),
    filename: text("filename").notNull(),
    filesize: integer("filesize").notNull(),
    fileType: text("file_type").notNull(),
    fileUrl: text("file_url").notNull(),
    uploadDate: timestamp("upload_date").defaultNow()
});
export const photos = pgTable("photos", {
    id: serial("id").primaryKey(),
    mowerId: integer("mower_id").notNull(),
    caption: text("caption"),
    fileUrl: text("file_url").notNull(),
    uploadDate: timestamp("upload_date").defaultNow()
});
export const insertUserSchema = createInsertSchema(users).pick({
    username: true,
    email: true,
    password: true,
    name: true
});
export const insertMowerSchema = createInsertSchema(mowers).pick({
    name: true,
    model: true,
    serialNumber: true,
    coverageArea: true,
    installationDate: true,
    status: true,
    batteryLevel: true,
    lastActivity: true
});
export const insertNoteSchema = createInsertSchema(notes).pick({
    mowerId: true,
    title: true,
    content: true,
    imageUrl: true,
    imageCaption: true
});
export const insertDocumentSchema = createInsertSchema(documents).pick({
    mowerId: true,
    filename: true,
    filesize: true,
    fileType: true,
    fileUrl: true
});
export const insertPhotoSchema = createInsertSchema(photos).pick({
    mowerId: true,
    caption: true,
    fileUrl: true
});
//# sourceMappingURL=schema.js.map