import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { startTransition, useEffect, useState } from "react";

import type { StoredDocument } from "@/bucket/types";
import { BrandMark } from "@/components/brand-mark";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/lib/auth.actions";
import { cn, formatBytes, formatDateTime, getInitials } from "@/lib/utils";

function isPdfDocument(name: string) {
  return name.toLowerCase().endsWith(".pdf");
}

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const { getSession } = await import("@/lib/auth.function");
    const session = await getSession();

    if (!session) {
      throw redirect({ to: "/students/sign-in" });
    }

    return { session };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { session } = Route.useRouteContext();
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadDocuments();
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      startTransition(() => {
        void navigate({ to: "/" });
      });
    } finally {
      setIsSigningOut(false);
    }
  }

  async function loadDocuments() {
    setIsLoadingDocuments(true);
    setDocumentsError(null);
    try {
      const response = await fetch("/api/uploads");
      const payload = (await response.json()) as {
        documents?: StoredDocument[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load documents.");
      setDocuments(payload.documents ?? []);
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : "Unable to load documents.");
    } finally {
      setIsLoadingDocuments(false);
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setDocumentsError("Choose a document before uploading.");
      return;
    }
    setIsUploadingDocument(true);
    setDocumentsError(null);
    setUploadMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await fetch("/api/uploads", { body: formData, method: "POST" });
      const payload = (await response.json()) as {
        document?: StoredDocument;
        error?: string;
      };
      if (!response.ok || !payload.document) throw new Error(payload.error ?? "Upload failed.");
      setDocuments((prev) => [payload.document!, ...prev.filter((d) => d.key !== payload.document?.key)]);
      setSelectedFile(null);
      setUploadMessage(`${payload.document.name} uploaded successfully.`);
      (event.target as unknown as { reset(): void }).reset();
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploadingDocument(false);
    }
  }

  const user = session.user;
  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <BrandMark />
            <Separator className="h-4 opacity-30" orientation="vertical" />
            <span className="hidden text-xs font-medium uppercase tracking-widest text-muted-foreground sm:block">
              Dashboard
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {getInitials(user.name)}
            </div>
            <span className="hidden max-w-35 truncate text-sm text-muted-foreground sm:block">
              {user.email}
            </span>
            <Button
              disabled={isSigningOut}
              onClick={() => void handleSignOut()}
              size="sm"
              variant="outline"
            >
              {isSigningOut ? "…" : "Sign out"}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        {/* ── Hero banner ── */}
        <div className="relative mb-8 overflow-hidden rounded-xl border border-white/8 bg-[linear-gradient(135deg,#1e0d06_0%,#3d1408_45%,#5a1d0b_70%,#2e0c06_100%)]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-8 right-12 h-48 w-64 rounded-full bg-orange-400/10 blur-3xl" />
          </div>
          <div className="relative z-10 px-7 py-7 sm:px-9 sm:py-8">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-primary/60">
              Memoir · Workspace
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Welcome back, {firstName}.
            </h1>
            <p className="mt-1 text-sm text-white/40">
              {documents.length > 0
                ? `${documents.length} document${documents.length !== 1 ? "s" : ""} in your library`
                : "No documents yet — upload one to get started."}
            </p>
          </div>
        </div>

        {/* ── Content grid ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Documents */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Library
              </h2>
              <Button
                disabled={isLoadingDocuments}
                onClick={() => void loadDocuments()}
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
              >
                {isLoadingDocuments ? "Loading…" : "Refresh"}
              </Button>
            </div>

            {documentsError ? (
              <Alert variant="destructive">
                <AlertDescription>{documentsError}</AlertDescription>
              </Alert>
            ) : null}

            {isLoadingDocuments ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-18 animate-pulse rounded-lg bg-muted/30" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 text-xl">
                  📂
                </div>
                <p className="text-sm text-muted-foreground">No documents yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.key}
                    className="group flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3.5 transition-colors hover:bg-card/80"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatBytes(doc.size)} · {formatDateTime(doc.uploadedAt)} ·{" "}
                        <span className="text-primary/70">
                          {doc.uploadedBy === user.id ? "you" : "other"}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isPdfDocument(doc.name) ? (
                        <Link
                          className={cn(buttonVariants({ size: "sm", variant: "outline" }), "h-7 text-xs")}
                          search={{ key: doc.key, name: doc.name }}
                          to="/reader"
                        >
                          Open
                        </Link>
                      ) : (
                        <Badge variant="secondary" className="text-xs font-normal">
                          PDF only
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Upload panel */}
          <aside>
            <div className="sticky top-20 rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Upload
              </h2>
              <form className="space-y-4" onSubmit={handleUpload}>
                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-medium uppercase tracking-widest text-stone-500"
                    htmlFor="file-upload"
                  >
                    Document
                  </label>
                  <Input
                    className="h-10 cursor-pointer border-white/10 bg-white/5 text-sm text-muted-foreground file:text-primary"
                    id="file-upload"
                    name="file"
                    onChange={(e) => setSelectedFile((e.target as HTMLInputElement).files?.[0] ?? null)}
                    type="file"
                  />
                </div>

                {selectedFile ? (
                  <p className="text-xs text-muted-foreground">
                    {selectedFile.name} · {formatBytes(selectedFile.size)}
                  </p>
                ) : null}

                <Button
                  className="w-full"
                  disabled={!selectedFile || isUploadingDocument}
                  type="submit"
                >
                  {isUploadingDocument ? "Uploading…" : "Upload document"}
                </Button>
              </form>

              {uploadMessage ? (
                <p className="mt-3 text-xs text-primary">{uploadMessage}</p>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
