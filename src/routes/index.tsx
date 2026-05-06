import { Link, createFileRoute } from "@tanstack/react-router";

import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-75 w-75 rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <BrandMark className="mb-8 scale-115 sm:scale-125" />

        <Badge text="Aviation training library" />

        <h1 className="mt-5 max-w-xl font-heading text-4xl font-normal tracking-tight sm:text-5xl">
          <span className="bg-linear-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent">
            Read. Learn. Grow.
          </span>
        </h1>

        <p className="mt-4 max-w-md text-base text-muted-foreground">
          A curated library of pilot-training material, managed by instructors and accessible to students.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            className={buttonVariants({ className: "h-11 px-6 font-semibold", size: "lg" })}
            to="/dashboard"
          >
            Go to dashboard
          </Link>

          <div className="flex items-center gap-4 text-sm">
            <Link className="text-primary hover:underline" to="/login">
              Login
            </Link>
            <Link className="text-primary hover:underline" to="/signup">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      {text}
    </span>
  );
}
