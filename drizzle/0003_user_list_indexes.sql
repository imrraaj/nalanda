CREATE INDEX "user_created_at_idx" ON "user" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");
--> statement-breakpoint
CREATE INDEX "user_banned_idx" ON "user" USING btree ("banned");
--> statement-breakpoint
CREATE INDEX "user_name_idx" ON "user" USING btree ("name");
