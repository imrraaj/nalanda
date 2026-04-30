import { Select as SelectPrimitive } from "@base-ui/react/select";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;

function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "inline-flex h-9 min-w-36 items-center justify-between gap-2 rounded-xs border border-white/10 bg-white/5 px-3 text-sm text-stone-100 outline-none transition focus-visible:border-orange-300/60 focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-orange-400/20 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
      <IconChevronDown className="size-4 shrink-0 text-stone-400" />
    </SelectPrimitive.Trigger>
  );
}

function SelectValue({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Value>) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("truncate", className)}
      {...props}
    />
  );
}

type SelectContentProps = Omit<
  ComponentProps<typeof SelectPrimitive.Positioner>,
  "children" | "className"
> & {
  children?: ComponentProps<typeof SelectPrimitive.Popup>["children"];
  className?: string;
};

function SelectContent({
  children,
  className,
  sideOffset = 6,
  ...props
}: SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        data-slot="select-positioner"
        sideOffset={sideOffset}
        {...props}
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "z-50 min-w-[var(--anchor-width)] overflow-hidden rounded-xs border border-white/10 bg-[#211a1a]/96 p-1 text-stone-100 shadow-[0_24px_64px_rgb(0_0_0_/_0.45)] backdrop-blur-xl",
            className,
          )}
        >
          <SelectPrimitive.List className="max-h-72 overflow-y-auto outline-none">
            {children}
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-xs px-3 py-2 text-sm text-stone-200 outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-white/10 data-[selected]:bg-orange-500/12 data-[selected]:text-orange-50",
        className,
      )}
      {...props}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <IconCheck className="size-3.5" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
