CREATE TABLE IF NOT EXISTS "library_folder_access" (
  "student_id" text NOT NULL,
  "folder_id" text NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "library_folder_access_pk" PRIMARY KEY ("student_id", "folder_id"),
  CONSTRAINT "library_folder_access_student_id_user_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "library_folder_access_folder_id_library_item_id_fk"
    FOREIGN KEY ("folder_id") REFERENCES "public"."library_item"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "library_folder_access_created_by_user_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "library_folder_access_student_idx"
  ON "library_folder_access" USING btree ("student_id");

CREATE INDEX IF NOT EXISTS "library_folder_access_folder_idx"
  ON "library_folder_access" USING btree ("folder_id");
