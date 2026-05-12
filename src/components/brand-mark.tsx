import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex min-w-0 items-center gap-2.5 font-heading text-base font-bold tracking-tight text-foreground transition-opacity hover:opacity-80 sm:text-lg",
        className,
      )}
    >
      <img
        alt="Pilot360 LMS"
        aria-hidden="true"
        className="h-7 w-7 shrink-0 rounded-lg"
        src="/logo.webp"
      />
      <span className="truncate">Pilot360 LMS</span>
    </Link>
  );
}
