import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { startTransition, useEffect, useState } from "react";

import type { StoredDocument } from "@/bucket/s3-storage";
import { BrandMark } from "@/components/brand-mark";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth.client";
import { getSession } from "@/lib/auth.function";
import { formatBytes, formatDateTime, getInitials } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { data: sessionData } = authClient.useSession();
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/uploads")
      .then((r) => r.json())
      .then((data) => {
        const payload = data as { documents?: StoredDocument[] };
        setDocuments(payload.documents ?? []);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadFile) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        setUploadError(payload.error ?? "Upload failed.");
        return;
      }
      const { document: newDoc } = (await res.json()) as { document: StoredDocument };
      setDocuments((prev) => [newDoc, ...prev]);
      setUploadFile(null);
    } catch { setUploadError("Upload failed."); } finally { setIsUploading(false); }
  }

  function handleSignOut() {
    authClient.signOut().then(() => { startTransition(() => { void navigate({ to: "/" }); }); });
  }

  const user = sessionData?.user;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <BrandMark />
            <Separator orientation="vertical" className="h-5!" />
            <span className="text-sm text-muted-foreground">Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            {user && (user as any).role === "admin" && (
              <Link to="/admin/dashboard" className="text-xs text-primary hover:underline">Admin Panel</Link>
            )}
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
        {/* Hero */}
        <div className="mb-8 border-b border-border/50 bg-linear-to-br from-primary/5 via-background to-background pb-6">
          <h1 className="font-heading text-2xl font-normal tracking-tight">Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage and upload documents to the Memoir library.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Document list */}
          <section>
            <h2 className="mb-4 text-lg font-semibold">Documents</h2>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse bg-muted/30" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="border border-dashed border-border/60 p-10 text-center">
                <p className="text-sm text-muted-foreground">No documents yet. Upload your first PDF.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {documents.map((doc) => {
                  const isPdf = doc.contentType === "application/pdf" || doc.name.toLowerCase().endsWith(".pdf");
                  const ext = doc.name.split(".").pop()?.toUpperCase() ?? "FILE";
                  if (isPdf) {
                    return (
                      <Link
                        key={doc.key}
                        to="/reader"
                        search={{ key: doc.key, name: doc.name }}
                        className="flex items-center justify-between border-border/40 bg-card px-4 py-3 transition-colors hover:bg-accent/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(doc.size)} · {formatDateTime(doc.uploadedAt)}</p>
                        </div>
                        <Badge variant="secondary" className="ml-3 shrink-0">PDF</Badge>
                      </Link>
                    );
                  }
                  return (
                    <a
                      key={doc.key}
                      href={`/api/documents/content?key=${encodeURIComponent(doc.key)}&download=1`}
                      download={doc.name}
                      className="flex items-center justify-between border-border/40 bg-card px-4 py-3 transition-colors hover:bg-accent/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(doc.size)} · {formatDateTime(doc.uploadedAt)}</p>
                      </div>
                      <Badge variant="secondary" className="ml-3 shrink-0">{ext}</Badge>
                    </a>
                  );
                })}
              </div>
            )}
          </section>

          {/* Upload panel */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="border border-border/50 bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Upload document</h3>
              <form onSubmit={handleUpload} className="space-y-3">
                <Input
                  type="file"
                  accept=".pdf"
                  className="h-11 border-border bg-input text-sm file:text-muted-foreground"
                  onChange={(e) => {
                    const input = e.currentTarget as HTMLInputElement & {
                      files?: ArrayLike<File> | null;
                    };
                    setUploadFile(input.files?.[0] ?? null);
                  }}
                />
                {uploadError && <Alert variant="destructive"><AlertDescription>{uploadError}</AlertDescription></Alert>}
                <Button className="w-full" disabled={!uploadFile || isUploading} type="submit">
                  {isUploading ? "Uploading…" : "Upload PDF"}
                </Button>
              </form>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
