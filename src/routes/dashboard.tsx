import {
  IconDotsVertical,
  IconEye,
  IconFolderOpen,
  IconInfoCircle,
  IconSearch,
} from "@tabler/icons-react";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { LibraryInfoPanel } from "@/components/library/library-info-panel";
import { LibraryItemTile } from "@/components/library/library-item-tile";
import { LibraryTree } from "@/components/library/library-tree";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/lib/auth.actions";
import {
  getLibraryBreadcrumbs,
  getLibraryChildren,
  isPdfItem,
  searchLibraryItems,
  type LibraryItemSummary,
} from "@/lib/library";
import { getInitials } from "@/lib/utils";

type DashboardDialogState =
  | { itemId: string; mode: "info" }
  | null;

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>) => ({
    folderId: typeof search.folderId === "string" ? search.folderId : "",
    openId: typeof search.openId === "string" ? search.openId : "",
    q: typeof search.q === "string" ? search.q : "",
  }),
  beforeLoad: async () => {
    const { getSession } = await import("@/lib/auth.function");
    const session = await getSession();

    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async () => {
    const [{ getSession }, { loadDashboardLibraryData }] = await Promise.all([
      import("@/lib/auth.function"),
      import("@/routes/-dashboard.function"),
    ]);
    const [session, data] = await Promise.all([getSession(), loadDashboardLibraryData()]);

    if (!session) {
      throw redirect({ to: "/login" });
    }

    return {
      items: data.items,
      viewer: {
        name: session.user.name,
        role: (session.user as { role?: string | null }).role ?? "user",
      },
    };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { folderId, openId, q } = Route.useSearch();
  const { items, viewer } = Route.useLoaderData();
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set());
  const [dialog, setDialog] = useState<DashboardDialogState>(null);
  const [searchInput, setSearchInput] = useState(q);
  const searchQuery = searchInput.trim();
  const deferredQuery = useDeferredValue(searchQuery);
  const selectedFolderId = folderId || null;
  const dialogItem = useMemo(
    () => (dialog ? items.find((item) => item.id === dialog.itemId) ?? null : null),
    [dialog, items],
  );
  const downloadItem = useMemo(() => {
    if (!openId) {
      return null;
    }

    return items.find((item) => item.id === openId) ?? null;
  }, [items, openId]);

  useEffect(() => {
    if (selectedFolderId && !items.some((item) => item.id === selectedFolderId && item.kind === "folder")) {
      void navigate({
        replace: true,
        search: {
          folderId: "",
          openId: openId || "",
          q: q || "",
        },
        to: "/dashboard",
      });
      return;
    }

    if (dialog && !items.some((item) => item.id === dialog.itemId)) {
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
        to: "/dashboard",
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
        to: "/dashboard",
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
  const visibleItems = deferredQuery ? searchResults.map((result) => result.item) : currentItems;
  const currentFolderName = breadcrumbs.at(-1)?.name ?? "Library";
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
        to: "/dashboard",
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
      to: "/dashboard",
    });
  }

  function toggleFolder(folderIdToToggle: string) {
    setExpandedFolderIds((current) => {
      const next = new Set(current);

      if (next.has(folderIdToToggle)) {
        next.delete(folderIdToToggle);
      } else {
        next.add(folderIdToToggle);
      }

      return next;
    });
  }

  function openFolder(folderIdToOpen: string | null, options?: { clearQuery?: boolean }) {
    setDialog(null);
    updateRouteState({
      folderId: folderIdToOpen,
      openId: null,
      q: options?.clearQuery === false ? q : "",
    });

    if (folderIdToOpen) {
      setExpandedFolderIds((current) => new Set(current).add(folderIdToOpen));
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
            <span className="text-sm font-medium">Library</span>
          </div>
          <div className="flex items-center gap-3">
            {viewer.role === "admin" ? (
              <Link
                className={buttonVariants({ size: "sm", variant: "outline" })}
                search={{ folderId: "", openId: "", q: "" }}
                to="/admin/dashboard"
              >
                Admin
              </Link>
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

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 xl:flex-row">
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

        <section className="min-w-0 flex-1 space-y-6">
          <Card className="p-5">
            <div className="flex flex-col gap-4">
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
                      : "Double-click a folder to open it. Double-click a PDF to read it."}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {visibleItems.length} items
                </span>
              </div>
            </div>
          </Card>

          {visibleItems.length === 0 ? (
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
                          <DropdownMenuItem onClick={() => setDialog({ itemId: item.id, mode: "info" })}>
                            <IconInfoCircle className="size-4" />
                            Info
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  />
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            if (dialog?.mode === "info") {
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
