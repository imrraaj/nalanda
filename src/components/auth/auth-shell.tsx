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
    <main className="image min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-xs border border-white/12 bg-black/8 shadow-[0_40px_140px_rgba(0,0,0,0.45)] lg:grid-cols-[420px_minmax(0,1fr)]">
        <section className="flex flex-col justify-between bg-[linear-gradient(180deg,rgba(15,12,11,0.92),rgba(15,12,11,0.86))] p-8 sm:p-10">
          <div className="space-y-10">
            <BrandMark />

            <div className="space-y-4">
              <h1 className="text-balance text-4xl leading-none tracking-tight text-white sm:text-5xl">
                {title}
              </h1>
              <p className="max-w-sm text-sm leading-7 text-stone-400">
                {description}
              </p>
            </div>

            <div>{children}</div>
          </div>

          {footer ? <div className="pt-8 text-sm text-stone-400">{footer}</div> : null}
        </section>

        <section className="auth-background relative hidden lg:block" />
      </div>
    </main>
  );
}
