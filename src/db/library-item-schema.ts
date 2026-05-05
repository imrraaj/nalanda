import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  index,
  integer,
  pgTable,
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
      enum: ["folder", "pdf", "jpeg", "png", "epub"],
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
    contentType: text("content_type"),
    size: integer("size"),
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
