import {
  IconBook2,
  IconFileDescription,
  IconFileTypeJpg,
  IconFileTypePng,
  IconFolder,
  IconSearch,
} from "@tabler/icons-react";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { startTransition, useEffect, useMemo, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { LibraryTree } from "@/components/library/library-tree";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/lib/auth.actions";
import {
  getLibraryBreadcrumbs,
  getLibraryChildren,
  isFileItem,
  isFolderItem,
  isPdfItem,
  type LibraryItemSummary,
} from "@/lib/library";
import { formatBytes, formatDateTime, getInitials } from "@/lib/utils";

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

function DashboardPage() {
  const navigate = useNavigate();
  const { items, viewer } = Route.useLoaderData();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set());
  const [searchQuery, setSearchQuery] = useState("");

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
  const filteredChildren = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return currentChildren;
    }

    return currentChildren.filter((item) => item.name.toLowerCase().includes(query));
  }, [currentChildren, searchQuery]);
  const folders = filteredChildren.filter(isFolderItem);
  const files = filteredChildren.filter(isFileItem);

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

  function handleSignOut() {
    signOut().then(() => {
      startTransition(() => {
        void navigate({ to: "/" });
      });
    });
  }

  const currentFolderName = breadcrumbs.at(-1)?.name ?? "Library";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <BrandMark />
            <Separator orientation="vertical" className="h-5!" />
            <span className="text-sm text-muted-foreground">Library</span>
          </div>
          <div className="flex items-center gap-3">
            {viewer.role === "admin" ? (
              <Link className={buttonVariants({ size: "sm", variant: "outline" })} to="/admin/dashboard">
                Admin
              </Link>
            ) : null}
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
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">{currentFolderName}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Browse the published study library by exam, subject, and material type.
                </p>
              </div>

              <div className="relative w-full max-w-sm">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(event) => {
                    const target = event.currentTarget as unknown as { value: string };
                    setSearchQuery(target.value);
                  }}
                  placeholder="Search this folder"
                  value={searchQuery}
                />
              </div>
            </div>
          </Card>

          <div className="space-y-6">
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
                    <button
                      key={folder.id}
                      className="flex items-start gap-3 rounded-sm border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40"
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
                  {files.map((item) => {
                    const action = isPdfItem(item) ? (
                      <Link
                        className={buttonVariants({ size: "sm" })}
                        search={{ itemId: item.id, name: item.name }}
                        to="/reader"
                      >
                        Open
                      </Link>
                    ) : (
                      <a
                        className={buttonVariants({ size: "sm" })}
                        download={item.name}
                        href={`/api/documents/content?itemId=${encodeURIComponent(item.id)}&download=1`}
                      >
                        Download
                      </a>
                    );

                    return (
                      <Card key={item.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
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
                        <div className="shrink-0">{action}</div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
