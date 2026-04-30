import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xs border border-white/10 bg-white/5 px-4 py-3 text-sm text-stone-50 outline-none transition duration-200 placeholder:text-stone-500 focus-visible:border-orange-300/60 focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-orange-400/20 disabled:cursor-not-allowed disabled:opacity-60 file:mr-4 file:rounded-xs file:border-0 file:bg-orange-500/15 file:px-4 file:py-2 file:text-sm file:font-medium file:text-orange-100",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
