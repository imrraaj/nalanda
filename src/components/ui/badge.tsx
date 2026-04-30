import type { ComponentProps } from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-xs border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-white/5 text-stone-200",
        outline: "border-white/12 bg-black/12 text-stone-200",
        warm: "border-orange-300/16 bg-orange-500/10 text-orange-100/85",
        success: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
        destructive: "border-red-400/25 bg-red-500/10 text-red-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
