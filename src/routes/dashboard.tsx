import {
  IconDotsVertical,
  IconEye,
  IconFolderOpen,
  IconInfoCircle,
  IconSearch,
} from "@tabler/icons-react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ReactNode, startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { LibraryInfoPanel } from "@/components/library/library-info-panel";
import { LibraryItemTile } from "@/components/library/library-item-tile";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";
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

type ItemAction = {
  key: string;
  label: string;
  onSelect: () => void;
  renderIcon: () => ReactNode;
};

function normalizeDashboardSearchState(next: {
  folderId?: string | null;
  openId?: string | null;
  q?: string | null;
}) {
  const normalizedFolderId = next.folderId?.trim();
  const normalizedOpenId = next.openId?.trim();
  const normalizedQuery = next.q?.trim();

  return {
    folderId: normalizedFolderId || undefined,
    openId: normalizedOpenId || undefined,
    q: normalizedQuery || undefined,
  };
}

function buildDashboardHref(next: {
  folderId?: string | null;
  openId?: string | null;
  q?: string | null;
}) {
  const params = new URLSearchParams();

  if (next.folderId?.trim()) {
    params.set("folderId", next.folderId.trim());
  }

  if (next.openId?.trim()) {
    params.set("openId", next.openId.trim());
  }

  if (next.q?.trim()) {
    params.set("q", next.q.trim());
  }

  const query = params.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>) => ({
    folderId:
      typeof search.folderId === "string" && search.folderId.trim()
        ? search.folderId
        : undefined,
    openId:
      typeof search.openId === "string" && search.openId.trim()
        ? search.openId
        : undefined,
    q:
      typeof search.q === "string" && search.q.trim()
        ? search.q
        : undefined,
  }),
  loader: async () => {
    const [{ getSession }, { loadDashboardLibraryData }] = await Promise.all([
      import("@/lib/auth.function"),
      import("@/routes/-dashboard.function"),
    ]);
    const [session, data] = await Promise.all([getSession(), loadDashboardLibraryData()]);

    return {
      items: data.items,
      viewer: session
        ? {
            name: session.user.name,
            role: (session.user as { role?: string | null }).role ?? "user",
          }
        : null,
    };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { folderId, openId, q } = Route.useSearch();
  const { items, viewer } = Route.useLoaderData();
  const [dialog, setDialog] = useState<DashboardDialogState>(null);
  const [searchInput, setSearchInput] = useState(q ?? "");
  const searchQuery = searchInput.trim();
  const deferredQuery = useDeferredValue(searchQuery);
  const selectedFolderId = folderId ?? null;
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
    if (downloadItem && !viewer) {
      const redirectTo = isPdfItem(downloadItem)
        ? `/reader?itemId=${encodeURIComponent(downloadItem.id)}&name=${encodeURIComponent(downloadItem.name)}`
        : buildDashboardHref({
            folderId: downloadItem.parentId,
            openId: downloadItem.id,
          });

      void navigate({
        search: { redirectTo },
        to: "/login",
      });
      return;
    }

    if (selectedFolderId && !items.some((item) => item.id === selectedFolderId && item.kind === "folder")) {
      void navigate({
        replace: true,
        search: normalizeDashboardSearchState({
          openId,
          q,
        }),
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
        search: normalizeDashboardSearchState({
          folderId: downloadItem.id,
        }),
        to: "/dashboard",
      });
      return;
    }

    if (openId && !downloadItem) {
      void navigate({
        replace: true,
        search: normalizeDashboardSearchState({
          folderId: selectedFolderId,
          q,
        }),
        to: "/dashboard",
      });
    }
  }, [dialog, downloadItem, items, navigate, openId, q, selectedFolderId, viewer]);

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
  const currentFolderName = breadcrumbs.at(-1)?.name ?? "Pilot360 Library";
  const downloadHref = downloadItem
    ? `/api/documents/content?itemId=${encodeURIComponent(downloadItem.id)}&download=1`
    : "#";

  useEffect(() => {
    setSearchInput(q ?? "");
  }, [q]);

  useEffect(() => {
    if (searchInput === (q ?? "")) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void navigate({
        replace: true,
        search: normalizeDashboardSearchState({
          folderId: selectedFolderId,
          q: searchInput,
        }),
        to: "/dashboard",
      });
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [navigate, q, searchInput, selectedFolderId]);

  function updateRouteState(next: {
    folderId?: string | null;
    openId?: string | null;
    q?: string | null;
    replace?: boolean;
  }) {
    void navigate({
      replace: next.replace ?? false,
      search: normalizeDashboardSearchState({
        folderId: next.folderId,
        openId: next.openId,
        q: next.q,
      }),
      to: "/dashboard",
    });
  }

  function openFolder(folderIdToOpen: string | null, options?: { clearQuery?: boolean }) {
    setDialog(null);
    updateRouteState({
      folderId: folderIdToOpen,
      openId: null,
      q: options?.clearQuery === false ? q : "",
    });
  }

  function openItem(item: LibraryItemSummary) {
    if (item.kind === "folder") {
      openFolder(item.id);
      return;
    }

    if (!viewer) {
      const redirectTo = isPdfItem(item)
        ? `/reader?itemId=${encodeURIComponent(item.id)}&name=${encodeURIComponent(item.name)}`
        : buildDashboardHref({
            folderId: item.parentId,
            openId: item.id,
          });
      void navigate({
        search: { redirectTo },
        to: "/login",
      });
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

  function getItemActions(item: LibraryItemSummary): ItemAction[] {
    return [
      {
        key: "open",
        label: item.kind === "folder" ? "Open" : isPdfItem(item) ? "Open" : "Download",
        onSelect: () => openItem(item),
        renderIcon: () =>
          item.kind === "folder" ? (
            <IconFolderOpen className="size-4" />
          ) : (
            <IconEye className="size-4" />
          ),
      },
      {
        key: "info",
        label: "Info",
        onSelect: () => setDialog({ itemId: item.id, mode: "info" }),
        renderIcon: () => <IconInfoCircle className="size-4" />,
      },
    ];
  }

  function renderDropdownActions(actions: ItemAction[]) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          className={buttonVariants({ size: "icon-xs", variant: "ghost" })}
          type="button"
        >
          <IconDotsVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {actions.map((action) => (
            <DropdownMenuItem key={action.key} onClick={action.onSelect}>
              {action.renderIcon()}
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  function renderContextActions(actions: ItemAction[]) {
    return (
      <ContextMenuContent>
        {actions.map((action) => (
          <ContextMenuItem key={action.key} onClick={action.onSelect}>
            {action.renderIcon()}
            {action.label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <BrandMark />
            <Separator className="h-5!" orientation="vertical" />
            <span className="text-sm font-medium">Library</span>
          </div>
          <div className="flex items-center gap-3">
            {viewer?.role === "admin" ? (
              <Link
                className={buttonVariants({ size: "sm", variant: "outline" })}
                to="/admin/dashboard"
              >
                Admin
              </Link>
            ) : null}
            {viewer ? (
              <>
                <div className="flex size-8 items-center justify-center rounded-[4px] bg-primary/10 text-xs font-semibold text-primary">
                  {getInitials(viewer.name)}
                </div>
                <Button onClick={handleSignOut} size="sm" variant="ghost">
                  Sign out
                </Button>
              </>
            ) : (
              <Link className={buttonVariants({ size: "sm" })} search={{ redirectTo: "/dashboard" }} to="/login">
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6">
        <Card className="p-5">
          <div className="space-y-4">
            <div className="relative max-w-xl">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(event) => setSearchInput(event.currentTarget.value)}
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

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {deferredQuery ? `Search: ${deferredQuery}` : currentFolderName}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {deferredQuery
                    ? "Matches are checked against item names and full library paths."
                    : "Double-click a folder to open it. Double-click a PDF to open the reader."}
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
              const actions = getItemActions(item);

              return (
                <LibraryItemTile
                  contextMenu={renderContextActions(actions)}
                  detailText={result?.path}
                  item={item}
                  key={item.id}
                  menu={renderDropdownActions(actions)}
                  onDoubleClick={() => openItem(item)}
                />
              );
            })}
          </div>
        )}
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
