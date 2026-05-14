import { IconKey, IconLogout } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";

type ProfileMenuProps = {
  name?: string | null;
  onSignOut: () => void;
};

export function ProfileMenu({ name, onSignOut }: ProfileMenuProps) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open profile menu"
        className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
        type="button"
      >
        {getInitials(name)}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => void navigate({ to: "/change-password" })}>
          <IconKey className="size-4" />
          Change password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <IconLogout className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
