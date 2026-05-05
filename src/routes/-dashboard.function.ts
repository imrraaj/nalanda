import { createServerFn } from "@tanstack/react-start";

import { getCurrentSession } from "@/lib/auth.server";
import { listLibraryItemsForSession } from "@/lib/library.server";

export const loadDashboardLibraryData = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getCurrentSession();

  if (!session) {
    return {
      items: [],
    };
  }

  const items = await listLibraryItemsForSession({
    user: {
      id: session.user.id,
      role: (session.user as { role?: string | null }).role ?? "user",
    },
  });

  return { items };
});
