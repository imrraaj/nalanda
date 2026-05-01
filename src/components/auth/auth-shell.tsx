import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left form panel */}
      <div className="flex w-full flex-col bg-background px-8 py-10 sm:px-12 lg:w-120 lg:flex-none lg:px-14">
        <div className="mb-14">
          <BrandMark />
        </div>

        <div className="flex-1">
          <h1 className="font-heading text-[1.85rem] font-normal leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>

          <div className="mt-8">{children}</div>
        </div>

        {footer ? (
          <div className="mt-10 text-center text-sm text-muted-foreground">{footer}</div>
        ) : null}
      </div>

      {/* Right scenic gradient panel */}
      <div className="auth-scene relative hidden flex-1 lg:block" />
    </div>
  );
}
