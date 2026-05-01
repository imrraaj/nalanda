import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export const document = pgTable(
  "document",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    contentType: text("content_type").notNull().default("application/octet-stream"),
    size: integer("size").notNull().default(0),
    status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
    uploadedBy: text("uploaded_by").notNull().references(() => user.id, { onDelete: "cascade" }),
    reviewedBy: text("reviewed_by").references(() => user.id),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("document_status_idx").on(table.status),
    index("document_uploadedBy_idx").on(table.uploadedBy),
  ],
);

export const documentRelations = relations(document, ({ one }) => ({
  uploader: one(user, { fields: [document.uploadedBy], references: [user.id] }),
  reviewer: one(user, { fields: [document.reviewedBy], references: [user.id] }),
}));
