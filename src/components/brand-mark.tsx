import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  muted?: boolean;
};

export function BrandMark({ className, muted = false }: BrandMarkProps) {
  return (
    <Link to="/" className={cn("font-heading font-black inline-flex items-center gap-3", className)}>
      Memoir
    </Link>
  );
}
