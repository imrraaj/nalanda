"use client";

import { ContextMenu } from "@base-ui/react/context-menu";

import { cn } from "@/lib/utils";

const ContextMenuRoot = ContextMenu.Root;
const ContextMenuTrigger = ContextMenu.Trigger;

function ContextMenuContent({
  className,
  sideOffset = 6,
  ...props
}: ContextMenu.Popup.Props & Pick<ContextMenu.Positioner.Props, "sideOffset">) {
  return (
    <ContextMenu.Portal>
      <ContextMenu.Positioner className="z-50" sideOffset={sideOffset}>
        <ContextMenu.Popup
          className={cn(
            "min-w-44 rounded-[4px] border border-border bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/5 outline-none",
            className,
          )}
          {...props}
        />
      </ContextMenu.Positioner>
    </ContextMenu.Portal>
  );
}

function ContextMenuItem({ className, ...props }: ContextMenu.Item.Props) {
  return (
    <ContextMenu.Item
      className={cn(
        "flex cursor-default items-center gap-2 rounded-[4px] px-2.5 py-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-muted data-[highlighted]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function ContextMenuSeparator({
  className,
  ...props
}: ContextMenu.Separator.Props) {
  return (
    <ContextMenu.Separator
      className={cn("my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRoot,
  ContextMenuSeparator,
  ContextMenuTrigger,
};
