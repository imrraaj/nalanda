import {
  IconBook2,
  IconFileDescription,
  IconFileTypeJpg,
  IconFileTypePng,
  IconFolder,
  IconPlus,
  IconUpload,
} from "@tabler/icons-react";
import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { LibraryTree } from "@/components/library/library-tree";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/lib/auth.actions";
import {
  getLibraryBreadcrumbs,
  getLibraryChildren,
  getLibraryFolderOptions,
  isFileItem,
  isFolderItem,
  isPdfItem,
  type LibraryItemSummary,
} from "@/lib/library";
import { formatBytes, formatDateTime, getInitials } from "@/lib/utils";

type AdminUser = {
  banned: boolean | null;
  email: string;
  id: string;
  name: string;
  role: string;
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

function getFileIcon(item: Pick<LibraryItemSummary, "kind">) {
  switch (item.kind) {
    case "jpeg":
      return <IconFileTypeJpg className="size-4 text-primary" />;
    case "png":
      return <IconFileTypePng className="size-4 text-primary" />;
    case "epub":
      return <IconBook2 className="size-4 text-primary" />;
    default:
      return <IconFileDescription className="size-4 text-primary" />;
  }
}

function AdminDashboardPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { items, users, viewer } = Route.useLoaderData();
  const [tab, setTab] = useState<"library" | "users">("library");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set());
  const [newFolderName, setNewFolderName] = useState("");
  const [renameItemId, setRenameItemId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [moveItemId, setMoveItemId] = useState<string | null>(null);
  const [moveParentId, setMoveParentId] = useState("__root__");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectedFolderId && !items.some((item) => item.id === selectedFolderId && item.kind === "folder")) {
      setSelectedFolderId(null);
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
  }, [items, selectedFolderId]);

  const breadcrumbs = useMemo(
    () => getLibraryBreadcrumbs(items, selectedFolderId),
    [items, selectedFolderId],
  );
  const currentChildren = useMemo(
    () => getLibraryChildren(items, selectedFolderId),
    [items, selectedFolderId],
  );
  const folders = currentChildren.filter(isFolderItem);
  const files = currentChildren.filter(isFileItem);
  const currentFolderLabel = breadcrumbs.at(-1)?.name ?? "Library";

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      await invalidateData();
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await postAdmin({
        action: "create-folder",
        name: newFolderName,
        parentId: selectedFolderId,
      });
      setNewFolderName("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Folder could not be created.");
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!uploadFile) {
      return;
    }

    setIsBusy(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      if (selectedFolderId) {
        formData.append("parentId", selectedFolderId);
      }

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      setUploadFile(null);
      if (fileInputRef.current) {
        (fileInputRef.current as unknown as { value: string }).value = "";
      }
      await invalidateData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRenameSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!renameItemId) {
      return;
    }

    try {
      await postAdmin({
        action: "rename-item",
        id: renameItemId,
        name: renameName,
      });
      setRenameItemId(null);
      setRenameName("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Rename failed.");
    }
  }

  async function handleMoveSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!moveItemId) {
      return;
    }

    try {
      await postAdmin({
        action: "move-item",
        id: moveItemId,
        parentId: moveParentId === "__root__" ? null : moveParentId,
      });
      setMoveItemId(null);
      setMoveParentId("__root__");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Move failed.");
    }
  }

  async function handleDeleteItem(item: LibraryItemSummary) {
    const confirmFn = Reflect.get(globalThis, "confirm") as
      | ((message?: string) => boolean)
      | undefined;
    const confirmed = confirmFn?.(
      item.kind === "folder"
        ? `Delete "${item.name}" and everything inside it?`
        : `Delete "${item.name}"?`,
    ) ?? true;

    if (!confirmed) {
      return;
    }

    try {
      await postAdmin({
        action: "delete-item",
        id: item.id,
      });
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

  function handleSignOut() {
    signOut().then(() => {
      startTransition(() => {
        void navigate({ to: "/" });
      });
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <BrandMark />
            <Separator orientation="vertical" className="h-5!" />
            <span className="text-sm text-muted-foreground">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(viewer.name)}
            </div>
            <Button onClick={handleSignOut} size="sm" variant="ghost">
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-80">
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

        <section className="min-w-0 flex-1 space-y-6">
          <Card className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setTab("library")}
                    size="sm"
                    variant={tab === "library" ? "default" : "outline"}
                  >
                    Library
                  </Button>
                  <Button
                    onClick={() => setTab("users")}
                    size="sm"
                    variant={tab === "users" ? "default" : "outline"}
                  >
                    Students
                  </Button>
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                  {tab === "library" ? currentFolderLabel : "Student access"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tab === "library"
                    ? "Create folders, upload files, and manage the exam library tree."
                    : "Approve or ban student accounts."}
                </p>
              </div>

              {tab === "library" ? (
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
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
              ) : null}
            </div>
          </Card>

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {tab === "library" ? (
            <div className="space-y-6">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Card className="p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <IconPlus className="size-4 text-primary" />
                    New folder
                  </div>
                  <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleCreateFolder}>
                    <Input
                      onChange={(event) => {
                        const target = event.currentTarget as unknown as { value: string };
                        setNewFolderName(target.value);
                      }}
                      placeholder={`Create inside ${currentFolderLabel}`}
                      value={newFolderName}
                    />
                    <Button disabled={isBusy || !newFolderName.trim()} type="submit">
                      Create
                    </Button>
                  </form>
                </Card>

                <Card className="p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <IconUpload className="size-4 text-primary" />
                    Upload file
                  </div>
                  <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleUpload}>
                    <Input
                      accept=".pdf,.jpeg,.jpg,.png,.epub"
                      onChange={(event) => {
                        const target = event.currentTarget as unknown as {
                          files?: ArrayLike<File> | null;
                        };
                        const nextFile = target.files?.[0] ?? null;
                        setUploadFile(nextFile);
                      }}
                      ref={fileInputRef}
                      type="file"
                    />
                    <Button disabled={isBusy || !uploadFile} type="submit">
                      Upload
                    </Button>
                  </form>
                </Card>
              </div>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Folders
                  </h2>
                  <Badge variant="secondary">{folders.length}</Badge>
                </div>
                {folders.length === 0 ? (
                  <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
                    No folders in this location.
                  </Card>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {folders.map((folder) => (
                      <Card key={folder.id} className="space-y-4 p-4">
                        <button
                          className="flex w-full items-start gap-3 text-left"
                          onClick={() => openFolder(folder.id)}
                          type="button"
                        >
                          <div className="rounded-sm bg-primary/10 p-2 text-primary">
                            <IconFolder className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{folder.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Updated {formatDateTime(folder.updatedAt)}
                            </p>
                          </div>
                        </button>

                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => openFolder(folder.id)} size="xs" variant="outline">
                            Open
                          </Button>
                          <Button
                            onClick={() => {
                              setRenameItemId(folder.id);
                              setRenameName(folder.name);
                              setMoveItemId(null);
                            }}
                            size="xs"
                            variant="outline"
                          >
                            Rename
                          </Button>
                          <Button
                            onClick={() => {
                              setMoveItemId(folder.id);
                              setMoveParentId(folder.parentId ?? "__root__");
                              setRenameItemId(null);
                            }}
                            size="xs"
                            variant="outline"
                          >
                            Move
                          </Button>
                          <Button onClick={() => handleDeleteItem(folder)} size="xs" variant="ghost">
                            Delete
                          </Button>
                        </div>

                        {renameItemId === folder.id ? (
                          <form className="space-y-2" onSubmit={handleRenameSubmit}>
                            <Input
                              onChange={(event) => {
                                const target = event.currentTarget as unknown as {
                                  value: string;
                                };
                                setRenameName(target.value);
                              }}
                              value={renameName}
                            />
                            <div className="flex gap-2">
                              <Button disabled={isBusy || !renameName.trim()} size="xs" type="submit">
                                Save
                              </Button>
                              <Button
                                onClick={() => {
                                  setRenameItemId(null);
                                  setRenameName("");
                                }}
                                size="xs"
                                type="button"
                                variant="ghost"
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : null}

                        {moveItemId === folder.id ? (
                          <form className="space-y-2" onSubmit={handleMoveSubmit}>
                            <select
                              className="h-9 w-full rounded-sm border border-border bg-background px-3 text-sm"
                              onChange={(event) => {
                                const target = event.currentTarget as unknown as {
                                  value: string;
                                };
                                setMoveParentId(target.value);
                              }}
                              value={moveParentId}
                            >
                              <option value="__root__">Root</option>
                              {getLibraryFolderOptions(items, folder.id).map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.name}
                                </option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <Button disabled={isBusy} size="xs" type="submit">
                                Move
                              </Button>
                              <Button
                                onClick={() => {
                                  setMoveItemId(null);
                                  setMoveParentId("__root__");
                                }}
                                size="xs"
                                type="button"
                                variant="ghost"
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : null}
                      </Card>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Files
                  </h2>
                  <Badge variant="secondary">{files.length}</Badge>
                </div>

                {files.length === 0 ? (
                  <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
                    No files in this location.
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {files.map((item) => (
                      <Card key={item.id} className="space-y-4 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {getFileIcon(item)}
                              <p className="truncate text-sm font-medium">{item.name}</p>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatBytes(item.size ?? 0)}</span>
                              <span>•</span>
                              <span>{formatDateTime(item.updatedAt)}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {isPdfItem(item) ? (
                              <a
                                className="inline-flex h-6 items-center justify-center rounded-sm border border-transparent bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/80"
                                href={`/reader?itemId=${encodeURIComponent(item.id)}&name=${encodeURIComponent(item.name)}`}
                              >
                                Open
                              </a>
                            ) : (
                              <a
                                className="inline-flex h-6 items-center justify-center rounded-sm border border-transparent bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/80"
                                download={item.name}
                                href={`/api/documents/content?itemId=${encodeURIComponent(item.id)}&download=1`}
                              >
                                Download
                              </a>
                            )}
                            <Button
                              onClick={() => {
                                setRenameItemId(item.id);
                                setRenameName(item.name);
                                setMoveItemId(null);
                              }}
                              size="xs"
                              variant="outline"
                            >
                              Rename
                            </Button>
                            <Button
                              onClick={() => {
                                setMoveItemId(item.id);
                                setMoveParentId(item.parentId ?? "__root__");
                                setRenameItemId(null);
                              }}
                              size="xs"
                              variant="outline"
                            >
                              Move
                            </Button>
                            <Button onClick={() => handleDeleteItem(item)} size="xs" variant="ghost">
                              Delete
                            </Button>
                          </div>
                        </div>

                        {renameItemId === item.id ? (
                          <form className="space-y-2" onSubmit={handleRenameSubmit}>
                            <Input
                              onChange={(event) => {
                                const target = event.currentTarget as unknown as {
                                  value: string;
                                };
                                setRenameName(target.value);
                              }}
                              value={renameName}
                            />
                            <div className="flex gap-2">
                              <Button disabled={isBusy || !renameName.trim()} size="xs" type="submit">
                                Save
                              </Button>
                              <Button
                                onClick={() => {
                                  setRenameItemId(null);
                                  setRenameName("");
                                }}
                                size="xs"
                                type="button"
                                variant="ghost"
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : null}

                        {moveItemId === item.id ? (
                          <form className="space-y-2" onSubmit={handleMoveSubmit}>
                            <select
                              className="h-9 w-full rounded-sm border border-border bg-background px-3 text-sm"
                              onChange={(event) => {
                                const target = event.currentTarget as unknown as {
                                  value: string;
                                };
                                setMoveParentId(target.value);
                              }}
                              value={moveParentId}
                            >
                              <option value="__root__">Root</option>
                              {getLibraryFolderOptions(items).map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.name}
                                </option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <Button disabled={isBusy} size="xs" type="submit">
                                Move
                              </Button>
                              <Button
                                onClick={() => {
                                  setMoveItemId(null);
                                  setMoveParentId("__root__");
                                }}
                                size="xs"
                                type="button"
                                variant="ghost"
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : null}
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            </div>
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
                              <Button onClick={() => handleUserAction("ban-user", user.id)} size="sm" variant="outline">
                                Ban
                              </Button>
                            </>
                          ) : (
                            <>
                              <Badge variant="destructive">Banned</Badge>
                              <Button onClick={() => handleUserAction("approve-user", user.id)} size="sm">
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
    </div>
  );
}
