import { createServerFn } from "@tanstack/react-start";

import { listAdminUsersPage, loadAdminLibrarySnapshot } from "@/lib/library.server";

export const loadAdminDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  const items = await loadAdminLibrarySnapshot();

  return { items };
});

export const loadAdminUsersPage = createServerFn({ method: "GET" })
  .inputValidator((data: { page?: number; q?: string }) => ({
    page: typeof data.page === "number" && Number.isFinite(data.page) ? data.page : 1,
    q: typeof data.q === "string" ? data.q : "",
  }))
  .handler(async ({ data }) => {
    return listAdminUsersPage({
      page: data.page,
      pageSize: 25,
      query: data.q,
    });
  });
