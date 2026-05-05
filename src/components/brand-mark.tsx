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
      <span className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-primary text-[0.65rem] font-black text-primary-foreground">
        M
      </span>
      Memoir
    </Link>
  );
}
