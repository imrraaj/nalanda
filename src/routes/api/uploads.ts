import { createFileRoute } from "@tanstack/react-router";
import { desc, eq } from "drizzle-orm";

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected upload error.";
}

export const Route = createFileRoute("/api/uploads")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const { getSessionFromHeaders } = await import("@/lib/auth.server");
        const session = await getSessionFromHeaders(request.headers);

        if (!session) {
          return json({ error: "Unauthorized" }, 401);
        }

        const { db } = await import("@/db/index");
        const { document } = await import("@/db/schema");
        const isAdmin = (session.user as any).role === "admin";

        let docs;
        if (isAdmin) {
          docs = await db.select().from(document).orderBy(desc(document.createdAt));
        } else {
          docs = await db
            .select()
            .from(document)
            .where(eq(document.status, "approved"))
            .orderBy(desc(document.createdAt));
        }

        const documents = docs.map((d) => ({
          bucket: "",
          contentType: d.contentType,
          key: d.key,
          name: d.name,
          size: d.size,
          status: d.status,
          uploadedAt: d.createdAt.toISOString(),
          uploadedBy: d.uploadedBy,
        }));

        return json({ documents });
      },
      POST: async ({ request }: { request: Request }) => {
        const { getSessionFromHeaders } = await import("@/lib/auth.server");
        const session = await getSessionFromHeaders(request.headers);

        if (!session) {
          return json({ error: "Unauthorized" }, 401);
        }

        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
          return json({ error: "A document file is required." }, 400);
        }

        try {
          const { documentStorage } = await import("@/bucket/s3-storage");
          const stored = await documentStorage.uploadDocument({
            file,
            uploadedBy: session.user.id,
          });

          const isAdmin = (session.user as any).role === "admin";
          const status = isAdmin ? "approved" : "pending";

          const { db } = await import("@/db/index");
          const { document: documentTable } = await import("@/db/schema");

          const [doc] = await db
            .insert(documentTable)
            .values({
              key: stored.key,
              name: stored.name,
              contentType: stored.contentType,
              size: stored.size,
              status,
              uploadedBy: session.user.id,
            })
            .returning();

          if (!doc) {
            throw new Error("Document record was not created.");
          }

          return json({
            document: {
              ...stored,
              status: doc.status,
            },
          }, 201);
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 400);
        }
      },
    },
  },
});
