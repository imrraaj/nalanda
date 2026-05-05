import {
  IconArrowsMove,
  IconDotsVertical,
  IconEdit,
  IconEye,
  IconFolderOpen,
  IconFolderPlus,
  IconInfoCircle,
  IconPlus,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";

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
  type LibraryItemSummary,
} from "@/lib/library";
import { getInitials } from "@/lib/utils";

type AdminUser = {
  banned: boolean | null;
  email: string;
  id: string;
  name: string;
  role: string;
};

type AdminTab = "library" | "users";

type AdminDialogState =
  | { mode: "create-folder" }
  | { itemId: string; mode: "delete" | "download" | "info" | "move" | "rename" }
  | null;

type FileInputWithRelativePath = File & {
  webkitRelativePath?: string;
};

export const Route = createFileRoute("/admin/dashboard")({
  beforeLoad: async () => {
    const { getSession } = await import("@/lib/auth.function");
    const session = await getSession();
    if (!session) throw redirect({ to: "/login" });
    if ((session.user as { role?: string }).role !== "admin") throw redirect({ to: "/dashboard" });
  },
  loader: async () => {
    const [{ getSession }, { loadAdminDashboardData }] = await Promise.all([
      import("@/lib/auth.function"),
      import("@/routes/admin/-dashboard.function"),
    ]);
    const [session, data] = await Promise.all([getSession(), loadAdminDashboardData()]);

    if (!session) {
      throw redirect({ to: "/login" });
    }

    if ((session.user as { role?: string }).role !== "admin") {
      throw redirect({ to: "/dashboard" });
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
  const { items, users, viewer } = Route.useLoaderData();
  const [tab, setTab] = useState<AdminTab>("library");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set());
  const [dialog, setDialog] = useState<AdminDialogState>(null);
  const [draftName, setDraftName] = useState("");
  const [moveParentId, setMoveParentId] = useState("__root__");
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

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
      setSelectedFolderId(null);
    }

    if (dialog && "itemId" in dialog && !items.some((item) => item.id === dialog.itemId)) {
      setDialog(null);
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
  }, [dialog, items, selectedFolderId]);

  const breadcrumbs = useMemo(
    () => getLibraryBreadcrumbs(items, selectedFolderId),
    [items, selectedFolderId],
  );
  const currentItems = useMemo(
    () => getLibraryChildren(items, selectedFolderId),
    [items, selectedFolderId],
  );
  const dialogItem = useMemo(
    () => (dialog && "itemId" in dialog ? items.find((item) => item.id === dialog.itemId) ?? null : null),
    [dialog, items],
  );
  const currentFolderName = breadcrumbs.at(-1)?.name ?? "Library";
  const moveOptions = useMemo(
    () => getLibraryFolderOptions(items, dialogItem?.kind === "folder" ? dialogItem.id : null),
    [dialogItem, items],
  );
  const downloadHref = dialogItem
    ? `/api/documents/content?itemId=${encodeURIComponent(dialogItem.id)}&download=1`
    : "#";

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

  function openFolder(folderId: string) {
    setSelectedFolderId(folderId);
    setExpandedFolderIds((current) => new Set(current).add(folderId));
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

    setDialog({ itemId: item.id, mode: "download" });
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

            <div className="flex size-8 items-center justify-center rounded-[4px] bg-primary/10 text-xs font-semibold text-primary">
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
                onSelectFolder={setSelectedFolderId}
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
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <button className="hover:text-foreground" onClick={() => setSelectedFolderId(null)} type="button">
                    Library
                  </button>
                  {breadcrumbs.map((crumb) => (
                    <div key={crumb.id} className="flex items-center gap-2">
                      <span>/</span>
                      <button
                        className="hover:text-foreground"
                        onClick={() => setSelectedFolderId(crumb.id)}
                        type="button"
                      >
                        {crumb.name}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight">{currentFolderName}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Double-click folders to open them. Double-click PDFs to open the reader.
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {currentItems.length} items
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Approve or block student access from the main menu actions.
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
            currentItems.length === 0 ? (
              <Card className="border-dashed p-10 text-center text-sm text-muted-foreground">
                No files or folders in this location.
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {currentItems.map((item) => (
                  <LibraryItemTile
                    key={item.id}
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
                ))}
              </div>
            )
          ) : (
            <Card className="p-0">
              <div className="divide-y divide-border/50">
                {users.filter((user) => user.role !== "admin").length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No students registered yet.
                  </p>
                ) : (
                  users
                    .filter((user) => user.role !== "admin")
                    .map((user) => (
                      <div key={user.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!user.banned ? (
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
            setDialog(null);
          }
        }}
        open={dialog !== null}
      >
        {dialog?.mode === "create-folder" ? (
          <DialogContent>
            <DialogIconClose />
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
            <DialogIconClose />
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
            <DialogIconClose />
            <DialogHeader>
              <DialogTitle>Move</DialogTitle>
              <DialogDescription>
                Move {dialogItem.name} to another folder.
              </DialogDescription>
            </DialogHeader>
            <form className="mt-4" onSubmit={handleMove}>
              <select
                className="h-9 w-full rounded-[4px] border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
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
            <DialogIconClose />
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

        {dialog?.mode === "download" && dialogItem ? (
          <DialogContent>
            <DialogIconClose />
            <DialogHeader>
              <DialogTitle>Download file</DialogTitle>
              <DialogDescription>
                {dialogItem.name} is not opened in the built-in reader. Download it to view it.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogDismiss>Cancel</DialogDismiss>
              <a
                className={buttonVariants({ size: "sm" })}
                download={dialogItem.name}
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
