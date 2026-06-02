import {
  IconBan,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCircleCheck,
  IconFolder,
  IconKey,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { type FormEvent, type ReactNode, startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { ProfileMenu } from "@/components/profile-menu";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { signOut } from "@/lib/auth.actions";
import type { LibraryItemSummary } from "@/lib/library";
import { formatDateTime } from "@/lib/utils";
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

function normalizeStudentSearch(next: { page?: number | null; q?: string | null }) {
  const normalizedQuery = next.q?.trim();

  return {
    page: next.page && Number.isFinite(next.page) && next.page > 1 ? next.page : undefined,
    q: normalizedQuery || undefined,
  };
}

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

export const Route = createFileRoute("/admin/students")({
  validateSearch: (search: Record<string, unknown>) => {
    const page = (() => {
      const value =
        typeof search.page === "number"
          ? search.page
          : typeof search.page === "string"
            ? Number.parseInt(search.page, 10)
            : NaN;

      return Number.isFinite(value) && value > 1 ? value : undefined;
    })();

    return normalizeStudentSearch({
      page,
      q: typeof search.q === "string" ? search.q : undefined,
    });
  },
  beforeLoad: async () => {
    const { getSession } = await import("@/lib/auth.function");
    const session = await getSession();

    if (!session) {
      throw redirect({
        search: { redirectTo: "/admin/students" },
        to: "/login",
      });
    }

    if ((session.user as { role?: string }).role !== "admin") {
      throw redirect({
        search: { folderId: undefined, openId: undefined, q: undefined },
        to: "/dashboard",
      });
    }
  },
  loader: async () => {
    const { getSession } = await import("@/lib/auth.function");
    const session = await getSession();

    if (!session) {
      throw redirect({
        search: { redirectTo: "/admin/students" },
        to: "/login",
      });
    }

    if ((session.user as { role?: string }).role !== "admin") {
      throw redirect({
        search: { folderId: undefined, openId: undefined, q: undefined },
        to: "/dashboard",
      });
    }

    return {
      viewer: {
        name: session.user.name,
      },
    };
  },
  component: AdminStudentsPage,
});

function AdminStudentsPage() {
  const navigate = useNavigate();
  const { page, q } = Route.useSearch();
  const { viewer } = Route.useLoaderData();
  const currentPage = page ?? 1;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isFolderAccessLoading, setIsFolderAccessLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [folderAccessUser, setFolderAccessUser] = useState<AdminUser | null>(null);
  const [rootFolders, setRootFolders] = useState<LibraryItemSummary[]>([]);
  const [searchInput, setSearchInput] = useState(q ?? "");
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [usersPage, setUsersPage] = useState<AdminUsersPage | null>(null);
  const deferredQuery = useDeferredValue(searchInput.trim());
  const studentUsers = useMemo(() => usersPage?.users ?? [], [usersPage]);

  useEffect(() => {
    setSearchInput(q ?? "");
  }, [q]);

  useEffect(() => {
    if (searchInput === (q ?? "")) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void navigate({
        replace: true,
        search: normalizeStudentSearch({ page: 1, q: searchInput }),
        to: "/admin/students",
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [navigate, q, searchInput]);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMessage(null);

    void loadAdminUsersPage({
      data: {
        page: currentPage,
        q: q ?? "",
      },
    })
      .then((result) => {
        if (isCancelled) {
          return;
        }

        setUsersPage(result as AdminUsersPage);

        if (result.page !== currentPage) {
          void navigate({
            replace: true,
            search: normalizeStudentSearch({ page: result.page, q }),
            to: "/admin/students",
          });
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          const message = error instanceof Error ? error.message : "Unable to load students.";
          setErrorMessage(message);
          toast.error("Unable to load students", message);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currentPage, navigate, q]);

  function handleSignOut() {
    signOut().then(() => {
      startTransition(() => {
        void navigate({ to: "/" });
      });
    });
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
    options?: { onSuccess?: (payload: unknown) => Promise<void> | void },
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

      const payload = await response.json().catch(() => null);
      await options?.onSuccess?.(payload);
    } finally {
      setIsBusy(false);
    }
  }

  async function refreshUsers() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await loadAdminUsersPage({
        data: {
          page: currentPage,
          q: q ?? "",
        },
      });

      setUsersPage(result as AdminUsersPage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load students.";
      setErrorMessage(message);
      toast.error("Unable to load students", message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUserAction(action: "approve-user" | "ban-user" | "reject-user", user: AdminUser) {
    try {
      await postAdmin(
        {
          action,
          id: user.id,
        },
        { onSuccess: refreshUsers },
      );
      toast.success("Student updated", `${user.name}'s access has been updated.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "User update failed.";
      setErrorMessage(message);
      toast.error("Student update failed", message);
    }
  }

  async function handleResetUserPassword(user: AdminUser) {
    try {
      await postAdmin(
        {
          action: "reset-user-password",
          id: user.id,
        },
        {
          onSuccess: async (payload) => {
            await refreshUsers();
            const temporaryPassword =
              payload &&
              typeof payload === "object" &&
              "temporaryPassword" in payload &&
              typeof payload.temporaryPassword === "string"
                ? payload.temporaryPassword
                : "Student@123";

            toast.success(
              "Password reset",
              `${user.name}'s password is now ${temporaryPassword}. Ask the student to change it after signing in.`,
            );
          },
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Password reset failed.";
      setErrorMessage(message);
      toast.error("Password reset failed", message);
    }
  }

  async function handleDeleteUserAccount(user: AdminUser) {
    try {
      await postAdmin(
        {
          action: "delete-user",
          id: user.id,
        },
        { onSuccess: refreshUsers },
      );
      toast.success("Student deleted", `${user.name}'s account has been deleted.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete account failed.";
      setErrorMessage(message);
      toast.error("Delete account failed", message);
    }
  }

  async function handleOpenFolderAccess(user: AdminUser) {
    setFolderAccessUser(user);
    setRootFolders([]);
    setSelectedFolderIds([]);
    setIsFolderAccessLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/admin?resource=student-folder-access&studentId=${encodeURIComponent(user.id)}`,
      );

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const payload = (await response.json()) as {
        assignedFolderIds?: string[];
        folders?: LibraryItemSummary[];
      };

      setRootFolders(payload.folders ?? []);
      setSelectedFolderIds(payload.assignedFolderIds ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Folder access could not be loaded.";
      setErrorMessage(message);
      toast.error("Folder access failed", message);
      setFolderAccessUser(null);
    } finally {
      setIsFolderAccessLoading(false);
    }
  }

  async function handleSaveFolderAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!folderAccessUser) {
      return;
    }

    try {
      await postAdmin(
        {
          action: "set-student-folder-access",
          folderIds: selectedFolderIds,
          id: folderAccessUser.id,
        },
        { onSuccess: refreshUsers },
      );
      toast.success(
        "Folder access updated",
        `${folderAccessUser.name} can access ${selectedFolderIds.length} folder${selectedFolderIds.length === 1 ? "" : "s"}.`,
      );
      setFolderAccessUser(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Folder access could not be saved.";
      setErrorMessage(message);
      toast.error("Folder access failed", message);
    }
  }

  function toggleSelectedFolderId(folderId: string) {
    setSelectedFolderIds((current) =>
      current.includes(folderId)
        ? current.filter((id) => id !== folderId)
        : [...current, folderId],
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

    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:flex-nowrap sm:py-0">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 sm:flex-nowrap">
            <BrandMark className="max-w-44 sm:max-w-none" />
            <Separator className="hidden h-5! sm:block" orientation="vertical" />
            <nav className="flex items-center gap-1">
              <Link
                className={buttonVariants({ size: "sm", variant: "ghost" })}
                search={{
                  folderId: undefined,
                  openId: undefined,
                  q: undefined,
                  tab: undefined,
                  userPage: undefined,
                  userQ: undefined,
                }}
                to="/admin/dashboard"
              >
                Library
              </Link>
              <Link
                className={buttonVariants({ size: "sm", variant: "secondary" })}
                search={{ page: undefined, q: undefined }}
                to="/admin/students"
              >
                Students
              </Link>
            </nav>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <ProfileMenu name={viewer.name} onSignOut={handleSignOut} />
          </div>
        </div>
      </header>

      <main
        aria-busy={isBusy || isLoading}
        className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6"
      >
        <Card className="p-5">
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
                  onChange={(event) => setSearchInput(event.currentTarget.value)}
                  placeholder="Search students by name or email"
                  value={searchInput}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {usersPage
                  ? `${usersPage.totalUsers} students, ${usersPage.pageSize} per page`
                  : deferredQuery
                    ? "Searching students..."
                    : "Students are shown 25 per page."}
              </p>
            </div>
          </div>
        </Card>

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Card className="p-0">
          {isLoading && !usersPage ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Loading students...
            </div>
          ) : (
            <>
              <div className="divide-y divide-border/50">
                {studentUsers.length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                    {deferredQuery ? "No students match this search." : "No students registered yet."}
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
                              <ActionIconButton
                                disabled={isBusy}
                                label="Approve"
                                onClick={() => void handleUserAction("approve-user", user)}
                              >
                                <IconCheck className="size-4" />
                              </ActionIconButton>
                              <ActionIconButton
                                disabled={isBusy}
                                label="Reject"
                                onClick={() => void handleUserAction("reject-user", user)}
                                variant="destructive"
                              >
                                <IconX className="size-4" />
                              </ActionIconButton>
                            </>
                          ) : rejected ? (
                            <ActionIconButton
                              disabled={isBusy}
                              label="Approve"
                              onClick={() => void handleUserAction("approve-user", user)}
                            >
                              <IconCheck className="size-4" />
                            </ActionIconButton>
                          ) : !user.banned ? (
                            <ActionIconButton
                              disabled={isBusy}
                              label="Ban"
                              onClick={() => void handleUserAction("ban-user", user)}
                              variant="outline"
                            >
                              <IconBan className="size-4" />
                            </ActionIconButton>
                          ) : (
                            <ActionIconButton
                              disabled={isBusy}
                              label="Unban"
                              onClick={() => void handleUserAction("approve-user", user)}
                            >
                              <IconCircleCheck className="size-4" />
                            </ActionIconButton>
                          )}
                          {!pending && user.banned ? (
                            <ActionIconButton
                              disabled={isBusy}
                              label="Delete account"
                              onClick={() => void handleDeleteUserAccount(user)}
                              variant="destructive"
                            >
                              <IconTrash className="size-4" />
                            </ActionIconButton>
                          ) : !pending ? (
                            <>
                              {!user.banned ? (
                                <ActionIconButton
                                  disabled={isBusy}
                                  label="Folder access"
                                  onClick={() => void handleOpenFolderAccess(user)}
                                  variant="outline"
                                >
                                  <IconFolder className="size-4" />
                                </ActionIconButton>
                              ) : null}
                              <ActionIconButton
                                disabled={isBusy}
                                label="Forgot password"
                                onClick={() => void handleResetUserPassword(user)}
                                variant="outline"
                              >
                                <IconKey className="size-4" />
                              </ActionIconButton>
                            </>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {usersPage ? (
                <div className="flex flex-col gap-3 border-t border-border/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {usersPage.page} of {usersPage.totalPages}, {usersPage.pageSize} per page
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      disabled={isLoading || usersPage.page <= 1}
                      onClick={() => {
                        void navigate({
                          search: normalizeStudentSearch({
                            page: Math.max(1, usersPage.page - 1),
                            q,
                          }),
                          to: "/admin/students",
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
                      disabled={isLoading || usersPage.page >= usersPage.totalPages}
                      onClick={() => {
                        void navigate({
                          search: normalizeStudentSearch({
                            page: Math.min(usersPage.totalPages, usersPage.page + 1),
                            q,
                          }),
                          to: "/admin/students",
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
      </main>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setFolderAccessUser(null);
          }
        }}
        open={folderAccessUser !== null}
      >
        {folderAccessUser ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Folder access</DialogTitle>
              <DialogDescription>
                Assign root folders that {folderAccessUser.name} can see in the student library.
              </DialogDescription>
            </DialogHeader>
            <form className="mt-4" onSubmit={handleSaveFolderAccess}>
              {isFolderAccessLoading ? (
                <div className="rounded-[4px] border border-border px-3 py-8 text-center text-sm text-muted-foreground">
                  Loading folders...
                </div>
              ) : rootFolders.length === 0 ? (
                <div className="rounded-[4px] border border-border px-3 py-8 text-center text-sm text-muted-foreground">
                  No root folders are available.
                </div>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto rounded-[4px] border border-border p-2">
                  {rootFolders.map((folder) => (
                    <label
                      className="flex cursor-pointer items-center gap-3 rounded-[4px] px-2 py-2 text-sm hover:bg-muted/60"
                      key={folder.id}
                    >
                      <input
                        checked={selectedFolderIds.includes(folder.id)}
                        className="size-4 accent-primary"
                        onChange={() => toggleSelectedFolderId(folder.id)}
                        type="checkbox"
                      />
                      <span className="min-w-0 truncate">{folder.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <DialogFooter>
                <DialogDismiss>Cancel</DialogDismiss>
                <Button disabled={isBusy || isFolderAccessLoading} type="submit">
                  Save access
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function ActionIconButton({
  children,
  disabled,
  label,
  onClick,
  variant = "default",
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline";
}) {
  return (
    <span className="group relative inline-flex">
      <Button
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        size="icon-sm"
        title={label}
        type="button"
        variant={variant}
      >
        {children}
      </Button>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {label}
      </span>
    </span>
  );
}
