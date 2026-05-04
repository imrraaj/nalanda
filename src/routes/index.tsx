import { Link, createFileRoute } from "@tanstack/react-router";

import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-150 w-150 rounded-full bg-primary/10 blur-[140px]" />
        <div className="absolute -bottom-24 right-0 h-125 w-125 rounded-full bg-primary/8 blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between border-b border-border px-6 py-4 sm:px-10">
        <BrandMark />
        <div className="flex items-center gap-2">
          <Link
            className={buttonVariants({ size: "sm", variant: "ghost" })}
            to="/students/sign-in"
          >
            Sign in
          </Link>
          <Link
            className={buttonVariants({ size: "sm" })}
            to="/students/sign-up"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-24 text-center sm:px-10">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-primary/80">
            LMS Reading Platform
          </span>
        </div>

        <h1 className="max-w-2xl text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          A protected space for{" "}
          <span className="bg-linear-to-r from-primary via-orange-400 to-amber-300 bg-clip-text text-transparent">
            curated reading.
          </span>
        </h1>

        <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
          Students request access. Faculty review and publish. Documents stay protected inside a session-controlled reader.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link className={buttonVariants({ size: "lg" })} to="/students/sign-up">
            Create student account
          </Link>
          <Link
            className={buttonVariants({ size: "lg", variant: "outline" })}
            to="/admin/sign-in"
          >
            Faculty sign in
          </Link>
        </div>

        {/* Feature pills */}
        <div className="mt-14 flex flex-wrap justify-center gap-2">
          {["Approval-gated access", "Faculty-reviewed uploads", "Session-protected reader"].map((f) => (
            <span
              key={f}
              className="rounded-full border border-border bg-card px-3.5 py-1 text-xs text-muted-foreground"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}