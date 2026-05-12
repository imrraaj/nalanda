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
      <div className="flex w-full flex-col bg-background px-5 py-8 sm:px-8 lg:px-12 xl:w-120 xl:flex-none xl:px-14">
        <div className="mb-12 sm:mb-14">
          <BrandMark />
        </div>

        <div className="w-full max-w-md flex-1">
          <h1 className="font-heading text-[1.85rem] font-normal leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>

          <div className="mt-8">{children}</div>
        </div>

        {footer ? (
          <div className="mt-10 w-full max-w-md text-center text-sm text-muted-foreground">{footer}</div>
        ) : null}
      </div>

      <div className="auth-scene relative hidden flex-1 xl:block" />
    </div>
  );
}
