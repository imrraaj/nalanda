import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";

type AuthHighlight = {
  label: string;
  value: string;
};

type AuthShellProps = {
  badge: string;
  title: string;
  description: string;
  sceneLabel: string;
  sceneTitle: string;
  sceneDescription: string;
  highlights: AuthHighlight[];
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({
  badge,
  title,
  description,
  sceneLabel,
  sceneTitle,
  sceneDescription,
  highlights,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.04] shadow-[0_40px_140px_rgba(0,0,0,0.45)] backdrop-blur-sm lg:grid-cols-[420px_minmax(0,1fr)]">
        <section className="flex flex-col justify-between bg-[linear-gradient(180deg,rgba(8,8,8,0.96),rgba(8,8,8,0.82))] p-6 sm:p-8">
          <div className="space-y-8">
            <BrandMark />

            <div className="space-y-4">
              <span className="inline-flex rounded-full border border-orange-300/15 bg-orange-500/10 px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.28em] text-orange-200/80">
                {badge}
              </span>

              <div className="space-y-3">
                <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {title}
                </h1>
                <p className="max-w-sm text-sm leading-7 text-stone-400">
                  {description}
                </p>
              </div>
            </div>

            <div className="space-y-6">{children}</div>
          </div>

          {footer ? <div className="pt-8">{footer}</div> : null}
        </section>

        <section className="relative hidden overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(253,186,116,0.14),transparent_24%),linear-gradient(145deg,#3b0b0b_0%,#8a1a14_34%,#d24f16_68%,#64120f_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,7,7,0.02),rgba(8,7,7,0.45))]" />
          <div className="absolute -left-20 bottom-6 h-72 w-72 rounded-full bg-black/40 blur-3xl" />
          <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-orange-200/10 blur-3xl" />

          <div className="relative z-10 flex w-full flex-col justify-between p-10">
            <div className="flex justify-end">
              <span className="rounded-full border border-white/12 bg-black/10 px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.3em] text-orange-100/75">
                {sceneLabel}
              </span>
            </div>

            <div className="space-y-8">
              <div className="mx-auto flex w-full max-w-sm items-center justify-center">
                <div className="relative h-[27rem] w-[18rem]">
                  <div className="absolute inset-x-2 bottom-0 h-16 rounded-full bg-black/30 blur-2xl" />

                  <div className="relative mx-auto flex h-[22.5rem] w-[17rem] items-end justify-center rounded-[2.35rem] border border-white/15 bg-slate-900/78 p-5 shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
                    <div className="flex h-56 w-48 flex-col rounded-[1.4rem] border border-stone-700/70 bg-[#1b1d24] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <div className="rounded-[1.05rem] border border-stone-700 bg-[#efd07d] px-4 py-5 text-stone-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                        <div className="font-mono text-[0.68rem] uppercase tracking-[0.35em] text-stone-600">
                          Reader
                        </div>
                        <div className="mt-6 text-2xl font-semibold tracking-[0.26em]">
                          MEMOIR
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between px-1 font-mono text-[0.68rem] uppercase tracking-[0.28em] text-stone-500">
                        <span>Approve</span>
                        <span>Review</span>
                      </div>
                    </div>

                    <div className="absolute bottom-3 h-3 w-16 rounded-full bg-[#6a3029]" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.35em] text-orange-100/70">
                    {sceneTitle}
                  </p>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-orange-50/80">
                    {sceneDescription}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {highlights.map((highlight) => (
                    <div
                      key={highlight.label}
                      className="rounded-2xl border border-white/12 bg-black/16 p-4"
                    >
                      <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-orange-100/65">
                        {highlight.label}
                      </p>
                      <p className="mt-3 text-lg font-semibold text-white">
                        {highlight.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
