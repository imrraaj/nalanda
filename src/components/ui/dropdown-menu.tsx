"use client";

import { Menu } from "@base-ui/react/menu";

import { cn } from "@/lib/utils";

const DropdownMenu = Menu.Root;
const DropdownMenuTrigger = Menu.Trigger;

function DropdownMenuContent({
  align = "end",
  className,
  sideOffset = 6,
  ...props
}: Menu.Popup.Props & Pick<Menu.Positioner.Props, "align" | "sideOffset">) {
  return (
    <Menu.Portal>
      <Menu.Positioner align={align} className="z-50" sideOffset={sideOffset}>
        <Menu.Popup
          className={cn(
            "min-w-44 rounded-[4px] border border-border bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/5 outline-none",
            className,
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  );
}

function DropdownMenuItem({
  className,
  ...props
}: Menu.Item.Props) {
  return (
    <Menu.Item
      className={cn(
        "flex cursor-default items-center gap-2 rounded-[4px] px-2.5 py-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-muted data-[highlighted]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: Menu.Separator.Props) {
  return (
    <Menu.Separator
      className={cn("my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
