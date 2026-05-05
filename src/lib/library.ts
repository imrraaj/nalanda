export const libraryItemKinds = ["folder", "pdf", "jpeg", "png", "epub"] as const;
export const libraryFileKinds = ["pdf", "jpeg", "png", "epub"] as const;
export const libraryItemStatuses = ["pending", "approved", "rejected"] as const;

export type LibraryItemKind = (typeof libraryItemKinds)[number];
export type LibraryFileKind = (typeof libraryFileKinds)[number];
export type LibraryItemStatus = (typeof libraryItemStatuses)[number];

export type LibraryItemSummary = {
  contentType: string | null;
  createdAt: string;
  id: string;
  kind: LibraryItemKind;
  name: string;
  parentId: string | null;
  size: number | null;
  status: LibraryItemStatus;
  updatedAt: string;
};

const contentTypeKindMap: Record<string, LibraryFileKind> = {
  "application/epub+zip": "epub",
  "application/pdf": "pdf",
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
};

const extensionKindMap: Record<string, LibraryFileKind> = {
  epub: "epub",
  jpeg: "jpeg",
  jpg: "jpeg",
  pdf: "pdf",
  png: "png",
};

export function isFolderItem(item: Pick<LibraryItemSummary, "kind">) {
  return item.kind === "folder";
}

export function isFileItem(item: Pick<LibraryItemSummary, "kind">) {
  return item.kind !== "folder";
}

export function isPdfItem(item: Pick<LibraryItemSummary, "kind">) {
  return item.kind === "pdf";
}

export function getLibraryItemKindLabel(kind: LibraryItemKind) {
  switch (kind) {
    case "folder":
      return "Folder";
    case "pdf":
      return "PDF";
    case "jpeg":
      return "JPEG";
    case "png":
      return "PNG";
    case "epub":
      return "EPUB";
  }
}

export function getLibraryFileKind(input: {
  contentType?: string | null;
  name: string;
}): LibraryFileKind | null {
  const normalizedContentType = input.contentType?.toLowerCase().trim() ?? "";

  if (normalizedContentType && normalizedContentType in contentTypeKindMap) {
    return contentTypeKindMap[normalizedContentType] ?? null;
  }

  const extension = input.name.toLowerCase().split(".").pop()?.trim() ?? "";

  return extensionKindMap[extension] ?? null;
}

export function normalizeLibraryItemName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function sortLibraryItems<T extends Pick<LibraryItemSummary, "kind" | "name">>(
  items: readonly T[],
) {
  return [...items].sort((left, right) => {
    if (left.kind === "folder" && right.kind !== "folder") {
      return -1;
    }

    if (left.kind !== "folder" && right.kind === "folder") {
      return 1;
    }

    return left.name.localeCompare(right.name, undefined, {
      sensitivity: "base",
    });
  });
}

export function buildLibraryItemIndex(items: readonly LibraryItemSummary[]) {
  return new Map(items.map((item) => [item.id, item] as const));
}

export function getLibraryChildren(
  items: readonly LibraryItemSummary[],
  parentId: string | null,
) {
  return sortLibraryItems(items.filter((item) => item.parentId === parentId));
}

export function getLibraryBreadcrumbs(
  items: readonly LibraryItemSummary[],
  folderId: string | null,
) {
  if (!folderId) {
    return [];
  }

  const index = buildLibraryItemIndex(items);
  const breadcrumbs: LibraryItemSummary[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const current = index.get(currentId);

    if (!current || current.kind !== "folder") {
      break;
    }

    breadcrumbs.unshift(current);
    currentId = current.parentId;
  }

  return breadcrumbs;
}

export function getLibraryDescendantIds(
  items: readonly Pick<LibraryItemSummary, "id" | "parentId">[],
  rootId: string,
) {
  const descendantIds = new Set<string>();
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift();

    if (!currentId || descendantIds.has(currentId)) {
      continue;
    }

    descendantIds.add(currentId);

    for (const item of items) {
      if (item.parentId === currentId) {
        queue.push(item.id);
      }
    }
  }

  return descendantIds;
}

export function getLibraryFolderOptions(
  items: readonly LibraryItemSummary[],
  excludedFolderId?: string | null,
) {
  const blockedIds = excludedFolderId
    ? getLibraryDescendantIds(items, excludedFolderId)
    : new Set<string>();

  return sortLibraryItems(
    items.filter((item) => item.kind === "folder" && !blockedIds.has(item.id)),
  );
}
