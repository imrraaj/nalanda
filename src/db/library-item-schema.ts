import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export const libraryItem = pgTable(
  "library_item",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    kind: text("kind", {
      enum: ["folder", "pdf", "jpeg", "png", "epub", "link"],
    }).notNull(),
    parentId: text("parent_id").references((): AnyPgColumn => libraryItem.id, {
      onDelete: "cascade",
    }),
    status: text("status", {
      enum: ["pending", "approved", "rejected"],
    })
      .default("approved")
      .notNull(),
    storageKey: text("storage_key"),
    linkUrl: text("link_url"),
    contentType: text("content_type"),
    size: integer("size"),
    thumbnailStorageKey: text("thumbnail_storage_key"),
    thumbnailContentType: text("thumbnail_content_type"),
    thumbnailSize: integer("thumbnail_size"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("library_item_parent_idx").on(table.parentId),
    index("library_item_kind_idx").on(table.kind),
    index("library_item_status_idx").on(table.status),
    index("library_item_created_by_idx").on(table.createdBy),
  ],
);

export const libraryItemRelations = relations(libraryItem, ({ many, one }) => ({
  parent: one(libraryItem, {
    fields: [libraryItem.parentId],
    references: [libraryItem.id],
    relationName: "library_item_children",
  }),
  children: many(libraryItem, {
    relationName: "library_item_children",
  }),
  creator: one(user, {
    fields: [libraryItem.createdBy],
    references: [user.id],
    relationName: "library_item_creator",
  }),
  updater: one(user, {
    fields: [libraryItem.updatedBy],
    references: [user.id],
    relationName: "library_item_updater",
  }),
}));

export const libraryFolderAccess = pgTable(
  "library_folder_access",
  {
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    folderId: text("folder_id")
      .notNull()
      .references(() => libraryItem.id, { onDelete: "cascade" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.studentId, table.folderId],
      name: "library_folder_access_pk",
    }),
    index("library_folder_access_student_idx").on(table.studentId),
    index("library_folder_access_folder_idx").on(table.folderId),
  ],
);

export const libraryFolderAccessRelations = relations(libraryFolderAccess, ({ one }) => ({
  creator: one(user, {
    fields: [libraryFolderAccess.createdBy],
    references: [user.id],
    relationName: "library_folder_access_creator",
  }),
  folder: one(libraryItem, {
    fields: [libraryFolderAccess.folderId],
    references: [libraryItem.id],
    relationName: "library_folder_access_folder",
  }),
  student: one(user, {
    fields: [libraryFolderAccess.studentId],
    references: [user.id],
    relationName: "library_folder_access_student",
  }),
}));
