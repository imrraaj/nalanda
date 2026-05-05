import {
  IconDotsVertical,
  IconEye,
  IconFolderOpen,
  IconInfoCircle,
} from "@tabler/icons-react";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { startTransition, useEffect, useMemo, useState } from "react";

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
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/lib/auth.actions";
import {
  getLibraryBreadcrumbs,
  getLibraryChildren,
  isPdfItem,
  type LibraryItemSummary,
} from "@/lib/library";
import { getInitials } from "@/lib/utils";

type DashboardDialogState =
  | { itemId: string; mode: "download" | "info" }
  | null;

export const Route = createFileRoute("/dashboard")({
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
  const { items, viewer } = Route.useLoaderData();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set());
  const [dialog, setDialog] = useState<DashboardDialogState>(null);

  useEffect(() => {
    if (selectedFolderId && !items.some((item) => item.id === selectedFolderId && item.kind === "folder")) {
      setSelectedFolderId(null);
    }

    if (dialog && !items.some((item) => item.id === dialog.itemId)) {
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
    () => (dialog ? items.find((item) => item.id === dialog.itemId) ?? null : null),
    [dialog, items],
  );
  const currentFolderName = breadcrumbs.at(-1)?.name ?? "Library";

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

  function handleSignOut() {
    signOut().then(() => {
      startTransition(() => {
        void navigate({ to: "/" });
      });
    });
  }

  const downloadHref = dialogItem
    ? `/api/documents/content?itemId=${encodeURIComponent(dialogItem.id)}&download=1`
    : "#";

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
              <Link className={buttonVariants({ size: "sm", variant: "outline" })} to="/admin/dashboard">
                Admin
              </Link>
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

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 xl:flex-row">
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

        <section className="min-w-0 flex-1 space-y-6">
          <Card className="p-5">
            <div className="flex flex-col gap-4">
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
                    Double-click a folder to open it. Double-click a PDF to read it.
                  </p>
                </div>
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {currentItems.length} items
                </span>
              </div>
            </div>
          </Card>

          {currentItems.length === 0 ? (
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
                        <DropdownMenuItem onClick={() => setDialog({ itemId: item.id, mode: "info" })}>
                          <IconInfoCircle className="size-4" />
                          Info
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                />
              ))}
            </div>
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
