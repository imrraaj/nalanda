import type { ReactNode } from "react";

import {
  IconBook2,
  IconFileDescription,
  IconFileTypeJpg,
  IconFileTypePng,
  IconFolder,
} from "@tabler/icons-react";

import { Card } from "@/components/ui/card";
import { getLibraryItemKindLabel, type LibraryItemSummary } from "@/lib/library";

type LibraryItemTileProps = {
  detailText?: string;
  item: LibraryItemSummary;
  menu?: ReactNode;
  metaText?: string;
  onDoubleClick?: () => void;
};

function getTileIcon(item: Pick<LibraryItemSummary, "kind">) {
  switch (item.kind) {
    case "folder":
      return <IconFolder className="size-10 text-primary" />;
    case "jpeg":
      return <IconFileTypeJpg className="size-10 text-primary" />;
    case "png":
      return <IconFileTypePng className="size-10 text-primary" />;
    case "epub":
      return <IconBook2 className="size-10 text-primary" />;
    default:
      return <IconFileDescription className="size-10 text-primary" />;
  }
}

export function LibraryItemTile({
  detailText,
  item,
  menu,
  metaText,
  onDoubleClick,
}: LibraryItemTileProps) {
  return (
    <Card
      className="gap-0 rounded-[4px] py-0 transition-colors hover:bg-muted/20 data-[interactive=true]:cursor-pointer"
      data-interactive={onDoubleClick ? "true" : "false"}
      onDoubleClick={onDoubleClick}
    >
      <div className="flex aspect-[4/3] items-center justify-center border-b border-border/70 bg-muted/35 px-4">
        {getTileIcon(item)}
      </div>
      <div className="flex items-start justify-between gap-3 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {metaText ?? getLibraryItemKindLabel(item.kind)}
          </p>
          {detailText ? (
            <p className="mt-1 truncate text-xs text-muted-foreground/80" title={detailText}>
              {detailText}
            </p>
          ) : null}
        </div>
        {menu ? (
          <div
            className="shrink-0"
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            {menu}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
