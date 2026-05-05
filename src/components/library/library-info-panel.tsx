import { Button } from "@/components/ui/button";
import {
  getLibraryBreadcrumbs,
  getLibraryChildren,
  getLibraryItemKindLabel,
  type LibraryItemSummary,
} from "@/lib/library";
import { formatBytes, formatDateTime } from "@/lib/utils";

type LibraryInfoPanelProps = {
  item: LibraryItemSummary | null;
  items: LibraryItemSummary[];
  onClose?: () => void;
};

export function LibraryInfoPanel({
  item,
  items,
  onClose,
}: LibraryInfoPanelProps) {
  if (!item) {
    return null;
  }

  const location = getLibraryBreadcrumbs(items, item.parentId)
    .map((part) => part.name)
    .join(" / ");
  const childCount =
    item.kind === "folder" ? getLibraryChildren(items, item.id).length : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Info
          </p>
          <h2 className="mt-2 text-lg font-semibold">{item.name}</h2>
        </div>
        {onClose ? (
          <Button onClick={onClose} size="xs" type="button" variant="ghost">
            Close
          </Button>
        ) : null}
      </div>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Type</dt>
          <dd className="mt-1">{getLibraryItemKindLabel(item.kind)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Location</dt>
          <dd className="mt-1">{location || "Root"}</dd>
        </div>
        {typeof childCount === "number" ? (
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Contains</dt>
            <dd className="mt-1">{childCount} items</dd>
          </div>
        ) : null}
        {typeof item.size === "number" ? (
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Size</dt>
            <dd className="mt-1">{formatBytes(item.size)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Created</dt>
          <dd className="mt-1">{formatDateTime(item.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Updated</dt>
          <dd className="mt-1">{formatDateTime(item.updatedAt)}</dd>
        </div>
      </dl>
    </div>
  );
}
