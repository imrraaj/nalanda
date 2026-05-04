import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-screen">
      {/* ── Left form panel ── */}
      <div className="auth-panel relative flex w-full flex-col px-8 py-10 sm:px-12 lg:w-120 lg:flex-none lg:px-14">
        {/* Logo */}
        <div className="mb-16 lg:mb-20">
          <BrandMark />
        </div>

        {/* Form content */}
        <div className="flex-1">
          <h1 className="text-[2rem] font-semibold leading-tight tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-stone-500">{description}</p>

          <div className="mt-9">{children}</div>
        </div>

        {/* Footer */}
        {footer ? (
          <div className="mt-10 text-center text-sm text-stone-600">{footer}</div>
        ) : null}
      </div>

      {/* ── Right atmospheric scene ── */}
      <div className="auth-scene hidden flex-1 lg:block" />
    </div>
  );
}
