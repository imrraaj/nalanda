import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected library error.";
}

export const Route = createFileRoute("/api/library")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const { getSessionFromHeaders } = await import("@/lib/auth.server");
        const session = await getSessionFromHeaders(request.headers);

        if (!session) {
          return json({ error: "Unauthorized" }, 401);
        }

        try {
          const { listLibraryItemsForSession } = await import("@/lib/library.server");
          const items = await listLibraryItemsForSession({
            user: {
              id: session.user.id,
              role: (session.user as { role?: string | null }).role ?? "user",
            },
          });

          return json({ items });
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 500);
        }
      },
    },
  },
});
