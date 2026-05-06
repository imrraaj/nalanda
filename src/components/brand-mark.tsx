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
        "inline-flex items-center gap-2.5 font-heading text-lg font-bold tracking-tight text-foreground transition-opacity hover:opacity-80",
        className,
      )}
    >
      <img
        alt="Pilot360 LMS"
        aria-hidden="true"
        className="h-7 w-7 rounded-lg"
        src="/favicon.svg"
      />
      Pilot360 LMS
    </Link>
  );
}
