import { and, eq, inArray, isNull } from "drizzle-orm";

import { documentStorage } from "@/bucket/s3-storage";
import { db } from "@/db/index";
import { libraryItem } from "@/db/schema";
import {
  getLibraryDescendantIds,
  getLibraryFileKind,
  normalizeLibraryItemName,
  type LibraryItemSummary,
} from "@/lib/library";

type SessionLike = {
  user: {
    id: string;
    role?: string | null;
  };
};

type LibraryItemRow = typeof libraryItem.$inferSelect;

function isAdminSession(session: SessionLike | null | undefined) {
  return (session?.user.role ?? "user") === "admin";
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return new Date(0).toISOString();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }

  return value.toISOString();
}

function serializeLibraryItem(row: LibraryItemRow): LibraryItemSummary {
  return {
    contentType: row.contentType ?? null,
    createdAt: toIsoString(row.createdAt),
    id: row.id,
    kind: row.kind,
    name: row.name,
    parentId: row.parentId ?? null,
    size: row.size ?? null,
    status: row.status,
    updatedAt: toIsoString(row.updatedAt),
  };
}

function ensureLibraryName(name: string) {
  const normalizedName = normalizeLibraryItemName(name);

  if (!normalizedName) {
    throw new Error("A name is required.");
  }

  return normalizedName;
}

async function findLibraryItemById(id: string) {
  const [item] = await db.select().from(libraryItem).where(eq(libraryItem.id, id));
  return item ?? null;
}

async function ensureParentFolder(parentId: string | null) {
  if (!parentId) {
    return null;
  }

  const parent = await findLibraryItemById(parentId);

  if (!parent) {
    throw new Error("The selected parent folder does not exist.");
  }

  if (parent.kind !== "folder") {
    throw new Error("Items can only be placed inside folders.");
  }

  return parent;
}

async function findSiblingFolderByName(input: {
  name: string;
  parentId: string | null;
}) {
  const conditions = [
    eq(libraryItem.kind, "folder"),
    eq(libraryItem.name, input.name),
  ];

  if (input.parentId) {
    conditions.push(eq(libraryItem.parentId, input.parentId));
  } else {
    conditions.push(isNull(libraryItem.parentId));
  }

  const [folder] = await db
    .select()
    .from(libraryItem)
    .where(and(...conditions));

  return folder ?? null;
}

async function ensureSiblingNameAvailable(options: {
  excludeId?: string;
  name: string;
  parentId: string | null;
}) {
  const conditions = [eq(libraryItem.name, options.name)];

  if (options.parentId) {
    conditions.push(eq(libraryItem.parentId, options.parentId));
  } else {
    conditions.push(isNull(libraryItem.parentId));
  }

  const siblings = await db
    .select({ id: libraryItem.id })
    .from(libraryItem)
    .where(and(...conditions));

  const duplicate = siblings.find((item) => item.id !== options.excludeId);

  if (duplicate) {
    throw new Error("An item with the same name already exists in this folder.");
  }
}

async function listAllLibraryItemRows() {
  return db.select().from(libraryItem);
}

export async function listLibraryItemsForSession(session: SessionLike) {
  const rows = await listAllLibraryItemRows();
  const visibleRows = isAdminSession(session)
    ? rows
    : rows.filter((item) => item.kind === "folder" || item.status === "approved");

  return visibleRows.map(serializeLibraryItem);
}

export async function createLibraryFolder(input: {
  createdBy: string;
  name: string;
  parentId: string | null;
}) {
  const name = ensureLibraryName(input.name);
  await ensureParentFolder(input.parentId);
  await ensureSiblingNameAvailable({ name, parentId: input.parentId });

  const [created] = await db
    .insert(libraryItem)
    .values({
      createdBy: input.createdBy,
      kind: "folder",
      name,
      parentId: input.parentId,
      status: "approved",
      updatedBy: input.createdBy,
    })
    .returning();

  if (!created) {
    throw new Error("Folder could not be created.");
  }

  return serializeLibraryItem(created);
}

export async function renameLibraryItem(input: {
  itemId: string;
  name: string;
  updatedBy: string;
}) {
  const item = await findLibraryItemById(input.itemId);

  if (!item) {
    throw new Error("Item not found.");
  }

  const name = ensureLibraryName(input.name);

  if (name === item.name) {
    return serializeLibraryItem(item);
  }

  await ensureSiblingNameAvailable({
    excludeId: item.id,
    name,
    parentId: item.parentId ?? null,
  });

  const [updated] = await db
    .update(libraryItem)
    .set({
      name,
      updatedAt: new Date(),
      updatedBy: input.updatedBy,
    })
    .where(eq(libraryItem.id, item.id))
    .returning();

  if (!updated) {
    throw new Error("Item could not be renamed.");
  }

  return serializeLibraryItem(updated);
}

export async function moveLibraryItem(input: {
  itemId: string;
  parentId: string | null;
  updatedBy: string;
}) {
  const item = await findLibraryItemById(input.itemId);

  if (!item) {
    throw new Error("Item not found.");
  }

  if (input.parentId === item.id) {
    throw new Error("An item cannot be moved into itself.");
  }

  await ensureParentFolder(input.parentId);

  if (item.kind === "folder" && input.parentId) {
    const items = await listAllLibraryItemRows();
    const blockedIds = getLibraryDescendantIds(
      items.map((current) => ({
        id: current.id,
        parentId: current.parentId,
      })),
      item.id,
    );

    if (blockedIds.has(input.parentId)) {
      throw new Error("A folder cannot be moved into one of its descendants.");
    }
  }

  await ensureSiblingNameAvailable({
    excludeId: item.id,
    name: item.name,
    parentId: input.parentId,
  });

  const [updated] = await db
    .update(libraryItem)
    .set({
      parentId: input.parentId,
      updatedAt: new Date(),
      updatedBy: input.updatedBy,
    })
    .where(eq(libraryItem.id, item.id))
    .returning();

  if (!updated) {
    throw new Error("Item could not be moved.");
  }

  return serializeLibraryItem(updated);
}

export async function deleteLibraryItemTree(input: { itemId: string }) {
  const item = await findLibraryItemById(input.itemId);

  if (!item) {
    return;
  }

  const items = await listAllLibraryItemRows();
  const descendantIds = getLibraryDescendantIds(
    items.map((current) => ({
      id: current.id,
      parentId: current.parentId,
    })),
    item.id,
  );

  const fileItems = items.filter(
    (current) =>
      descendantIds.has(current.id) &&
      current.kind !== "folder" &&
      typeof current.storageKey === "string" &&
      current.storageKey.length > 0,
  );

  await Promise.all(
    fileItems.map((current) => documentStorage.deleteDocument(current.storageKey as string)),
  );

  await db.delete(libraryItem).where(eq(libraryItem.id, item.id));
}

export async function uploadLibraryFile(input: {
  file: File;
  name?: string;
  parentId: string | null;
  uploadedBy: string;
}) {
  const name = ensureLibraryName(input.name ?? input.file.name);
  const kind = getLibraryFileKind({
    contentType: input.file.type,
    name,
  });

  if (!kind) {
    throw new Error("Only PDF, JPEG, PNG, and EPUB files are supported.");
  }

  await ensureParentFolder(input.parentId);
  await ensureSiblingNameAvailable({ name, parentId: input.parentId });

  const stored = await documentStorage.uploadDocument({
    file: input.file,
    nameOverride: name,
    uploadedBy: input.uploadedBy,
  });

  try {
    const [created] = await db
      .insert(libraryItem)
      .values({
        contentType: stored.contentType,
        createdBy: input.uploadedBy,
        kind,
        name,
        parentId: input.parentId,
        size: stored.size,
        status: "approved",
        storageKey: stored.key,
        updatedBy: input.uploadedBy,
      })
      .returning();

    if (!created) {
      throw new Error("File could not be saved.");
    }

    return serializeLibraryItem(created);
  } catch (error) {
    await documentStorage.deleteDocument(stored.key);
    throw error;
  }
}

async function ensureLibraryFolderPath(input: {
  createdBy: string;
  parentId: string | null;
  segments: string[];
}) {
  let currentParentId = input.parentId;
  const cache = new Map<string, string>();

  for (const rawSegment of input.segments) {
    const name = ensureLibraryName(rawSegment);
    const cacheKey = `${currentParentId ?? "__root__"}:${name}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      currentParentId = cached;
      continue;
    }

    const existing = await findSiblingFolderByName({
      name,
      parentId: currentParentId,
    });

    if (existing) {
      cache.set(cacheKey, existing.id);
      currentParentId = existing.id;
      continue;
    }

    const created = await createLibraryFolder({
      createdBy: input.createdBy,
      name,
      parentId: currentParentId,
    });

    cache.set(cacheKey, created.id);
    currentParentId = created.id;
  }

  return currentParentId;
}

export async function uploadLibraryEntries(input: {
  entries: Array<{
    file: File;
    relativePath?: string | null;
  }>;
  parentId: string | null;
  uploadedBy: string;
}) {
  const uploadedItems: LibraryItemSummary[] = [];

  for (const entry of input.entries) {
    const relativePath = entry.relativePath?.trim().replace(/\\/g, "/") ?? "";
    const pathParts = relativePath
      ? relativePath.split("/").filter(Boolean)
      : [entry.file.name];
    const fileName = pathParts.at(-1) ?? entry.file.name;
    const folderSegments = pathParts.slice(0, -1);
    const targetParentId = await ensureLibraryFolderPath({
      createdBy: input.uploadedBy,
      parentId: input.parentId,
      segments: folderSegments,
    });

    const item = await uploadLibraryFile({
      file: entry.file,
      name: fileName,
      parentId: targetParentId,
      uploadedBy: input.uploadedBy,
    });

    uploadedItems.push(item);
  }

  return uploadedItems;
}

export async function getReadableLibraryItemForSession(input: {
  itemId: string;
  session: SessionLike;
}) {
  const item = await findLibraryItemById(input.itemId);

  if (!item || item.kind === "folder" || !item.storageKey) {
    throw new Error("Document not found.");
  }

  if (!isAdminSession(input.session) && item.status !== "approved") {
    throw new Error("Document not found.");
  }

  return item;
}

export async function listAdminUsers() {
  const { user } = await import("@/db/schema");
  return db.select().from(user).orderBy(user.createdAt);
}

export async function loadAdminLibrarySnapshot() {
  const items = await listAllLibraryItemRows();
  return items.map(serializeLibraryItem);
}

export async function loadLibraryItemChildren(parentId: string | null) {
  const conditions = parentId
    ? eq(libraryItem.parentId, parentId)
    : isNull(libraryItem.parentId);

  const items = await db.select().from(libraryItem).where(conditions);
  return items.map(serializeLibraryItem);
}

export async function deleteLibraryItemsByIds(itemIds: string[]) {
  if (itemIds.length === 0) {
    return;
  }

  await db.delete(libraryItem).where(inArray(libraryItem.id, itemIds));
}
