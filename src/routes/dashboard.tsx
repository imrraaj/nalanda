import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { startTransition, useEffect, useState } from "react";

import type { StoredDocument } from "@/bucket/types";
import { BrandMark } from "@/components/brand-mark";
import { authClient } from "@/lib/auth-client";
import { getSession } from "@/lib/auth-session";
import { formatBytes, formatDateTime, getInitials } from "@/lib/utils";

const overviewStats = [
  {
    label: "Enrollment queue",
    value: "18",
    detail: "Students waiting for faculty approval",
  },
  {
    label: "Uploads in review",
    value: "07",
    detail: "Document submissions not yet shared to the library",
  },
  {
    label: "Published texts",
    value: "34",
    detail: "Curated material available in the reader",
  },
];

const libraryShelf = [
  {
    title: "Linear Algebra Reader",
    chapter: "Chapter 4 · Vector spaces",
    progress: "68%",
    status: "In progress",
  },
  {
    title: "Signals & Systems Notes",
    chapter: "Unit 2 · Frequency domain",
    progress: "41%",
    status: "Faculty approved",
  },
  {
    title: "Research Methods Handbook",
    chapter: "Section 1 · Annotation tools",
    progress: "88%",
    status: "Pinned by faculty",
  },
  {
    title: "Intro to Thermodynamics",
    chapter: "Module 3 · Closed systems",
    progress: "23%",
    status: "New release",
  },
];

const reviewChecklist = [
  "Approve or reject new student accounts before reader access opens.",
  "Verify uploaded documents for formatting, metadata, and publication readiness.",
  "Publish only approved material into the shared, non-downloadable library.",
];

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
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
  const [isOpeningDocumentKey, setIsOpeningDocumentKey] = useState<string | null>(null);
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
      await authClient.signOut();
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

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load documents.");
      }

      setDocuments(payload.documents ?? []);
    } catch (error) {
      setDocumentsError(
        error instanceof Error ? error.message : "Unable to load documents.",
      );
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

      const response = await fetch("/api/uploads", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json()) as {
        document?: StoredDocument;
        error?: string;
      };

      if (!response.ok || !payload.document) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      setDocuments((current) => [
        payload.document!,
        ...current.filter((document) => document.key !== payload.document?.key),
      ]);
      setSelectedFile(null);
      setUploadMessage(`${payload.document.name} uploaded successfully.`);
      event.currentTarget.reset();
    } catch (error) {
      setDocumentsError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploadingDocument(false);
    }
  }

  async function handleOpenDocument(key: string) {
    setIsOpeningDocumentKey(key);
    setDocumentsError(null);

    try {
      const response = await fetch(`/api/uploads?key=${encodeURIComponent(key)}`);
      const payload = (await response.json()) as {
        error?: string;
        url?: string;
      };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Unable to generate document link.");
      }

      window.open(payload.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setDocumentsError(
        error instanceof Error ? error.message : "Unable to open document.",
      );
    } finally {
      setIsOpeningDocumentKey(null);
    }
  }

  const user = session.user;
  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-xs border border-white/10 bg-white/[0.04] px-6 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <BrandMark />
            <span className="hidden h-10 w-px bg-white/10 sm:block" />
            <div className="space-y-1">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.35em] text-orange-200/70">
                Protected workspace
              </p>
              <p className="text-sm text-stone-400">
                Signed in as {user.email}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-xs border border-white/10 bg-black/15 px-3 py-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xs bg-orange-500/12 font-semibold text-orange-100">
                {getInitials(user.name)}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-stone-400">Memoir operator</p>
              </div>
            </div>

            <button
              className="rounded-xs border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-stone-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSigningOut}
              onClick={() => {
                void handleSignOut();
              }}
              type="button"
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
          <div className="relative overflow-hidden rounded-xs border border-white/10 bg-[linear-gradient(145deg,rgba(61,13,13,0.88),rgba(214,75,20,0.62))] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.32)]">
            <div className="absolute -left-12 top-0 h-48 w-48 rounded-xs bg-black/20 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-56 w-56 rounded-xs bg-orange-100/10 blur-3xl" />

            <div className="relative z-10 space-y-8">
              <div className="space-y-4">
                <p className="font-mono text-xs uppercase tracking-[0.35em] text-orange-100/75">
                  Moderated library dashboard
                </p>
                <div className="space-y-3">
                  <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                    Welcome back, {firstName}.
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-orange-50/80 sm:text-base">
                    This dashboard frames the workflow you described: student
                    access requests, faculty approval lanes, protected reading,
                    and document moderation before anything reaches the
                    shared catalog.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                <span className="rounded-xs border border-white/12 bg-black/12 px-4 py-2 text-orange-50/85">
                  Reader access stays session controlled
                </span>
                <span className="rounded-xs border border-white/12 bg-black/12 px-4 py-2 text-orange-50/85">
                  Document uploads wait for review
                </span>
                <span className="rounded-xs border border-white/12 bg-black/12 px-4 py-2 text-orange-50/85">
                  Library material is faculty curated
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {overviewStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xs border border-white/10 bg-black/16 p-5"
                  >
                    <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-orange-100/65">
                      {stat.label}
                    </p>
                    <p className="mt-4 text-3xl font-semibold text-white">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-orange-50/72">
                      {stat.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4 rounded-xs border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-sm">
            <div className="rounded-xs border border-white/10 bg-black/15 p-5">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-orange-200/70">
                Approval path
              </p>
              <h2 className="mt-3 text-xl font-semibold text-white">
                Shared dashboard now, role gates next.
              </h2>
              <p className="mt-3 text-sm leading-7 text-stone-400">
                The auth screens are live and protected. The next backend step is
                mapping real user roles and approval states into the Better Auth
                user model so student and faculty dashboards can diverge from
                actual database state.
              </p>
            </div>

            <div className="rounded-xs border border-white/10 bg-white/[0.03] p-5">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-orange-200/70">
                Review checklist
              </p>
              <div className="mt-4 space-y-3">
                {reviewChecklist.map((item) => (
                  <div
                    key={item}
                    className="rounded-xs border border-white/8 bg-black/10 px-4 py-3 text-sm leading-6 text-stone-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-xs border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-orange-200/70">
                  Reading room
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  Library cards ready for the reader layer
                </h2>
              </div>
              <p className="text-sm text-stone-400">
                Catalog entries, progress, and publish status
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {libraryShelf.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xs border border-white/10 bg-black/14 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {item.title}
                      </p>
                      <p className="mt-2 text-sm text-stone-400">{item.chapter}</p>
                    </div>
                    <span className="rounded-xs border border-white/10 bg-white/5 px-3 py-1 text-xs text-stone-300">
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-stone-500">
                      <span>Progress</span>
                      <span>{item.progress}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-xs bg-white/8">
                      <div
                        className="h-2 rounded-xs bg-[linear-gradient(90deg,#fdba74,#f97316)]"
                        style={{ width: item.progress }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xs border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-sm">
            <div>
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-orange-200/70">
                Document uploads
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Upload and review shared material
              </h2>
              <p className="mt-2 text-sm leading-7 text-stone-400">
                Students and faculty can upload any document here. Right now the
                workspace is shared for authenticated users; role-aware review
                gating can sit on top of this storage layer next.
              </p>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleUpload}>
              <label className="block space-y-3 rounded-xs border border-white/10 bg-black/14 p-5">
                <span className="text-sm font-medium text-white">
                  Choose a document to upload
                </span>
                <input
                  className="block w-full rounded-xs border border-white/10 bg-white/5 px-4 py-3 text-sm text-stone-200 file:mr-4 file:rounded-xs file:border-0 file:bg-orange-500/15 file:px-4 file:py-2 file:text-sm file:font-medium file:text-orange-100"
                  name="file"
                  onChange={(event) =>
                    setSelectedFile(event.currentTarget.files?.[0] ?? null)
                  }
                  type="file"
                />
                <p className="text-sm text-stone-400">
                  Course packets, notes, reports, handouts, or review material
                  can all use the same authenticated upload path.
                </p>
                {selectedFile ? (
                  <p className="text-sm text-orange-100/85">
                    Selected: {selectedFile.name} · {formatBytes(selectedFile.size)}
                  </p>
                ) : null}
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-xs bg-white px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!selectedFile || isUploadingDocument}
                  type="submit"
                >
                  {isUploadingDocument ? "Uploading..." : "Upload document"}
                </button>
                <button
                  className="rounded-xs border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-stone-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoadingDocuments}
                  onClick={() => {
                    void loadDocuments();
                  }}
                  type="button"
                >
                  {isLoadingDocuments ? "Refreshing..." : "Refresh uploads"}
                </button>
              </div>
            </form>

            {uploadMessage ? (
              <div className="mt-4 rounded-xs border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {uploadMessage}
              </div>
            ) : null}

            {documentsError ? (
              <div className="mt-4 rounded-xs border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {documentsError}
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              {isLoadingDocuments ? (
                <div className="rounded-xs border border-white/10 bg-black/14 p-5 text-sm text-stone-400">
                  Loading uploaded documents...
                </div>
              ) : null}

              {!isLoadingDocuments && documents.length === 0 ? (
                <div className="rounded-xs border border-dashed border-white/12 bg-black/10 p-5 text-sm text-stone-400">
                  No documents uploaded yet.
                </div>
              ) : null}

              {!isLoadingDocuments
                ? documents.map((document) => (
                    <div
                      key={document.key}
                      className="rounded-xs border border-white/10 bg-black/14 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-base font-semibold text-white">
                            {document.name}
                          </p>
                          <p className="mt-2 text-sm text-stone-400">
                            Uploaded by{" "}
                            {document.uploadedBy === user.id
                              ? "you"
                              : document.uploadedBy ?? "unknown user"}
                          </p>
                        </div>
                        <button
                          className="rounded-xs border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-stone-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isOpeningDocumentKey === document.key}
                          onClick={() => {
                            void handleOpenDocument(document.key);
                          }}
                          type="button"
                        >
                          {isOpeningDocumentKey === document.key
                            ? "Opening..."
                            : "Open link"}
                        </button>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-400">
                        <span className="rounded-xs border border-white/10 bg-white/5 px-3 py-1">
                          {formatBytes(document.size)}
                        </span>
                        <span className="rounded-xs border border-white/10 bg-white/5 px-3 py-1">
                          {formatDateTime(document.uploadedAt)}
                        </span>
                        <span className="rounded-xs border border-orange-300/16 bg-orange-500/10 px-3 py-1 text-orange-100/85">
                          Authenticated upload
                        </span>
                      </div>
                    </div>
                  ))
                : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
