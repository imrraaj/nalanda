import {
  IconArrowsMove,
  IconChevronLeft,
  IconChevronRight,
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
import { type ReactNode, startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { LibraryInfoPanel } from "@/components/library/library-info-panel";
import { LibraryItemTile } from "@/components/library/library-item-tile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { loadAdminUsersPage } from "@/routes/admin/-dashboard.function";

type AdminUser = {
  banReason?: string | null;
  banned: boolean | null;
  createdAt?: string | Date | null;
  email: string;
  id: string;
  name: string;
  role: string;
};

type AdminUsersPage = {
  page: number;
  pageSize: number;
  query: string;
  totalPages: number;
  totalUsers: number;
  users: AdminUser[];
};

type AdminTab = "library" | "users";

type AdminDialogState =
  | { mode: "create-folder" }
  | { itemId: string; mode: "delete" | "info" | "move" | "rename" }
  | null;

type FileInputWithRelativePath = File & {
  webkitRelativePath?: string;
};

type UploadProgressState = {
  fileCount: number;
  percent: number;
};

type ItemAction = {
  destructive?: boolean;
  key: string;
  label: string;
  onSelect: () => void;
  renderIcon: () => ReactNode;
  separatorBefore?: boolean;
};

function isPendingApprovalUser(user: AdminUser) {
  if (!user.banned) {
    return false;
  }

  const reason = user.banReason?.toLowerCase().trim() ?? "";
  return reason === "pending admin approval" || reason === "awaiting approval";
}

function isRejectedUser(user: AdminUser) {
  if (!user.banned) {
    return false;
  }

  return (user.banReason?.toLowerCase().trim() ?? "") === "access request rejected by admin";
}

function normalizeAdminSearchState(next: {
  folderId?: string | null;
  openId?: string | null;
  q?: string | null;
  tab?: AdminTab | null;
  userPage?: number | null;
  userQ?: string | null;
}) {
  const normalizedFolderId = next.folderId?.trim();
  const normalizedOpenId = next.openId?.trim();
  const normalizedQuery = next.q?.trim();
  const normalizedUserQuery = next.userQ?.trim();

  return {
    folderId: normalizedFolderId || undefined,
    openId: normalizedOpenId || undefined,
    q: normalizedQuery || undefined,
    tab: next.tab && next.tab !== "library" ? next.tab : undefined,
    userPage:
      next.userPage && Number.isFinite(next.userPage) && next.userPage > 1
        ? next.userPage
        : undefined,
    userQ: normalizedUserQuery || undefined,
  };
}

export const Route = createFileRoute("/admin/dashboard")({
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
    tab:
      search.tab === "users" || search.tab === "library"
        ? search.tab
        : undefined,
    userPage: (() => {
      const value =
        typeof search.userPage === "number"
          ? search.userPage
          : typeof search.userPage === "string"
            ? Number.parseInt(search.userPage, 10)
            : NaN;

      return Number.isFinite(value) && value > 1 ? value : undefined;
    })(),
    userQ:
      typeof search.userQ === "string" && search.userQ.trim()
        ? search.userQ
        : undefined,
  }),
  beforeLoad: async () => {
    const { getSession } = await import("@/lib/auth.function");
    const session = await getSession();

    if (!session) {
      throw redirect({
        search: { redirectTo: "/admin/dashboard" },
        to: "/login",
      });
    }

    if ((session.user as { role?: string }).role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: async () => {
    const [{ getSession }, { loadAdminDashboardData }] = await Promise.all([
      import("@/lib/auth.function"),
      import("@/routes/admin/-dashboard.function"),
    ]);
    const [session, data] = await Promise.all([getSession(), loadAdminDashboardData()]);

    if (!session) {
      throw redirect({
        search: { redirectTo: "/admin/dashboard" },
        to: "/login",
      });
    }

    if ((session.user as { role?: string }).role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }

    return {
      items: data.items as LibraryItemSummary[],
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
  const { folderId, openId, q, tab, userPage, userQ } = Route.useSearch();
  const { items, viewer } = Route.useLoaderData();
  const activeTab = tab ?? "library";
  const currentUserPage = userPage ?? 1;
  const selectedFolderId = folderId ?? null;
  const [dialog, setDialog] = useState<AdminDialogState>(null);
  const [draftName, setDraftName] = useState("");
  const [moveParentId, setMoveParentId] = useState("__root__");
  const [isBusy, setIsBusy] = useState(false);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(q ?? "");
  const [userSearchInput, setUserSearchInput] = useState(userQ ?? "");
  const [usersPage, setUsersPage] = useState<AdminUsersPage | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const searchQuery = searchInput.trim();
  const deferredQuery = useDeferredValue(searchQuery);
  const deferredUserQuery = useDeferredValue(userSearchInput.trim());

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
      folderInputRef.current.setAttribute("webkitdirectory", "");
      folderInputRef.current.setAttribute("directory", "");
    }
  }, []);

  useEffect(() => {
    if (selectedFolderId && !items.some((item) => item.id === selectedFolderId && item.kind === "folder")) {
      void navigate({
        replace: true,
        search: normalizeAdminSearchState({
          openId,
          q,
          tab: activeTab,
          userPage: currentUserPage,
          userQ,
        }),
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
        search: normalizeAdminSearchState({
          folderId: downloadItem.id,
          tab: activeTab,
          userPage: currentUserPage,
          userQ,
        }),
        to: "/admin/dashboard",
      });
      return;
    }

    if (openId && !downloadItem) {
      void navigate({
        replace: true,
        search: normalizeAdminSearchState({
          folderId: selectedFolderId,
          q,
          tab: activeTab,
          userPage: currentUserPage,
          userQ,
        }),
        to: "/admin/dashboard",
      });
    }
  }, [
    activeTab,
    currentUserPage,
    dialog,
    downloadItem,
    items,
    navigate,
    openId,
    q,
    selectedFolderId,
    userQ,
  ]);

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
  const moveOptions = useMemo(
    () => getLibraryFolderOptions(items, dialogItem?.kind === "folder" ? dialogItem.id : null),
    [dialogItem, items],
  );
  const studentUsers = useMemo(() => usersPage?.users ?? [], [usersPage]);
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
        search: normalizeAdminSearchState({
          folderId: selectedFolderId,
          q: searchInput,
          tab: activeTab,
          userPage: currentUserPage,
          userQ,
        }),
        to: "/admin/dashboard",
      });
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [activeTab, currentUserPage, navigate, q, searchInput, selectedFolderId, userQ]);

  useEffect(() => {
    setUserSearchInput(userQ ?? "");
  }, [userQ]);

  useEffect(() => {
    if (userSearchInput === (userQ ?? "")) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void navigate({
        replace: true,
        search: normalizeAdminSearchState({
          folderId: selectedFolderId,
          openId,
          q,
          tab: "users",
          userPage: 1,
          userQ: userSearchInput,
        }),
        to: "/admin/dashboard",
      });
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [navigate, openId, q, selectedFolderId, userQ, userSearchInput]);

  useEffect(() => {
    if (activeTab !== "users") {
      return;
    }

    let isCancelled = false;
    setIsUsersLoading(true);
    setErrorMessage(null);

    void loadAdminUsersPage({
      data: {
        page: currentUserPage,
        q: userQ ?? "",
      },
    })
      .then((result) => {
        if (isCancelled) {
          return;
        }

        setUsersPage(result as AdminUsersPage);

        if (result.page !== currentUserPage) {
          void navigate({
            replace: true,
            search: normalizeAdminSearchState({
              folderId: selectedFolderId,
              openId,
              q,
              tab: "users",
              userPage: result.page,
              userQ,
            }),
            to: "/admin/dashboard",
          });
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load students.");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsUsersLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeTab, currentUserPage, navigate, openId, q, selectedFolderId, userQ]);

  function updateRouteState(next: {
    folderId?: string | null;
    openId?: string | null;
    q?: string | null;
    replace?: boolean;
    tab?: AdminTab | null;
    userPage?: number | null;
    userQ?: string | null;
  }) {
    void navigate({
      replace: next.replace ?? false,
      search: normalizeAdminSearchState({
        folderId: next.folderId,
        openId: next.openId,
        q: next.q,
        tab: next.tab ?? activeTab,
        userPage: next.userPage ?? currentUserPage,
        userQ: next.userQ ?? userQ,
      }),
      to: "/admin/dashboard",
    });
  }

  function setActiveTab(nextTab: AdminTab) {
    updateRouteState({
      folderId: selectedFolderId,
      openId: null,
      q,
      replace: true,
      tab: nextTab,
      userPage: nextTab === "users" ? currentUserPage : 1,
      userQ: nextTab === "users" ? userQ : userQ,
    });
    setDialog(null);
    setErrorMessage(null);
  }

  function openFolder(folderIdToOpen: string | null, options?: { clearQuery?: boolean }) {
    updateRouteState({
      folderId: folderIdToOpen,
      openId: null,
      q: options?.clearQuery === false ? q : "",
      tab: "library",
    });

    setDialog(null);
  }

  async function invalidateData() {
    await router.invalidate({ sync: true });
  }

  async function refreshUsers() {
    if (activeTab !== "users") {
      return;
    }

    setIsUsersLoading(true);
    setErrorMessage(null);

    try {
      const result = await loadAdminUsersPage({
        data: {
          page: currentUserPage,
          q: userQ ?? "",
        },
      });

      setUsersPage(result as AdminUsersPage);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load students.");
    } finally {
      setIsUsersLoading(false);
    }
  }

  async function parseError(response: Response) {
    try {
      const payload = (await response.json()) as { error?: string };
      return payload.error ?? "Request failed.";
    } catch {
      return "Request failed.";
    }
  }

  async function postAdmin(
    body: Record<string, unknown>,
    options?: { onSuccess?: () => Promise<void> | void },
  ) {
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

      await options?.onSuccess?.();
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
    setUploadProgress({ fileCount: files.length, percent: 0 });

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

      const response = await new Promise<Response>((resolve, reject) => {
        const request = new XMLHttpRequest();

        request.open("POST", "/api/admin/upload");
        request.responseType = "text";
        request.upload.onprogress = (event) => {
          if (!event.lengthComputable) {
            return;
          }

          setUploadProgress({
            fileCount: files.length,
            percent: Math.max(1, Math.round((event.loaded / event.total) * 100)),
          });
        };
        request.onerror = () => reject(new Error("Upload failed."));
        request.onload = () => {
          resolve(
            new Response(request.responseText, {
              status: request.status,
              statusText: request.statusText,
            }),
          );
        };
        request.send(formData);
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (folderInputRef.current) {
        folderInputRef.current.value = "";
      }

      setUploadProgress({ fileCount: files.length, percent: 100 });
      await invalidateData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadProgress(null);
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
      tab: "library",
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
      await postAdmin(
        {
          action: "create-folder",
          name: draftName,
          parentId: selectedFolderId,
        },
        { onSuccess: invalidateData },
      );
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
      await postAdmin(
        {
          action: "rename-item",
          id: dialogItem.id,
          name: draftName,
        },
        { onSuccess: invalidateData },
      );
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
      await postAdmin(
        {
          action: "move-item",
          id: dialogItem.id,
          parentId: moveParentId === "__root__" ? null : moveParentId,
        },
        { onSuccess: invalidateData },
      );
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
      await postAdmin(
        {
          action: "delete-item",
          id: dialogItem.id,
        },
        { onSuccess: invalidateData },
      );
      setDialog(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Delete failed.");
    }
  }

  async function handleUserAction(action: "approve-user" | "ban-user" | "reject-user", userId: string) {
    try {
      await postAdmin(
        {
          action,
          id: userId,
        },
        { onSuccess: refreshUsers },
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "User update failed.");
    }
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
        key: "rename",
        label: "Rename",
        onSelect: () => openRenameDialog(item),
        renderIcon: () => <IconEdit className="size-4" />,
      },
      {
        key: "move",
        label: "Move",
        onSelect: () => openMoveDialog(item),
        renderIcon: () => <IconArrowsMove className="size-4" />,
      },
      {
        key: "info",
        label: "Info",
        onSelect: () => setDialog({ itemId: item.id, mode: "info" }),
        renderIcon: () => <IconInfoCircle className="size-4" />,
      },
      {
        destructive: true,
        key: "delete",
        label: "Delete",
        onSelect: () => setDialog({ itemId: item.id, mode: "delete" }),
        renderIcon: () => <IconTrash className="size-4" />,
        separatorBefore: true,
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
            <div key={action.key}>
              {action.separatorBefore ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                className={
                  action.destructive
                    ? "text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                    : undefined
                }
                onClick={action.onSelect}
              >
                {action.renderIcon()}
                {action.label}
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  function renderContextActions(actions: ItemAction[]) {
    return (
      <ContextMenuContent>
        {actions.map((action) => (
          <div key={action.key}>
            {action.separatorBefore ? <ContextMenuSeparator /> : null}
            <ContextMenuItem
              className={
                action.destructive
                  ? "text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                  : undefined
              }
              onClick={action.onSelect}
            >
              {action.renderIcon()}
              {action.label}
            </ContextMenuItem>
          </div>
        ))}
      </ContextMenuContent>
    );
  }

  function renderUserStatus(user: AdminUser) {
    if (isPendingApprovalUser(user)) {
      return <Badge variant="secondary">Pending approval</Badge>;
    }

    if (isRejectedUser(user)) {
      return <Badge variant="destructive">Rejected</Badge>;
    }

    if (user.banned) {
      return <Badge variant="destructive">Disabled</Badge>;
    }

    return <Badge variant="secondary">Active</Badge>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:flex-nowrap sm:py-0">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 sm:flex-nowrap">
            <BrandMark className="max-w-[11rem] sm:max-w-none" />
            <Separator className="hidden h-5! sm:block" orientation="vertical" />
            <nav className="flex items-center gap-1">
              <button
                className={buttonVariants({
                  size: "sm",
                  variant: activeTab === "library" ? "secondary" : "ghost",
                })}
                onClick={() => setActiveTab("library")}
                type="button"
              >
                Library
              </button>
              <button
                className={buttonVariants({
                  size: "sm",
                  variant: activeTab === "users" ? "secondary" : "ghost",
                })}
                onClick={() => setActiveTab("users")}
                type="button"
              >
                Students
              </button>
            </nav>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {activeTab === "library" ? (
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
                      fileInputRef.current?.click();
                    }}
                  >
                    <IconUpload className="size-4" />
                    Upload file
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      folderInputRef.current?.click();
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
          const nextFiles = Array.from(event.currentTarget.files ?? []);
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
          const nextFiles = Array.from(event.currentTarget.files ?? []);
          void uploadFiles(nextFiles, true);
        }}
        ref={folderInputRef}
        type="file"
      />

      <main
        aria-busy={isBusy || isUsersLoading}
        className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6"
      >
        <Card className="p-5">
          {activeTab === "library" ? (
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
                      ? "Matches are ranked by item name first, then by full library path."
                      : "Double-click folders to open them. Double-click PDFs to open the reader."}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {visibleItems.length} items
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review access requests, approve students, reject requests, or disable access.
                </p>
              </div>

              <div className="w-full max-w-md">
                <div className="relative">
                  <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    onChange={(event) => setUserSearchInput(event.currentTarget.value)}
                    placeholder="Search students by name or email"
                    value={userSearchInput}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {usersPage
                    ? `${usersPage.totalUsers} students • ${usersPage.pageSize} per page`
                    : deferredUserQuery
                      ? "Searching students…"
                      : "Students are shown 25 per page."}
                </p>
              </div>
            </div>
          )}
        </Card>

        {uploadProgress ? (
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Uploading content</p>
                  <p className="text-xs text-muted-foreground">
                    {uploadProgress.fileCount} item{uploadProgress.fileCount === 1 ? "" : "s"} in progress
                  </p>
                </div>
                <span className="text-sm font-medium tabular-nums">
                  {uploadProgress.percent}%
                </span>
              </div>
              <Progress value={uploadProgress.percent} />
            </div>
          </Card>
        ) : null}

        {!uploadProgress && isBusy ? (
          <Alert>
            <AlertTitle>Updating library</AlertTitle>
            <AlertDescription>
              Pilot360 LMS is saving your changes.
            </AlertDescription>
          </Alert>
        ) : null}

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {activeTab === "library" ? (
          visibleItems.length === 0 ? (
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
          )
        ) : (
          <Card className="p-0">
            {isUsersLoading && !usersPage ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                Loading students…
              </div>
            ) : (
              <>
                <div className="divide-y divide-border/50">
                  {studentUsers.length === 0 ? (
                    <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                      {deferredUserQuery
                        ? "No students match this search."
                        : "No students registered yet."}
                    </p>
                  ) : (
                    studentUsers.map((user) => {
                      const pending = isPendingApprovalUser(user);
                      const rejected = isRejectedUser(user);

                      return (
                        <div
                          className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between"
                          key={user.id}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium">{user.name}</p>
                              {renderUserStatus(user)}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Registered {formatDateTime(
                                typeof user.createdAt === "string"
                                  ? user.createdAt
                                  : user.createdAt?.toISOString?.() ?? null,
                              )}
                            </p>
                            {user.banReason ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {pending ? "Awaiting admin approval" : user.banReason}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {pending ? (
                              <>
                                <Button
                                  disabled={isBusy}
                                  onClick={() => void handleUserAction("approve-user", user.id)}
                                  size="sm"
                                  type="button"
                                >
                                  Approve
                                </Button>
                                <Button
                                  disabled={isBusy}
                                  onClick={() => void handleUserAction("reject-user", user.id)}
                                  size="sm"
                                  type="button"
                                  variant="destructive"
                                >
                                  Reject
                                </Button>
                              </>
                            ) : rejected ? (
                              <Button
                                disabled={isBusy}
                                onClick={() => void handleUserAction("approve-user", user.id)}
                                size="sm"
                                type="button"
                              >
                                Approve
                              </Button>
                            ) : !user.banned ? (
                              <Button
                                disabled={isBusy}
                                onClick={() => void handleUserAction("ban-user", user.id)}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                Ban
                              </Button>
                            ) : (
                              <Button
                                disabled={isBusy}
                                onClick={() => void handleUserAction("approve-user", user.id)}
                                size="sm"
                                type="button"
                              >
                                Unban
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {usersPage ? (
                  <div className="flex flex-col gap-3 border-t border-border/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Page {usersPage.page} of {usersPage.totalPages} • {usersPage.pageSize} per page
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        disabled={isUsersLoading || usersPage.page <= 1}
                        onClick={() => {
                          updateRouteState({
                            folderId: selectedFolderId,
                            openId,
                            q,
                            tab: "users",
                            userPage: Math.max(1, usersPage.page - 1),
                            userQ,
                          });
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <IconChevronLeft className="size-4" />
                        Previous
                      </Button>
                      <Button
                        disabled={isUsersLoading || usersPage.page >= usersPage.totalPages}
                        onClick={() => {
                          updateRouteState({
                            folderId: selectedFolderId,
                            openId,
                            q,
                            tab: "users",
                            userPage: Math.min(usersPage.totalPages, usersPage.page + 1),
                            userQ,
                          });
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Next
                        <IconChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </Card>
        )}
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
                onChange={(event) => setDraftName(event.currentTarget.value)}
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
                onChange={(event) => setDraftName(event.currentTarget.value)}
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
                className="h-9 w-full rounded-[4px] border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                onChange={(event) => setMoveParentId(event.currentTarget.value)}
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
              <Button
                disabled={isBusy}
                onClick={() => void handleDelete()}
                type="button"
                variant="destructive"
              >
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
