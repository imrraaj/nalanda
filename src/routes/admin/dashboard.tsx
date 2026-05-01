import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { startTransition, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth.client";
import { getSession } from "@/lib/auth.function";
import { formatBytes, getInitials } from "@/lib/utils";
import { loadAdminDashboardData } from "@/routes/admin/-dashboard.function";

export const Route = createFileRoute("/admin/dashboard")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: "/admin/sign-in" });
    if (session.user.role !== "admin") throw redirect({ to: "/dashboard" });
  },
  loader: async () => loadAdminDashboardData(),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { data: sessionData } = authClient.useSession();
  const { users, documents } = Route.useLoaderData();
  const [tab, setTab] = useState<"users" | "documents">("documents");

  async function adminAction(action: string, id: string) {
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id }),
    });

    if (!response.ok) {
      throw new Error("Admin action failed.");
    }

    await router.invalidate({ sync: true });
  }

  function handleSignOut() {
    authClient.signOut().then(() => { startTransition(() => { void navigate({ to: "/" }); }); });
  }

  const user = sessionData?.user;
  const pendingUsers = users.filter((u) => u.banned && u.role !== "admin");
  const pendingDocs = documents.filter((d) => d.status === "pending");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <BrandMark />
            <Separator orientation="vertical" className="!h-5" />
            <span className="text-sm text-muted-foreground">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {getInitials(user.name)}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign out</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="font-heading text-2xl font-normal tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Approve students and manage document submissions.</p>

        {/* Tabs */}
        <div className="mt-6 flex gap-1 border-b border-border/50">
          <button
            type="button"
            onClick={() => setTab("documents")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === "documents" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Documents {pendingDocs.length > 0 && <Badge variant="secondary" className="ml-1.5">{pendingDocs.length}</Badge>}
          </button>
          <button
            type="button"
            onClick={() => setTab("users")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === "users" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Students {pendingUsers.length > 0 && <Badge variant="secondary" className="ml-1.5">{pendingUsers.length}</Badge>}
          </button>
        </div>

        {/* Content */}
        <div className="mt-6">
          {tab === "users" && (
            <div className="divide-y divide-border/40">
              {users.filter((u) => u.role !== "admin").length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No students registered yet.</p>
              ) : (
                users.filter((u) => u.role !== "admin").map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!u.banned ? (
                        <>
                          <Badge variant="secondary">Active</Badge>
                          <Button size="sm" variant="outline" onClick={() => adminAction("ban-user", u.id)}>Ban</Button>
                        </>
                      ) : (
                        <>
                          <Badge variant="destructive">Banned</Badge>
                          <Button size="sm" onClick={() => adminAction("approve-user", u.id)}>Unban</Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "documents" && (
            <div className="divide-y divide-border/40">
              {documents.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No documents uploaded yet.</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(doc.size)} · {doc.status}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={doc.status === "approved" ? "secondary" : doc.status === "rejected" ? "destructive" : "default"}>
                        {doc.status}
                      </Badge>
                      {doc.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => adminAction("approve-document", doc.id)}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => adminAction("reject-document", doc.id)}>Reject</Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => adminAction("delete-document", doc.id)}>Delete</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
