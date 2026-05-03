import { Link, createFileRoute } from "@tanstack/react-router";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

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
        <BrandMark className="mb-8 scale-125" />

        <Badge text="Academic document platform" />

        <h1 className="mt-5 max-w-xl font-heading text-4xl font-normal tracking-tight sm:text-5xl">
          <span className="bg-linear-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent">
            Read. Learn. Grow.
          </span>
        </h1>

        <p className="mt-4 max-w-md text-base text-muted-foreground">
          A curated library of academic material — managed by faculty, accessible to students.
        </p>

        <div className="mt-8 flex gap-3">
          <Button size="lg" className="h-11 px-6 font-semibold">
            <Link to="/login">Log in</Link>
          </Button>
          <Button variant="outline" size="lg" className="h-11 px-6">
            <Link to="/signup">Create account</Link>
          </Button>
        </div>

        {/* Feature pills */}
        <div className="mt-12 flex flex-wrap justify-center gap-2">
          {["PDF Reader", "Faculty Uploads", "Student Access", "Secure Auth"].map((f) => (
            <span key={f} className="border border-border/60 bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              {f}
            </span>
          ))}
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
