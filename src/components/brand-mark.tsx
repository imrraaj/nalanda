import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  muted?: boolean;
};

export function BrandMark({ className, muted = false }: BrandMarkProps) {
  return (
    <Link to="/" className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-2xl border text-[0.72rem] font-semibold uppercase tracking-[0.3em]",
          muted
            ? "border-stone-900/12 bg-stone-900/5 text-stone-900"
            : "border-orange-300/20 bg-orange-500/10 text-orange-200",
        )}
      >
        M
      </span>
      <span className="leading-none">
        <span
          className={cn(
            "block font-mono text-[0.68rem] uppercase tracking-[0.35em]",
            muted ? "text-stone-500" : "text-orange-200/75",
          )}
        >
          Moderated Library
        </span>
        <span
          className={cn(
            "mt-1 block text-lg font-semibold tracking-[0.18em]",
            muted ? "text-stone-900" : "text-stone-100",
          )}
        >
          Memoir
        </span>
      </span>
    </Link>
  );
}
