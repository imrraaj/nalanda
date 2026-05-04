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
        "inline-flex items-center gap-2 font-heading text-xl font-black tracking-tight text-white hover:opacity-90 transition-opacity",
        className,
      )}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[0.7rem] font-black text-primary-foreground">
        M
      </span>
      Memoir
    </Link>
  );
}
