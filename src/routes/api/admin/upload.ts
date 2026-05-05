import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected upload error.";
}

export const Route = createFileRoute("/api/admin/upload")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { getSessionFromHeaders } = await import("@/lib/auth.server");
        const session = await getSessionFromHeaders(request.headers);

        if (!session || (session.user as { role?: string }).role !== "admin") {
          return json({ error: "Forbidden" }, 403);
        }

        const formData = await request.formData();
        const file = formData.get("file");
        const parentIdValue = formData.get("parentId");
        const parentId =
          typeof parentIdValue === "string" && parentIdValue.trim().length > 0
            ? parentIdValue.trim()
            : null;

        if (!(file instanceof File)) {
          return json({ error: "A file is required." }, 400);
        }

        try {
          const { uploadLibraryFile } = await import("@/lib/library.server");
          const item = await uploadLibraryFile({
            file,
            parentId,
            uploadedBy: session.user.id,
          });

          return json({ item }, 201);
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 400);
        }
      },
    },
  },
});
