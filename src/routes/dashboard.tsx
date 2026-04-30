import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { startTransition, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { authClient } from "@/lib/auth-client";
import { getSession } from "@/lib/auth-session";
import { getInitials } from "@/lib/utils";

const overviewStats = [
  {
    label: "Enrollment queue",
    value: "18",
    detail: "Students waiting for faculty approval",
  },
  {
    label: "Uploads in review",
    value: "07",
    detail: "PDF submissions not yet shared to the library",
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

const uploadQueue = [
  {
    name: "Laplace Transform Cheatsheet.pdf",
    owner: "Uploaded by Arya B.",
    state: "Awaiting professor review",
  },
  {
    name: "Digital Systems Reading Pack.pdf",
    owner: "Uploaded by Mehul S.",
    state: "Marked for metadata cleanup",
  },
  {
    name: "Heat Transfer Notes.pdf",
    owner: "Uploaded by Nandini P.",
    state: "Approved for catalog publishing",
  },
];

const reviewChecklist = [
  "Approve or reject new student accounts before reader access opens.",
  "Verify uploaded PDFs for formatting, metadata, and publication readiness.",
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
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  const user = session.user;
  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
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
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 px-3 py-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/12 font-semibold text-orange-100">
                {getInitials(user.name)}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-stone-400">Memoir operator</p>
              </div>
            </div>

            <button
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-stone-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
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
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(61,13,13,0.88),rgba(214,75,20,0.62))] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.32)]">
            <div className="absolute -left-12 top-0 h-48 w-48 rounded-full bg-black/20 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-orange-100/10 blur-3xl" />

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
                    access requests, faculty approval lanes, protected PDF
                    reading, and upload moderation before anything reaches the
                    shared catalog.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                <span className="rounded-full border border-white/12 bg-black/12 px-4 py-2 text-orange-50/85">
                  Reader access stays session controlled
                </span>
                <span className="rounded-full border border-white/12 bg-black/12 px-4 py-2 text-orange-50/85">
                  Student uploads wait for review
                </span>
                <span className="rounded-full border border-white/12 bg-black/12 px-4 py-2 text-orange-50/85">
                  Library material is faculty curated
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {overviewStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[1.75rem] border border-white/10 bg-black/16 p-5"
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

          <aside className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-sm">
            <div className="rounded-[1.75rem] border border-white/10 bg-black/15 p-5">
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

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-orange-200/70">
                Review checklist
              </p>
              <div className="mt-4 space-y-3">
                {reviewChecklist.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/8 bg-black/10 px-4 py-3 text-sm leading-6 text-stone-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-orange-200/70">
                  Reading room
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  Library cards ready for the PDF reader layer
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
                  className="rounded-[1.75rem] border border-white/10 bg-black/14 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {item.title}
                      </p>
                      <p className="mt-2 text-sm text-stone-400">{item.chapter}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-stone-300">
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-stone-500">
                      <span>Progress</span>
                      <span>{item.progress}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/8">
                      <div
                        className="h-2 rounded-full bg-[linear-gradient(90deg,#fdba74,#f97316)]"
                        style={{ width: item.progress }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-sm">
            <div>
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-orange-200/70">
                Upload review queue
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Pending material
              </h2>
              <p className="mt-2 text-sm leading-7 text-stone-400">
                Student PDFs can land here first, then move to approved library
                inventory after professor review.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {uploadQueue.map((item) => (
                <div
                  key={item.name}
                  className="rounded-[1.75rem] border border-white/10 bg-black/14 p-5"
                >
                  <p className="text-base font-semibold text-white">{item.name}</p>
                  <p className="mt-2 text-sm text-stone-400">{item.owner}</p>
                  <div className="mt-4 inline-flex rounded-full border border-orange-300/16 bg-orange-500/10 px-3 py-1 text-xs text-orange-100/85">
                    {item.state}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
