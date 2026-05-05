import { createServerFn } from "@tanstack/react-start";

import { listAdminUsers, loadAdminLibrarySnapshot } from "@/lib/library.server";

export const loadAdminDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  const [users, items] = await Promise.all([
    listAdminUsers(),
    loadAdminLibrarySnapshot(),
  ]);

  return {
    items,
    users,
  };
});
