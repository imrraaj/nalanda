import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected document error.";
}

function toInlineDisposition(name: string) {
  const safeName = name.replace(/["\r\n]/g, "");

  return `inline; filename="${safeName}"`;
}

function toAttachmentDisposition(name: string) {
  const safeName = name.replace(/["\r\n]/g, "");

  return `attachment; filename="${safeName}"`;
}

export const Route = createFileRoute("/api/documents/content")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const itemId = url.searchParams.get("itemId")?.trim();
        const key = url.searchParams.get("key")?.trim();
        const forceDownload = url.searchParams.get("download") === "1";
        const thumbnail = url.searchParams.get("thumbnail") === "1";

        if (thumbnail) {
          if (!itemId) {
            return json({ error: "A document id is required." }, 400);
          }

          try {
            const { getPublicLibraryThumbnail } = await import("@/lib/library.server");
            const thumbnailItem = await getPublicLibraryThumbnail({ itemId });
            const { documentStorage } = await import("@/bucket/s3-storage");
            const thumbnailDocument = await documentStorage.getDocumentContent(thumbnailItem.key);
            const headers = new Headers({
              "Cache-Control": "public, max-age=86400",
              "Content-Type": thumbnailDocument.contentType || thumbnailItem.contentType,
              "Cross-Origin-Resource-Policy": "same-origin",
              "X-Content-Type-Options": "nosniff",
            });

            if (thumbnailDocument.contentLength) {
              headers.set("Content-Length", String(thumbnailDocument.contentLength));
            }

            return new Response(thumbnailDocument.body, {
              headers,
              status: 200,
            });
          } catch (error) {
            return json({ error: getErrorMessage(error) }, 404);
          }
        }

        const { getSessionFromHeaders } = await import("@/lib/auth.server");
        const session = await getSessionFromHeaders(request.headers);

        if (!session) {
          return json({ error: "Unauthorized" }, 401);
        }

        if (!itemId && !key) {
          return json({ error: "A document id is required." }, 400);
        }

        try {
          let objectKey = key ?? "";
          let displayName = "Document";
          let contentType = "application/octet-stream";

          if (itemId) {
            const { getReadableLibraryItemForSession } = await import("@/lib/library.server");
            const item = await getReadableLibraryItemForSession({
              itemId,
              session: {
                user: {
                  id: session.user.id,
                  role: (session.user as { role?: string | null }).role ?? "user",
                },
              },
            });

            objectKey = item.storageKey ?? "";
            displayName = item.name;
            contentType = item.contentType ?? contentType;
          }

          const { documentStorage } = await import("@/bucket/s3-storage");
          const document = await documentStorage.getDocumentContent(objectKey);
          const resolvedType = document.contentType || contentType;
          const headers = new Headers({
            "Cache-Control": "private, no-store, max-age=0",
            "Content-Disposition": forceDownload || resolvedType !== "application/pdf"
              ? toAttachmentDisposition(displayName || document.name)
              : toInlineDisposition(displayName || document.name),
            "Content-Type": resolvedType,
            "Cross-Origin-Resource-Policy": "same-origin",
            Pragma: "no-cache",
            "X-Content-Type-Options": "nosniff",
          });

          if (document.contentLength) {
            headers.set("Content-Length", String(document.contentLength));
          }

          return new Response(document.body, {
            headers,
            status: 200,
          });
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 400);
        }
      },
    },
  },
});
