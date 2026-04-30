import { createFileRoute } from "@tanstack/react-router";

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
        const { getSessionFromHeaders } = await import("@/lib/auth-server");
        const session = await getSessionFromHeaders(request.headers);

        if (!session) {
          return json({ error: "Unauthorized" }, 401);
        }

        const url = new URL(request.url);
        const key = url.searchParams.get("key");

        if (key) {
          return json(
            { error: "Direct document URLs are disabled. Open documents through the reader page." },
            400,
          );
        }

        const mineOnly = url.searchParams.get("mine") === "true";
        const { documentStorage } = await import("@/bucket");
        const documents = await documentStorage.listDocuments({
          uploadedBy: mineOnly ? session.user.id : undefined,
        });

        return json({ documents });
      },
      POST: async ({ request }: { request: Request }) => {
        const { getSessionFromHeaders } = await import("@/lib/auth-server");
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
          const { documentStorage } = await import("@/bucket");
          const document = await documentStorage.uploadDocument({
            file,
            uploadedBy: session.user.id,
          });

          return json({ document }, 201);
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 400);
        }
      },
    },
  },
});
