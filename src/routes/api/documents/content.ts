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

export const Route = createFileRoute("/api/documents/content")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const { getSessionFromHeaders } = await import("@/lib/auth.server");
        const session = await getSessionFromHeaders(request.headers);

        if (!session) {
          return json({ error: "Unauthorized" }, 401);
        }

        const url = new URL(request.url);
        const key = url.searchParams.get("key")?.trim();

        if (!key) {
          return json({ error: "A document key is required." }, 400);
        }

        try {
          const { documentStorage } = await import("@/bucket/s3-storage");
          const document = await documentStorage.getDocumentContent(key);
          const headers = new Headers({
            "Cache-Control": "private, no-store, max-age=0",
            "Content-Disposition": toInlineDisposition(document.name),
            "Content-Type": document.contentType,
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
