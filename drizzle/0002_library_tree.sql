CREATE TABLE "library_item" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "kind" text NOT NULL,
  "parent_id" text,
  "status" text DEFAULT 'approved' NOT NULL,
  "storage_key" text,
  "content_type" text,
  "size" integer,
  "created_by" text NOT NULL,
  "updated_by" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "library_item_parent_id_library_item_id_fk"
    FOREIGN KEY ("parent_id") REFERENCES "public"."library_item"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "library_item_created_by_user_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "library_item_updated_by_user_id_fk"
    FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "library_item_parent_idx" ON "library_item" USING btree ("parent_id");
--> statement-breakpoint
CREATE INDEX "library_item_kind_idx" ON "library_item" USING btree ("kind");
--> statement-breakpoint
CREATE INDEX "library_item_status_idx" ON "library_item" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "library_item_created_by_idx" ON "library_item" USING btree ("created_by");
--> statement-breakpoint
CREATE UNIQUE INDEX "library_item_root_name_idx"
  ON "library_item" USING btree ("name")
  WHERE "parent_id" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "library_item_parent_name_idx"
  ON "library_item" USING btree ("parent_id", "name")
  WHERE "parent_id" IS NOT NULL;
