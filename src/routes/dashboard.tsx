import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { startTransition, useEffect, useState } from "react";

import type { StoredDocument } from "@/bucket/types";
import { BrandMark } from "@/components/brand-mark";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { getSession } from "@/lib/auth-session";
import { cn, formatBytes, formatDateTime, getInitials } from "@/lib/utils";

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

function isPdfDocument(name: string) {
  return name.toLowerCase().endsWith(".pdf");
}

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

  const user = session.user;
  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <BrandMark />
              <Separator className="hidden h-10 sm:block" orientation="vertical" />
              <div className="space-y-1">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.35em] text-orange-200/70">
                  Protected workspace
                </p>
                <p className="text-sm text-stone-400">Signed in as {user.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Card className="border-white/10 bg-black/15 shadow-none backdrop-blur-none">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xs bg-orange-500/12 font-semibold text-orange-100">
                    {getInitials(user.name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-stone-400">Memoir operator</p>
                  </div>
                </CardContent>
              </Card>

              <Button
                disabled={isSigningOut}
                onClick={() => {
                  void handleSignOut();
                }}
                type="button"
                variant="outline"
              >
                {isSigningOut ? "Signing out..." : "Sign out"}
              </Button>
            </div>
          </div>
        </Card>

        <section className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
          <Card className="relative overflow-hidden border-white/10 bg-[linear-gradient(145deg,rgba(61,13,13,0.88),rgba(214,75,20,0.62))] shadow-[0_30px_100px_rgba(0,0,0,0.32)] backdrop-blur-none">
            <div className="absolute -left-12 top-0 h-48 w-48 rounded-xs bg-black/20 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-56 w-56 rounded-xs bg-orange-100/10 blur-3xl" />

            <CardContent className="relative z-10 space-y-8 p-8">
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
                <Badge className="px-4 py-2 text-sm text-orange-50/85" variant="outline">
                  Reader access stays session controlled
                </Badge>
                <Badge className="px-4 py-2 text-sm text-orange-50/85" variant="outline">
                  Document uploads wait for review
                </Badge>
                <Badge className="px-4 py-2 text-sm text-orange-50/85" variant="outline">
                  Library material is faculty curated
                </Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {overviewStats.map((stat) => (
                  <Card
                    key={stat.label}
                    className="border-white/10 bg-black/16 shadow-none backdrop-blur-none"
                  >
                    <CardContent className="p-5">
                      <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-orange-100/65">
                        {stat.label}
                      </p>
                      <p className="mt-4 text-3xl font-semibold text-white">
                        {stat.value}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-orange-50/72">
                        {stat.detail}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="space-y-4 p-6">
            <Card className="border-white/10 bg-black/15 shadow-none backdrop-blur-none">
              <CardHeader className="p-5">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-orange-200/70">
                  Approval path
                </p>
                <CardTitle className="text-xl">
                  Shared dashboard now, role gates next.
                </CardTitle>
                <CardDescription>
                  The auth screens are live and protected. The next backend step is
                  mapping real user roles and approval states into the Better Auth
                  user model so student and faculty dashboards can diverge from
                  actual database state.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-white/10 bg-white/[0.03] shadow-none backdrop-blur-none">
              <CardHeader className="p-5 pb-0">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-orange-200/70">
                  Review checklist
                </p>
              </CardHeader>
              <CardContent className="space-y-3 p-5 pt-4">
                {reviewChecklist.map((item) => (
                  <Card
                    key={item}
                    className="border-white/8 bg-black/10 shadow-none backdrop-blur-none"
                  >
                    <CardContent className="px-4 py-3 text-sm leading-6 text-stone-300">
                      {item}
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <Card>
            <CardHeader className="flex flex-col gap-2 p-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-orange-200/70">
                  Reading room
                </p>
                <CardTitle className="mt-3">
                  Library cards ready for the reader layer
                </CardTitle>
              </div>
              <p className="text-sm text-stone-400">
                Catalog entries, progress, and publish status
              </p>
            </CardHeader>

            <CardContent className="grid gap-4 p-6 pt-0 md:grid-cols-2">
              {libraryShelf.map((item) => (
                <Card
                  key={item.title}
                  className="border-white/10 bg-black/14 shadow-none backdrop-blur-none"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-white">
                          {item.title}
                        </p>
                        <p className="mt-2 text-sm text-stone-400">{item.chapter}</p>
                      </div>
                      <Badge>{item.status}</Badge>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-stone-500">
                        <span>Progress</span>
                        <span>{item.progress}</span>
                      </div>
                      <Progress
                        className="mt-3"
                        value={Number.parseInt(item.progress, 10) || 0}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-6">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-orange-200/70">
                Document uploads
              </p>
              <CardTitle className="mt-3">
                Upload and review shared material
              </CardTitle>
              <CardDescription className="mt-2">
                Students and faculty can upload any document here. Right now the
                workspace is shared for authenticated users; role-aware review
                gating can sit on top of this storage layer next.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-6 pt-0">
              <form className="space-y-4" onSubmit={handleUpload}>
                <Card className="border-white/10 bg-black/14 shadow-none backdrop-blur-none">
                  <CardContent className="space-y-3 p-5">
                    <Label className="block space-y-3">
                      <span className="block text-sm font-medium text-white">
                        Choose a document to upload
                      </span>
                      <Input
                        className="h-auto cursor-pointer py-3 text-stone-200"
                        name="file"
                        onChange={(event) =>
                          setSelectedFile(event.currentTarget.files?.[0] ?? null)
                        }
                        type="file"
                      />
                    </Label>
                    <p className="text-sm text-stone-400">
                      Course packets, notes, reports, handouts, or review material
                      can all use the same authenticated upload path.
                    </p>
                    {selectedFile ? (
                      <Badge className="w-fit" variant="warm">
                        Selected: {selectedFile.name} · {formatBytes(selectedFile.size)}
                      </Badge>
                    ) : null}
                  </CardContent>
                </Card>

                <div className="flex flex-wrap gap-3">
                  <Button disabled={!selectedFile || isUploadingDocument} type="submit">
                    {isUploadingDocument ? "Uploading..." : "Upload document"}
                  </Button>
                  <Button
                    disabled={isLoadingDocuments}
                    onClick={() => {
                      void loadDocuments();
                    }}
                    type="button"
                    variant="outline"
                  >
                    {isLoadingDocuments ? "Refreshing..." : "Refresh uploads"}
                  </Button>
                </div>
              </form>

              {uploadMessage ? (
                <Alert variant="success">
                  <AlertDescription>{uploadMessage}</AlertDescription>
                </Alert>
              ) : null}

              {documentsError ? (
                <Alert variant="destructive">
                  <AlertDescription>{documentsError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-4">
                {isLoadingDocuments ? (
                  <Alert>
                    <AlertDescription>Loading uploaded documents...</AlertDescription>
                  </Alert>
                ) : null}

                {!isLoadingDocuments && documents.length === 0 ? (
                  <Alert>
                    <AlertDescription>No documents uploaded yet.</AlertDescription>
                  </Alert>
                ) : null}

                {!isLoadingDocuments
                  ? documents.map((document) => (
                      <Card
                        key={document.key}
                        className="border-white/10 bg-black/14 shadow-none backdrop-blur-none"
                      >
                        <CardContent className="p-5">
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
                            {isPdfDocument(document.name) ? (
                              <Link
                                className={cn(
                                  buttonVariants({ size: "sm", variant: "outline" }),
                                )}
                                search={{
                                  key: document.key,
                                  name: document.name,
                                }}
                                to="/reader"
                              >
                                Open reader
                              </Link>
                            ) : (
                              <Badge variant="outline">PDF viewer only</Badge>
                            )}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-400">
                            <Badge>{formatBytes(document.size)}</Badge>
                            <Badge>{formatDateTime(document.uploadedAt)}</Badge>
                            <Badge variant="warm">Authenticated upload</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  : null}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
