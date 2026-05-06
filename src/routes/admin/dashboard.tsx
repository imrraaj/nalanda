import {
  IconArrowsMove,
  IconDotsVertical,
  IconEdit,
  IconEye,
  IconFolderOpen,
  IconFolderPlus,
  IconInfoCircle,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { LibraryInfoPanel } from "@/components/library/library-info-panel";
import { LibraryItemTile } from "@/components/library/library-item-tile";
import { LibraryTree } from "@/components/library/library-tree";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogDismiss,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/lib/auth.actions";
import {
  getLibraryBreadcrumbs,
  getLibraryChildren,
  getLibraryFolderOptions,
  isPdfItem,
  searchLibraryItems,
  type LibraryItemSummary,
} from "@/lib/library";
import { formatDateTime, getInitials } from "@/lib/utils";

type AdminUser = {
  banReason?: string | null;
  banned: boolean | null;
  createdAt?: string | Date | null;
  email: string;
  id: string;
  name: string;
  role: string;
};

type AdminTab = "library" | "users";

type AdminDialogState =
  | { mode: "create-folder" }
  | { itemId: string; mode: "delete" | "info" | "move" | "rename" }
  | null;

type FileInputWithRelativePath = File & {
  webkitRelativePath?: string;
};

function isPendingApprovalUser(user: AdminUser) {
  if (!user.banned) {
    return false;
  }

  const reason = user.banReason?.toLowerCase().trim() ?? "";
  return reason === "pending admin approval" || reason === "awaiting approval";
}

export const Route = createFileRoute("/admin/dashboard")({
  validateSearch: (search: Record<string, unknown>) => ({
    folderId: typeof search.folderId === "string" ? search.folderId : "",
    openId: typeof search.openId === "string" ? search.openId : "",
    q: typeof search.q === "string" ? search.q : "",
  }),
  beforeLoad: async () => {
    const { getSession } = await import("@/lib/auth.function");
    const session = await getSession();
    if (!session) throw redirect({ search: { redirectTo: "" }, to: "/login" });
    if ((session.user as { role?: string }).role !== "admin") {
      throw redirect({ search: { folderId: "", openId: "", q: "" }, to: "/dashboard" });
    }
  },
  loader: async () => {
    const [{ getSession }, { loadAdminDashboardData }] = await Promise.all([
      import("@/lib/auth.function"),
      import("@/routes/admin/-dashboard.function"),
    ]);
    const [session, data] = await Promise.all([getSession(), loadAdminDashboardData()]);

    if (!session) {
      throw redirect({ search: { redirectTo: "" }, to: "/login" });
    }

    if ((session.user as { role?: string }).role !== "admin") {
      throw redirect({ search: { folderId: "", openId: "", q: "" }, to: "/dashboard" });
    }

    return {
      items: data.items as LibraryItemSummary[],
      users: data.users as AdminUser[],
      viewer: {
        name: session.user.name,
      },
    };
  },
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { folderId, openId, q } = Route.useSearch();
  const { items, users, viewer } = Route.useLoaderData();
  const [tab, setTab] = useState<AdminTab>("library");
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set());
  const [dialog, setDialog] = useState<AdminDialogState>(null);
  const [draftName, setDraftName] = useState("");
  const [moveParentId, setMoveParentId] = useState("__root__");
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [searchInput, setSearchInput] = useState(q);
  const searchQuery = searchInput.trim();
  const deferredQuery = useDeferredValue(searchQuery);
  const selectedFolderId = folderId || null;
  const dialogItem = useMemo(
    () => (dialog && "itemId" in dialog ? items.find((item) => item.id === dialog.itemId) ?? null : null),
    [dialog, items],
  );
  const downloadItem = useMemo(() => {
    if (!openId) {
      return null;
    }

    return items.find((item) => item.id === openId) ?? null;
  }, [items, openId]);

  useEffect(() => {
    if (folderInputRef.current) {
      (folderInputRef.current as unknown as {
        setAttribute: (name: string, value: string) => void;
      }).setAttribute("webkitdirectory", "");
      (folderInputRef.current as unknown as {
        setAttribute: (name: string, value: string) => void;
      }).setAttribute("directory", "");
    }
  }, []);

  useEffect(() => {
    if (selectedFolderId && !items.some((item) => item.id === selectedFolderId && item.kind === "folder")) {
      void navigate({
        replace: true,
        search: {
          folderId: "",
          openId: openId || "",
          q: q || "",
        },
        to: "/admin/dashboard",
      });
      return;
    }

    if (dialog && "itemId" in dialog && !items.some((item) => item.id === dialog.itemId)) {
      setDialog(null);
    }

    if (downloadItem?.kind === "folder") {
      void navigate({
        replace: true,
        search: {
          folderId: downloadItem.id,
          openId: "",
          q: "",
        },
        to: "/admin/dashboard",
      });
      return;
    }

    if (openId && !downloadItem) {
      void navigate({
        replace: true,
        search: {
          folderId: selectedFolderId || "",
          openId: "",
          q: q || "",
        },
        to: "/admin/dashboard",
      });
      return;
    }

    const breadcrumbIds = getLibraryBreadcrumbs(items, selectedFolderId).map((item) => item.id);

    if (breadcrumbIds.length === 0) {
      return;
    }

    setExpandedFolderIds((current) => {
      const next = new Set(current);

      for (const id of breadcrumbIds) {
        next.add(id);
      }

      return next;
    });
  }, [dialog, downloadItem, items, navigate, openId, q, selectedFolderId]);

  useEffect(() => {
    if (downloadItem && isPdfItem(downloadItem)) {
      void navigate({
        search: { itemId: downloadItem.id, name: downloadItem.name },
        to: "/reader",
      });
    }
  }, [downloadItem, navigate]);

  const breadcrumbs = useMemo(
    () => getLibraryBreadcrumbs(items, selectedFolderId),
    [items, selectedFolderId],
  );
  const currentItems = useMemo(
    () => getLibraryChildren(items, selectedFolderId),
    [items, selectedFolderId],
  );
  const searchResults = useMemo(
    () => searchLibraryItems(items, deferredQuery),
    [deferredQuery, items],
  );
  const searchResultById = useMemo(
    () => new Map(searchResults.map((result) => [result.item.id, result] as const)),
    [searchResults],
  );
  const currentFolderName = breadcrumbs.at(-1)?.name ?? "Library";
  const visibleItems = deferredQuery ? searchResults.map((result) => result.item) : currentItems;
  const moveOptions = useMemo(
    () => getLibraryFolderOptions(items, dialogItem?.kind === "folder" ? dialogItem.id : null),
    [dialogItem, items],
  );
  const studentUsers = useMemo(
    () =>
      users
        .filter((user) => user.role !== "admin")
        .sort((left, right) => {
          const leftPending = isPendingApprovalUser(left) ? 0 : 1;
          const rightPending = isPendingApprovalUser(right) ? 0 : 1;

          if (leftPending !== rightPending) {
            return leftPending - rightPending;
          }

          const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
          const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;

          return rightTime - leftTime;
        }),
    [users],
  );
  const downloadHref = downloadItem
    ? `/api/documents/content?itemId=${encodeURIComponent(downloadItem.id)}&download=1`
    : "#";

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    if (searchInput === q) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void navigate({
        replace: true,
        search: {
          folderId: selectedFolderId || "",
          openId: "",
          q: searchInput,
        },
        to: "/admin/dashboard",
      });
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [navigate, q, searchInput, selectedFolderId]);

  function updateRouteState(next: {
    folderId?: string | null;
    openId?: string | null;
    q?: string;
    replace?: boolean;
  }) {
    void navigate({
      replace: next.replace ?? false,
      search: {
        folderId: next.folderId || "",
        openId: next.openId || "",
        q: next.q || "",
      },
      to: "/admin/dashboard",
    });
  }

  function toggleFolder(folderId: string) {
    setExpandedFolderIds((current) => {
      const next = new Set(current);

      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }

      return next;
    });
  }

  function openFolder(folderIdToOpen: string | null, options?: { clearQuery?: boolean }) {
    updateRouteState({
      folderId: folderIdToOpen,
      openId: null,
      q: options?.clearQuery === false ? q : "",
    });

    if (folderIdToOpen) {
      setExpandedFolderIds((current) => new Set(current).add(folderIdToOpen));
    }

    setDialog(null);
  }

  async function invalidateData() {
    await router.invalidate({ sync: true });
  }

  async function parseError(response: Response) {
    try {
      const payload = (await response.json()) as { error?: string };
      return payload.error ?? "Request failed.";
    } catch {
      return "Request failed.";
    }
  }

  async function postAdmin(body: Record<string, unknown>) {
    setIsBusy(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin", {
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      await invalidateData();
    } finally {
      setIsBusy(false);
    }
  }

  async function uploadFiles(files: File[], includeRelativePaths: boolean) {
    if (files.length === 0) {
      return;
    }

    setIsBusy(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();

      for (const file of files) {
        formData.append("files", file);
        formData.append(
          "paths",
          includeRelativePaths
            ? (file as FileInputWithRelativePath).webkitRelativePath || file.name
            : file.name,
        );
      }

      if (selectedFolderId) {
        formData.append("parentId", selectedFolderId);
      }

      const response = await fetch("/api/admin/upload", {
        body: formData,
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      if (fileInputRef.current) {
        (fileInputRef.current as unknown as { value: string }).value = "";
      }

      if (folderInputRef.current) {
        (folderInputRef.current as unknown as { value: string }).value = "";
      }

      await invalidateData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsBusy(false);
    }
  }

  function openItem(item: LibraryItemSummary) {
    if (item.kind === "folder") {
      openFolder(item.id);
      return;
    }

    if (isPdfItem(item)) {
      void navigate({
        search: { itemId: item.id, name: item.name },
        to: "/reader",
      });
      return;
    }

    updateRouteState({
      folderId: item.parentId,
      openId: item.id,
      q: "",
    });
  }

  function openCreateFolderDialog() {
    setDraftName("");
    setDialog({ mode: "create-folder" });
  }

  function openRenameDialog(item: LibraryItemSummary) {
    setDraftName(item.name);
    setDialog({ itemId: item.id, mode: "rename" });
  }

  function openMoveDialog(item: LibraryItemSummary) {
    setMoveParentId(item.parentId ?? "__root__");
    setDialog({ itemId: item.id, mode: "move" });
  }

  function handleSignOut() {
    signOut().then(() => {
      startTransition(() => {
        void navigate({ to: "/" });
      });
    });
  }

  async function handleCreateFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await postAdmin({
        action: "create-folder",
        name: draftName,
        parentId: selectedFolderId,
      });
      setDraftName("");
      setDialog(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Folder could not be created.");
    }
  }

  async function handleRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!dialogItem) {
      return;
    }

    try {
      await postAdmin({
        action: "rename-item",
        id: dialogItem.id,
        name: draftName,
      });
      setDialog(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Rename failed.");
    }
  }

  async function handleMove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!dialogItem) {
      return;
    }

    try {
      await postAdmin({
        action: "move-item",
        id: dialogItem.id,
        parentId: moveParentId === "__root__" ? null : moveParentId,
      });
      setDialog(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Move failed.");
    }
  }

  async function handleDelete() {
    if (!dialogItem) {
      return;
    }

    try {
      await postAdmin({
        action: "delete-item",
        id: dialogItem.id,
      });
      setDialog(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Delete failed.");
    }
  }

  async function handleUserAction(action: "approve-user" | "ban-user", userId: string) {
    try {
      await postAdmin({
        action,
        id: userId,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "User update failed.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <BrandMark />
            <Separator orientation="vertical" className="h-5!" />
            <nav className="flex items-center gap-1">
              <button
                className={buttonVariants({ size: "sm", variant: tab === "library" ? "secondary" : "ghost" })}
                onClick={() => setTab("library")}
                type="button"
              >
                Library
              </button>
              <button
                className={buttonVariants({ size: "sm", variant: tab === "users" ? "secondary" : "ghost" })}
                onClick={() => setTab("users")}
                type="button"
              >
                Students
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {tab === "library" ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={buttonVariants({ size: "sm", variant: "default" })}
                  type="button"
                >
                  <IconPlus className="size-4" />
                  Create
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => {
                      const inputRef = fileInputRef.current as unknown as
                        | { click: () => void }
                        | null;
                      inputRef?.click();
                    }}
                  >
                    <IconUpload className="size-4" />
                    Upload file
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const inputRef = folderInputRef.current as unknown as
                        | { click: () => void }
                        | null;
                      inputRef?.click();
                    }}
                  >
                    <IconUpload className="size-4" />
                    Upload folder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openCreateFolderDialog}>
                    <IconFolderPlus className="size-4" />
                    Create folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(viewer.name)}
            </div>
            <Button onClick={handleSignOut} size="sm" variant="ghost">
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <input
        accept=".pdf,.jpeg,.jpg,.png,.epub"
        className="hidden"
        multiple
        onChange={(event) => {
          const target = event.currentTarget as unknown as {
            files?: ArrayLike<File> | null;
          };
          const nextFiles = Array.from(target.files ?? []);
          void uploadFiles(nextFiles, false);
        }}
        ref={fileInputRef}
        type="file"
      />
      <input
        accept=".pdf,.jpeg,.jpg,.png,.epub"
        className="hidden"
        multiple
        onChange={(event) => {
          const target = event.currentTarget as unknown as {
            files?: ArrayLike<File> | null;
          };
          const nextFiles = Array.from(target.files ?? []);
          void uploadFiles(nextFiles, true);
        }}
        ref={folderInputRef}
        type="file"
      />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 xl:flex-row">
        {tab === "library" ? (
          <aside className="w-full shrink-0 xl:w-72">
            <Card className="sticky top-20 p-3">
              <LibraryTree
                expandedFolderIds={expandedFolderIds}
                items={items}
                onSelectFolder={(nextFolderId) => openFolder(nextFolderId)}
                onToggleFolder={toggleFolder}
                selectedFolderId={selectedFolderId}
              />
            </Card>
          </aside>
        ) : null}

        <section className="min-w-0 flex-1 space-y-6">
          <Card className="p-5">
            {tab === "library" ? (
              <div className="space-y-4">
                <div className="relative max-w-xl">
                  <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    onChange={(event) => {
                      const target = event.currentTarget as unknown as { value: string };
                      setSearchInput(target.value);
                    }}
                    placeholder="Search by file, folder, or path"
                    value={searchInput}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <button className="hover:text-foreground" onClick={() => openFolder(null)} type="button">
                    Library
                  </button>
                  {breadcrumbs.map((crumb) => (
                    <div key={crumb.id} className="flex items-center gap-2">
                      <span>/</span>
                      <button
                        className="hover:text-foreground"
                        onClick={() => openFolder(crumb.id)}
                        type="button"
                      >
                        {crumb.name}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                      {deferredQuery ? `Search: ${deferredQuery}` : currentFolderName}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {deferredQuery
                        ? "Matches are checked against item names and full library paths."
                        : "Double-click folders to open them. Double-click PDFs to open the reader."}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {visibleItems.length} items
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review pending registrations, approve access, or disable existing students.
                </p>
              </div>
            )}
          </Card>

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {tab === "library" ? (
            visibleItems.length === 0 ? (
              <Card className="border-dashed p-10 text-center text-sm text-muted-foreground">
                {deferredQuery ? "No files or folders match your search." : "No files or folders in this location."}
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {visibleItems.map((item) => {
                  const result = deferredQuery ? searchResultById.get(item.id) ?? null : null;

                  return (
                    <LibraryItemTile
                      key={item.id}
                      detailText={result?.path}
                      item={item}
                      onDoubleClick={() => openItem(item)}
                      menu={(
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={buttonVariants({ size: "icon-xs", variant: "ghost" })}
                            type="button"
                          >
                            <IconDotsVertical className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => openItem(item)}>
                              {item.kind === "folder" ? (
                                <IconFolderOpen className="size-4" />
                              ) : (
                                <IconEye className="size-4" />
                              )}
                              {item.kind === "folder" ? "Open" : isPdfItem(item) ? "Open" : "Download"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRenameDialog(item)}>
                              <IconEdit className="size-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openMoveDialog(item)}>
                              <IconArrowsMove className="size-4" />
                              Move
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDialog({ itemId: item.id, mode: "info" })}>
                              <IconInfoCircle className="size-4" />
                              Info
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDialog({ itemId: item.id, mode: "delete" })}>
                              <IconTrash className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    />
                  );
                })}
              </div>
            )
          ) : (
            <Card className="p-0">
              <div className="divide-y divide-border/50">
                {studentUsers.length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No students registered yet.
                  </p>
                ) : (
                  studentUsers.map((user) => (
                    (() => {
                      const isPending = isPendingApprovalUser(user);

                      return (
                      <div key={user.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Registered {formatDateTime(typeof user.createdAt === "string" ? user.createdAt : user.createdAt?.toISOString?.() ?? null)}
                          </p>
                          {user.banReason ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {isPending ? "Awaiting admin approval" : user.banReason}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          {isPending ? (
                            <>
                              <Badge variant="secondary">Pending</Badge>
                              <Button onClick={() => void handleUserAction("approve-user", user.id)} size="sm">
                                Approve
                              </Button>
                            </>
                          ) : !user.banned ? (
                            <>
                              <Badge variant="secondary">Active</Badge>
                              <Button onClick={() => void handleUserAction("ban-user", user.id)} size="sm" variant="outline">
                                Ban
                              </Button>
                            </>
                          ) : (
                            <>
                              <Badge variant="destructive">Banned</Badge>
                              <Button onClick={() => void handleUserAction("approve-user", user.id)} size="sm">
                                Unban
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      );
                    })()
                  ))
                )}
              </div>
            </Card>
          )}
        </section>
      </main>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            if (dialog) {
              setDialog(null);
            } else {
              updateRouteState({
                folderId: selectedFolderId,
                openId: null,
                q,
                replace: true,
              });
            }
          }
        }}
        open={dialog !== null || !!downloadItem}
      >
        {dialog?.mode === "create-folder" ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create folder</DialogTitle>
              <DialogDescription>
                Create a new folder inside {currentFolderName}.
              </DialogDescription>
            </DialogHeader>
            <form className="mt-4" onSubmit={handleCreateFolder}>
              <Input
                onChange={(event) => {
                  const target = event.currentTarget as unknown as { value: string };
                  setDraftName(target.value);
                }}
                placeholder="Folder name"
                value={draftName}
              />
              <DialogFooter>
                <DialogDismiss>Cancel</DialogDismiss>
                <Button disabled={isBusy || !draftName.trim()} type="submit">
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        ) : null}

        {dialog?.mode === "rename" && dialogItem ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename</DialogTitle>
              <DialogDescription>
                Rename {dialogItem.name}.
              </DialogDescription>
            </DialogHeader>
            <form className="mt-4" onSubmit={handleRename}>
              <Input
                onChange={(event) => {
                  const target = event.currentTarget as unknown as { value: string };
                  setDraftName(target.value);
                }}
                value={draftName}
              />
              <DialogFooter>
                <DialogDismiss>Cancel</DialogDismiss>
                <Button disabled={isBusy || !draftName.trim()} type="submit">
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        ) : null}

        {dialog?.mode === "move" && dialogItem ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move</DialogTitle>
              <DialogDescription>
                Move {dialogItem.name} to another folder.
              </DialogDescription>
            </DialogHeader>
            <form className="mt-4" onSubmit={handleMove}>
              <select
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                onChange={(event) => {
                  const target = event.currentTarget as unknown as { value: string };
                  setMoveParentId(target.value);
                }}
                value={moveParentId}
              >
                <option value="__root__">Root</option>
                {moveOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <DialogFooter>
                <DialogDismiss>Cancel</DialogDismiss>
                <Button disabled={isBusy} type="submit">
                  Move
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        ) : null}

        {dialog?.mode === "delete" && dialogItem ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete</DialogTitle>
              <DialogDescription>
                {dialogItem.kind === "folder"
                  ? `Delete ${dialogItem.name} and everything inside it.`
                  : `Delete ${dialogItem.name}.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogDismiss>Cancel</DialogDismiss>
              <Button disabled={isBusy} onClick={() => void handleDelete()} type="button" variant="destructive">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}

        {dialog?.mode === "info" && dialogItem ? (
          <DialogContent className="max-w-xl">
            <LibraryInfoPanel item={dialogItem} items={items} onClose={() => setDialog(null)} />
          </DialogContent>
        ) : null}

        {downloadItem && !isPdfItem(downloadItem) ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Download file</DialogTitle>
              <DialogDescription>
                {downloadItem.name} is not opened in the built-in reader. Download it to view it.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogDismiss
                onClick={() => {
                  updateRouteState({
                    folderId: selectedFolderId,
                    openId: null,
                    q,
                    replace: true,
                  });
                }}
              >
                Cancel
              </DialogDismiss>
              <a
                className={buttonVariants({ size: "sm" })}
                download={downloadItem.name}
                href={downloadHref}
              >
                Download
              </a>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
