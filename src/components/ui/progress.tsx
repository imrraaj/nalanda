import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type ProgressProps = ComponentProps<"div"> & {
  value?: number;
};

function Progress({ className, value = 0, ...props }: ProgressProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      data-slot="progress"
      className={cn("h-2 w-full overflow-hidden rounded-xs bg-white/8", className)}
      {...props}
    >
      <div
        className="h-full rounded-xs bg-[linear-gradient(90deg,#fdba74,#f97316)] transition-[width] duration-300 ease-out"
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}

export { Progress };
