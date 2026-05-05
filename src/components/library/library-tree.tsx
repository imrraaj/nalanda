import type { ReactNode } from "react";

import {
  IconChevronDown,
  IconChevronRight,
  IconFolder,
  IconFolders,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import {
  getLibraryChildren,
  type LibraryItemSummary,
} from "@/lib/library";

type LibraryTreeProps = {
  className?: string;
  expandedFolderIds: ReadonlySet<string>;
  items: LibraryItemSummary[];
  onSelectFolder: (folderId: string | null) => void;
  onToggleFolder: (folderId: string) => void;
  renderFolderMeta?: (folder: LibraryItemSummary) => ReactNode;
  selectedFolderId: string | null;
};

type FolderNodeProps = {
  depth: number;
  expandedFolderIds: ReadonlySet<string>;
  items: LibraryItemSummary[];
  onSelectFolder: (folderId: string | null) => void;
  onToggleFolder: (folderId: string) => void;
  renderFolderMeta?: (folder: LibraryItemSummary) => ReactNode;
  selectedFolderId: string | null;
  folder: LibraryItemSummary;
};

function FolderNode({
  depth,
  expandedFolderIds,
  items,
  onSelectFolder,
  onToggleFolder,
  renderFolderMeta,
  selectedFolderId,
  folder,
}: FolderNodeProps) {
  const childFolders = getLibraryChildren(items, folder.id).filter(
    (item) => item.kind === "folder",
  );
  const isExpanded = expandedFolderIds.has(folder.id);
  const isSelected = selectedFolderId === folder.id;

  return (
    <li>
      <div className="group flex items-center gap-1">
        <button
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
            isSelected && "bg-muted text-foreground",
          )}
          onClick={() => onSelectFolder(folder.id)}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          type="button"
        >
          <span className="flex size-4 items-center justify-center text-muted-foreground">
            {childFolders.length > 0 ? (
              isExpanded ? (
                <IconChevronDown
                  className="size-4"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleFolder(folder.id);
                  }}
                />
              ) : (
                <IconChevronRight
                  className="size-4"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleFolder(folder.id);
                  }}
                />
              )
            ) : null}
          </span>
          <IconFolder className="size-4 shrink-0 text-primary" />
          <span className="truncate">{folder.name}</span>
        </button>
        {renderFolderMeta ? (
          <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
            {renderFolderMeta(folder)}
          </div>
        ) : null}
      </div>

      {isExpanded && childFolders.length > 0 ? (
        <ul className="space-y-0.5">
          {childFolders.map((child) => (
            <FolderNode
              key={child.id}
              depth={depth + 1}
              expandedFolderIds={expandedFolderIds}
              folder={child}
              items={items}
              onSelectFolder={onSelectFolder}
              onToggleFolder={onToggleFolder}
              renderFolderMeta={renderFolderMeta}
              selectedFolderId={selectedFolderId}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function LibraryTree({
  className,
  expandedFolderIds,
  items,
  onSelectFolder,
  onToggleFolder,
  renderFolderMeta,
  selectedFolderId,
}: LibraryTreeProps) {
  const rootFolders = getLibraryChildren(items, null).filter(
    (item) => item.kind === "folder",
  );

  return (
    <div className={cn("space-y-2", className)}>
      <button
        className={cn(
          "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted",
          selectedFolderId === null && "bg-muted text-foreground",
        )}
        onClick={() => onSelectFolder(null)}
        type="button"
      >
        <IconFolders className="size-4 text-primary" />
        <span>Library</span>
      </button>

      {rootFolders.length === 0 ? (
        <p className="px-3 text-xs text-muted-foreground">No folders yet.</p>
      ) : (
        <ul className="space-y-0.5">
          {rootFolders.map((folder) => (
            <FolderNode
              key={folder.id}
              depth={0}
              expandedFolderIds={expandedFolderIds}
              folder={folder}
              items={items}
              onSelectFolder={onSelectFolder}
              onToggleFolder={onToggleFolder}
              renderFolderMeta={renderFolderMeta}
              selectedFolderId={selectedFolderId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
