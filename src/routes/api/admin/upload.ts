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
        const files = formData.getAll("files").reduce<File[]>((accumulator, value) => {
          if (
            typeof value === "object" &&
            value !== null &&
            "name" in value &&
            typeof value.name === "string"
          ) {
            accumulator.push(value as unknown as File);
          }

          return accumulator;
        }, []);
        const pathValues = formData.getAll("paths");
        const thumbnailFiles = formData.getAll("thumbnailFiles").reduce<File[]>(
          (accumulator, value) => {
            if (
              typeof value === "object" &&
              value !== null &&
              "name" in value &&
              typeof value.name === "string"
            ) {
              accumulator.push(value as unknown as File);
            }

            return accumulator;
          },
          [],
        );
        const thumbnailIndexes = formData
          .getAll("thumbnailIndexes")
          .map((value) => (typeof value === "string" ? Number.parseInt(value, 10) : NaN));
        const thumbnailByFileIndex = new Map<number, File>();

        thumbnailFiles.forEach((thumbnailFile, index) => {
          const fileIndex = thumbnailIndexes[index];

          if (typeof fileIndex === "number" && Number.isInteger(fileIndex) && fileIndex >= 0) {
            thumbnailByFileIndex.set(fileIndex, thumbnailFile);
          }
        });
        const uploadFiles =
          files.length > 0
            ? files
            : file instanceof File
              ? [file]
              : [];

        if (uploadFiles.length === 0) {
          return json({ error: "A file is required." }, 400);
        }

        try {
          const { uploadLibraryEntries } = await import("@/lib/library.server");
          const items = await uploadLibraryEntries({
            entries: uploadFiles.map((entry, index) => ({
              file: entry,
              relativePath:
                typeof pathValues[index] === "string"
                  ? String(pathValues[index])
                  : entry.name,
              thumbnailFile: thumbnailByFileIndex.get(index) ?? null,
            })),
            parentId,
            uploadedBy: session.user.id,
          });

          return json({ item: items[0] ?? null, items }, 201);
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 400);
        }
      },
    },
  },
});
