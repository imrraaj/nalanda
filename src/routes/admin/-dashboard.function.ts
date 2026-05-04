import { createServerFn } from "@tanstack/react-start";

import { db } from "@/db/index";
import { document, user } from "@/db/schema";

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
