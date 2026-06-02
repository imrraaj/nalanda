import { and, desc, eq, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";

import { documentStorage } from "@/bucket/s3-storage";
import { db } from "@/db/index";
import { libraryFolderAccess, libraryItem } from "@/db/schema";
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

type LibraryItemRow = Pick<
  typeof libraryItem.$inferSelect,
  "contentType" | "createdAt" | "id" | "kind" | "name" | "parentId" | "size" | "status" | "updatedAt"
  | "thumbnailContentType" | "thumbnailSize" | "thumbnailStorageKey"
>;

const libraryItemSummarySelection = {
  contentType: libraryItem.contentType,
  createdAt: libraryItem.createdAt,
  id: libraryItem.id,
  kind: libraryItem.kind,
  name: libraryItem.name,
  parentId: libraryItem.parentId,
  size: libraryItem.size,
  status: libraryItem.status,
  thumbnailContentType: libraryItem.thumbnailContentType,
  thumbnailSize: libraryItem.thumbnailSize,
  thumbnailStorageKey: libraryItem.thumbnailStorageKey,
  updatedAt: libraryItem.updatedAt,
} as const;

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
    thumbnailUrl:
      row.kind === "pdf" && row.thumbnailStorageKey
        ? documentStorage.getPublicReadUrl(row.thumbnailStorageKey) ??
          `/api/documents/thumbnail?itemId=${encodeURIComponent(row.id)}`
        : null,
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

async function listGrantedRootFolderIds(studentId: string) {
  const rows = await db
    .select({ folderId: libraryFolderAccess.folderId })
    .from(libraryFolderAccess)
    .where(eq(libraryFolderAccess.studentId, studentId));

  return rows.map((row) => row.folderId);
}

function findRootFolderIdForItem(
  items: readonly Pick<typeof libraryItem.$inferSelect, "id" | "kind" | "parentId">[],
  itemId: string,
) {
  const index = new Map(items.map((item) => [item.id, item]));
  let current = index.get(itemId) ?? null;
  let rootFolderId: string | null = null;

  while (current) {
    if (current.kind === "folder") {
      rootFolderId = current.id;
    }

    if (!current.parentId) {
      return rootFolderId;
    }

    current = index.get(current.parentId) ?? null;
  }

  return rootFolderId;
}

async function userCanAccessLibraryItem(input: {
  itemId: string;
  session: SessionLike;
}) {
  if (isAdminSession(input.session)) {
    return true;
  }

  const [items, grantedFolderIds] = await Promise.all([
    listAllLibraryItemRows(),
    listGrantedRootFolderIds(input.session.user.id),
  ]);

  if (grantedFolderIds.length === 0) {
    return false;
  }

  const rootFolderId = findRootFolderIdForItem(items, input.itemId);
  return !!rootFolderId && grantedFolderIds.includes(rootFolderId);
}

export async function listLibraryItemsForSession(session?: SessionLike | null) {
  if (isAdminSession(session)) {
    const rows = await db.select(libraryItemSummarySelection).from(libraryItem);
    return rows.map(serializeLibraryItem);
  }

  if (!session) {
    return [];
  }

  const [rows, grantedFolderIds] = await Promise.all([
    db.select(libraryItemSummarySelection).from(libraryItem),
    listGrantedRootFolderIds(session.user.id),
  ]);

  if (grantedFolderIds.length === 0) {
    return [];
  }

  const descendantIds = new Set<string>();

  for (const folderId of grantedFolderIds) {
    const root = rows.find(
      (item) =>
        item.id === folderId &&
        item.kind === "folder" &&
        item.parentId === null &&
        item.status === "approved",
    );

    if (!root) {
      continue;
    }

    for (const itemId of getLibraryDescendantIds(rows, folderId)) {
      descendantIds.add(itemId);
    }
  }

  return rows
    .filter((row) => descendantIds.has(row.id) && row.status === "approved")
    .map(serializeLibraryItem);
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
    fileItems.flatMap((current) => [
      documentStorage.deleteDocument(current.storageKey as string),
      ...(current.thumbnailStorageKey
        ? [documentStorage.deleteDocument(current.thumbnailStorageKey)]
        : []),
    ]),
  );

  await db.delete(libraryItem).where(eq(libraryItem.id, item.id));
}

export async function uploadLibraryFile(input: {
  file: File;
  name?: string;
  parentId: string | null;
  thumbnailFile?: File | null;
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
  const thumbnailStored =
    kind === "pdf" && input.thumbnailFile
      ? await documentStorage.uploadDocument({
          file: input.thumbnailFile,
          nameOverride: `${name}.thumbnail.png`,
          uploadedBy: input.uploadedBy,
        })
      : null;

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
        thumbnailContentType: thumbnailStored?.contentType ?? null,
        thumbnailSize: thumbnailStored?.size ?? null,
        thumbnailStorageKey: thumbnailStored?.key ?? null,
        updatedBy: input.uploadedBy,
      })
      .returning();

    if (!created) {
      throw new Error("File could not be saved.");
    }

    return serializeLibraryItem(created);
  } catch (error) {
    await documentStorage.deleteDocument(stored.key);
    if (thumbnailStored) {
      await documentStorage.deleteDocument(thumbnailStored.key);
    }
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
    thumbnailFile?: File | null;
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
      thumbnailFile: entry.thumbnailFile ?? null,
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

  if (!(await userCanAccessLibraryItem({ itemId: item.id, session: input.session }))) {
    throw new Error("Document not found.");
  }

  return item;
}

export async function getReadableLibraryThumbnailForSession(input: {
  itemId: string;
  session: SessionLike;
}) {
  const item = await findLibraryItemById(input.itemId);

  if (!item || item.kind !== "pdf" || !item.thumbnailStorageKey) {
    throw new Error("Thumbnail not found.");
  }

  if (!isAdminSession(input.session) && item.status !== "approved") {
    throw new Error("Thumbnail not found.");
  }

  return {
    contentType: item.thumbnailContentType ?? "image/png",
    key: item.thumbnailStorageKey,
    name: `${item.name}.thumbnail.png`,
  };
}

export async function getPublicLibraryThumbnail(input: { itemId: string }) {
  const item = await findLibraryItemById(input.itemId);

  if (!item || item.kind !== "pdf" || !item.thumbnailStorageKey) {
    throw new Error("Thumbnail not found.");
  }

  return {
    contentType: item.thumbnailContentType ?? "image/png",
    key: item.thumbnailStorageKey,
    name: `${item.name}.thumbnail.png`,
  };
}

export async function listAdminUsers() {
  const { user } = await import("@/db/schema");
  return db.select().from(user).orderBy(user.createdAt);
}

export async function loadAdminLibrarySnapshot() {
  const items = await db.select(libraryItemSummarySelection).from(libraryItem);
  return items.map(serializeLibraryItem);
}

export async function listAssignableRootFolders() {
  const folders = await db
    .select(libraryItemSummarySelection)
    .from(libraryItem)
    .where(and(
      eq(libraryItem.kind, "folder"),
      isNull(libraryItem.parentId),
      eq(libraryItem.status, "approved"),
    ))
    .orderBy(libraryItem.name);

  return folders.map(serializeLibraryItem);
}

export async function listStudentFolderAccess(input: { studentId: string }) {
  const rows = await db
    .select({
      contentType: libraryItem.contentType,
      createdAt: libraryItem.createdAt,
      folderId: libraryFolderAccess.folderId,
      id: libraryItem.id,
      kind: libraryItem.kind,
      name: libraryItem.name,
      parentId: libraryItem.parentId,
      size: libraryItem.size,
      status: libraryItem.status,
      thumbnailContentType: libraryItem.thumbnailContentType,
      thumbnailSize: libraryItem.thumbnailSize,
      thumbnailStorageKey: libraryItem.thumbnailStorageKey,
      updatedAt: libraryItem.updatedAt,
    })
    .from(libraryFolderAccess)
    .innerJoin(libraryItem, eq(libraryFolderAccess.folderId, libraryItem.id))
    .where(eq(libraryFolderAccess.studentId, input.studentId));

  return rows.map((row) => serializeLibraryItem(row));
}

export async function replaceStudentFolderAccess(input: {
  createdBy: string;
  folderIds: string[];
  studentId: string;
}) {
  const { user } = await import("@/db/schema");
  const uniqueFolderIds = [...new Set(input.folderIds.map((id) => id.trim()).filter(Boolean))];
  const [student] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, input.studentId));

  if (!student) {
    throw new Error("Student not found.");
  }

  if (student.role === "admin") {
    throw new Error("Folder access can only be assigned to students.");
  }

  if (uniqueFolderIds.length > 0) {
    const folders = await db
      .select({
        id: libraryItem.id,
        kind: libraryItem.kind,
        parentId: libraryItem.parentId,
      })
      .from(libraryItem)
      .where(inArray(libraryItem.id, uniqueFolderIds));
    const folderById = new Map(folders.map((folder) => [folder.id, folder]));

    for (const folderId of uniqueFolderIds) {
      const folder = folderById.get(folderId);

      if (!folder || folder.kind !== "folder" || folder.parentId !== null) {
        throw new Error("Only root folders can be assigned to students.");
      }
    }
  }

  await db
    .delete(libraryFolderAccess)
    .where(eq(libraryFolderAccess.studentId, input.studentId));

  if (uniqueFolderIds.length === 0) {
    return [];
  }

  await db.insert(libraryFolderAccess).values(
    uniqueFolderIds.map((folderId) => ({
      createdBy: input.createdBy,
      folderId,
      studentId: input.studentId,
    })),
  );

  return listStudentFolderAccess({ studentId: input.studentId });
}

export async function listAdminUsersPage(input: {
  page: number;
  pageSize: number;
  query?: string | null;
}) {
  const { user } = await import("@/db/schema");

  const normalizedQuery = input.query?.trim() ?? "";
  const pageSize = Math.max(1, input.pageSize);
  const conditions = [ne(user.role, "admin")];

  if (normalizedQuery) {
    const pattern = `%${normalizedQuery}%`;
    conditions.push(or(ilike(user.name, pattern), ilike(user.email, pattern))!);
  }

  const whereClause = and(...conditions);
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(whereClause);
  const count = countRow?.count ?? 0;
  const totalUsers = Number(count) || 0;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const page = Math.min(Math.max(1, input.page), totalPages);

  const users = await db
    .select({
      banReason: user.banReason,
      banned: user.banned,
      createdAt: user.createdAt,
      email: user.email,
      id: user.id,
      name: user.name,
      role: user.role,
    })
    .from(user)
    .where(whereClause)
    .orderBy(desc(user.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    page,
    pageSize,
    query: normalizedQuery,
    totalPages,
    totalUsers,
    users: users.map((current) => ({
      ...current,
      createdAt: toIsoString(current.createdAt),
    })),
  };
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
