import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

const studentTemporaryPassword = "Student@123";

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

        if (resource === "library") {
          const { loadAdminLibrarySnapshot } = await import("@/lib/library.server");
          const items = await loadAdminLibrarySnapshot();
          return json({ items });
        }

        if (resource === "student-folder-access") {
          const studentId = url.searchParams.get("studentId")?.trim();

          if (!studentId) {
            return json({ error: "studentId is required" }, 400);
          }

          const {
            listAssignableRootFolders,
            listStudentFolderAccess,
          } = await import("@/lib/library.server");
          const [folders, assignedFolders] = await Promise.all([
            listAssignableRootFolders(),
            listStudentFolderAccess({ studentId }),
          ]);

          return json({ assignedFolderIds: assignedFolders.map((folder) => folder.id), folders });
        }

        return json({ error: "Invalid resource" }, 400);
      },
      POST: async ({ request }: { request: Request }) => {
        const session = await requireAdmin(request);
        if (!session) return json({ error: "Forbidden" }, 403);

        const body = await request.json();
        const { action } = body as { action?: string };
        if (!action) {
          return json({ error: "action is required" }, 400);
        }

        const { db } = await import("@/db/index");
        const { auth } = await import("@/lib/auth");

        if (action === "approve-user") {
          const { id } = body as { id?: string };
          if (!id) return json({ error: "id is required" }, 400);
          await auth.api.unbanUser({
            body: { userId: id },
            headers: request.headers,
          });
          return json({ ok: true });
        }

        if (action === "ban-user") {
          const { id } = body as { id?: string };
          if (!id) return json({ error: "id is required" }, 400);
          await auth.api.banUser({
            body: { userId: id, banReason: "Access disabled by admin" },
            headers: request.headers,
          });
          return json({ ok: true });
        }

        if (action === "reject-user" || action === "delete-user") {
          const { id } = body as { id?: string };
          if (!id) return json({ error: "id is required" }, 400);
          const { user } = await import("@/db/schema");
          const [student] = await db.select().from(user).where(eq(user.id, id));

          if (!student) {
            return json({ ok: true });
          }

          if (student.role === "admin") {
            return json({ error: "Admin users cannot be deleted." }, 400);
          }

          await db.delete(user).where(eq(user.id, id));
          return json({ ok: true });
        }

        if (action === "reset-user-password") {
          const { id } = body as { id?: string };
          if (!id) return json({ error: "id is required" }, 400);
          await auth.api.setUserPassword({
            body: {
              newPassword: studentTemporaryPassword,
              userId: id,
            },
            headers: request.headers,
          });
          return json({ ok: true, temporaryPassword: studentTemporaryPassword });
        }

        if (action === "set-student-folder-access") {
          const { folderIds, id } = body as { folderIds?: unknown; id?: string };

          if (!id) {
            return json({ error: "id is required" }, 400);
          }

          if (!Array.isArray(folderIds) || !folderIds.every((value) => typeof value === "string")) {
            return json({ error: "folderIds must be an array of ids" }, 400);
          }

          const { replaceStudentFolderAccess } = await import("@/lib/library.server");
          const assignedFolders = await replaceStudentFolderAccess({
            createdBy: session.user.id,
            folderIds,
            studentId: id,
          });

          return json({
            assignedFolderIds: assignedFolders.map((folder) => folder.id),
            ok: true,
          });
        }

        if (action === "approve-document" || action === "reject-document") {
          const { id } = body as { id?: string };
          if (!id) return json({ error: "id is required" }, 400);
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
          const { id } = body as { id?: string };
          if (!id) return json({ error: "id is required" }, 400);
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

        if (action === "create-folder") {
          const { createLibraryFolder } = await import("@/lib/library.server");
          const { name, parentId } = body as { name?: string; parentId?: string | null };

          const item = await createLibraryFolder({
            createdBy: session.user.id,
            name: name ?? "",
            parentId: typeof parentId === "string" && parentId.trim() ? parentId : null,
          });

          return json({ item }, 201);
        }

        if (action === "rename-item") {
          const { renameLibraryItem } = await import("@/lib/library.server");
          const { id, name } = body as { id?: string; name?: string };

          if (!id || !name) {
            return json({ error: "id and name are required" }, 400);
          }

          const item = await renameLibraryItem({
            itemId: id,
            name,
            updatedBy: session.user.id,
          });

          return json({ item });
        }

        if (action === "move-item") {
          const { moveLibraryItem } = await import("@/lib/library.server");
          const { id, parentId } = body as { id?: string; parentId?: string | null };

          if (!id) {
            return json({ error: "id is required" }, 400);
          }

          const item = await moveLibraryItem({
            itemId: id,
            parentId: typeof parentId === "string" && parentId.trim() ? parentId : null,
            updatedBy: session.user.id,
          });

          return json({ item });
        }

        if (action === "delete-item") {
          const { deleteLibraryItemTree } = await import("@/lib/library.server");
          const { id } = body as { id?: string };

          if (!id) {
            return json({ error: "id is required" }, 400);
          }

          await deleteLibraryItemTree({ itemId: id });
          return json({ ok: true });
        }

        if (action === "remove-folder-thumbnail") {
          const { id } = body as { id?: string };

          if (!id) {
            return json({ error: "id is required" }, 400);
          }

          const { removeLibraryFolderThumbnail } = await import("@/lib/library.server");
          const item = await removeLibraryFolderThumbnail({
            itemId: id,
            updatedBy: session.user.id,
          });

          return json({ item, ok: true });
        }

        return json({ error: "Unknown action" }, 400);
      },
    },
  },
});
