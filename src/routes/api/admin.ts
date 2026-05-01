import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

async function requireAdmin(request: Request) {
  const { getSessionFromHeaders } = await import("@/lib/auth.server");
  const session = await getSessionFromHeaders(request.headers);
  if (!session || (session.user as any).role !== "admin") return null;
  return session;
}

export const Route = createFileRoute("/api/admin")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await requireAdmin(request);
        if (!session) return json({ error: "Forbidden" }, 403);

        const url = new URL(request.url);
        const resource = url.searchParams.get("resource");
        const { db } = await import("@/db/index");

        if (resource === "users") {
          const { user } = await import("@/db/schema");
          const users = await db.select().from(user).orderBy(user.createdAt);
          return json({
            users: users.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              banned: u.banned ?? false,
              banReason: u.banReason,
              createdAt: u.createdAt.toISOString(),
            })),
          });
        }

        if (resource === "documents") {
          const { document } = await import("@/db/schema");
          const docs = await db
            .select()
            .from(document)
            .orderBy(document.createdAt);
          return json({
            documents: docs.map((d) => ({
              id: d.id,
              key: d.key,
              name: d.name,
              contentType: d.contentType,
              size: d.size,
              status: d.status,
              uploadedBy: d.uploadedBy,
              reviewedBy: d.reviewedBy,
              createdAt: d.createdAt.toISOString(),
            })),
          });
        }

        return json({ error: "Invalid resource" }, 400);
      },
      POST: async ({ request }: { request: Request }) => {
        const session = await requireAdmin(request);
        if (!session) return json({ error: "Forbidden" }, 403);

        const body = await request.json();
        const { action, id } = body as { action: string; id: string };
        if (!action || !id)
          return json({ error: "action and id required" }, 400);

        const { db } = await import("@/db/index");
        const { auth } = await import("@/lib/auth");

        if (action === "approve-user") {
          await auth.api.unbanUser({ body: { userId: id } });
          return json({ ok: true });
        }

        if (action === "ban-user") {
          await auth.api.banUser({
            body: { userId: id, banReason: "Awaiting approval" },
          });
          return json({ ok: true });
        }

        if (action === "approve-document" || action === "reject-document") {
          const { document } = await import("@/db/schema");
          const status =
            action === "approve-document" ? "approved" : "rejected";
          await db
            .update(document)
            .set({
              status,
              reviewedBy: session.user.id,
              reviewedAt: new Date(),
            })
            .where(eq(document.id, id));
          return json({ ok: true });
        }

        if (action === "delete-document") {
          const { document } = await import("@/db/schema");
          const [doc] = await db
            .select()
            .from(document)
            .where(eq(document.id, id));
          if (doc) {
            const { documentStorage } = await import("@/bucket/s3-storage");
            await documentStorage.deleteDocument(doc.key);
            await db.delete(document).where(eq(document.id, id));
          }
          return json({ ok: true });
        }

        return json({ error: "Unknown action" }, 400);
      },
    },
  },
});
