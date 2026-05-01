import { createServerFn } from "@tanstack/react-start";
import { user, document } from "@/db/schema";
import { db } from "@/db";


export const loadAdminDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  const [users, documents] = await Promise.all([
    db.select().from(user).orderBy(user.createdAt),
    db.select().from(document).orderBy(document.createdAt),
  ]);

  return {
    documents,
    users,
  };
});
