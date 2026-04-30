import type { ComponentProps } from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva("w-full rounded-xs border px-4 py-3 text-sm", {
  variants: {
    variant: {
      default: "border-white/10 bg-black/14 text-stone-200",
      success: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
      destructive: "border-red-400/25 bg-red-500/10 text-red-100",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function Alert({
  className,
  variant,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: ComponentProps<"h5">) {
  return (
    <h5
      data-slot="alert-title"
      className={cn("font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn("leading-6", className)} {...props} />;
}

export { Alert, AlertDescription, AlertTitle };
