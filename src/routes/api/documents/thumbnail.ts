import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected thumbnail error.";
}

export const Route = createFileRoute("/api/documents/thumbnail")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const itemId = url.searchParams.get("itemId")?.trim();

        if (!itemId) {
          return json({ error: "A document id is required." }, 400);
        }

        try {
          const { getPublicLibraryThumbnail } = await import("@/lib/library.server");
          const item = await getPublicLibraryThumbnail({ itemId });
          const { documentStorage } = await import("@/bucket/s3-storage");
          const thumbnail = await documentStorage.getDocumentContent(item.key);

          const headers = new Headers({
            "Cache-Control": "public, max-age=86400",
            "Content-Type": thumbnail.contentType || item.contentType,
            "Cross-Origin-Resource-Policy": "same-origin",
            "X-Content-Type-Options": "nosniff",
          });

          if (thumbnail.contentLength) {
            headers.set("Content-Length", String(thumbnail.contentLength));
          }

          return new Response(thumbnail.body, {
            headers,
            status: 200,
          });
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 404);
        }
      },
    },
  },
});
