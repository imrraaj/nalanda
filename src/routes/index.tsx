import { Link, createFileRoute } from "@tanstack/react-router";

import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const workflowCards = [
  {
    title: "Student onboarding",
    copy: "Signup stays simple, but access can be held behind approval before the reader opens.",
  },
  {
    title: "Faculty review queue",
    copy: "Every uploaded document has a moderation lane before it becomes visible to the wider cohort.",
  },
  {
    title: "Protected reading room",
    copy: "Material is shaped for a controlled reader surface instead of default file downloads.",
  },
];

const readerPreview = [
  { label: "Active readers", value: "124" },
  { label: "Pending reviews", value: "11" },
  { label: "Published documents", value: "34" },
];

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden p-0 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex flex-col gap-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <BrandMark />

                  <div className="flex flex-wrap gap-3">
                    <Link
                      className={buttonVariants({ size: "sm", variant: "outline" })}
                      to="/students/sign-in"
                    >
                      Student sign in
                    </Link>
                    <Link
                      className={buttonVariants({ size: "sm", variant: "outline" })}
                      to="/admin/sign-in"
                    >
                      Faculty sign in
                    </Link>
                  </div>
                </header>

                <div className="space-y-5 pt-8">
                  <Badge
                    className="px-4 py-2 font-mono text-[0.72rem] uppercase tracking-[0.3em] text-orange-200/80"
                    variant="warm"
                  >
                    LMS Reading Room
                  </Badge>

                  <div className="space-y-4">
                    <h1 className="text-balance max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                      Moderated student access, curated documents, and a cleaner LMS library surface.
                    </h1>
                    <p className="max-w-2xl text-base leading-8 text-stone-400">
                      Memoir is structured around approval-first accounts,
                      faculty-reviewed uploads, and a protected reading
                      interface. Students request access, professors approve the
                      flow, and only reviewed material reaches the shared
                      catalog.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link className={buttonVariants({ size: "lg" })} to="/students/sign-up">
                      Create student account
                    </Link>
                    <Link
                      className={buttonVariants({ size: "lg", variant: "outline" })}
                      to="/dashboard"
                    >
                      Open dashboard
                    </Link>
                  </div>
                </div>

                <div className="grid gap-4 pt-6 md:grid-cols-3">
                  {readerPreview.map((item) => (
                    <Card
                      key={item.label}
                      className="border-white/10 bg-black/16 shadow-none backdrop-blur-none"
                    >
                      <CardContent className="p-5">
                        <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-orange-200/70">
                          {item.label}
                        </p>
                        <p className="mt-4 text-3xl font-semibold text-white">
                          {item.value}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative min-h-[26rem] overflow-hidden border-t border-white/10 lg:border-t-0 lg:border-l">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(253,186,116,0.16),transparent_22%),linear-gradient(145deg,#33090a_0%,#a52516_40%,#d45016_72%,#661310_100%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.08),rgba(5,5,5,0.45))]" />
              <div className="absolute left-8 top-8 h-56 w-56 rounded-xs bg-black/28 blur-3xl" />
              <div className="absolute -bottom-10 right-8 h-72 w-72 rounded-xs bg-orange-200/10 blur-3xl" />

              <div className="relative z-10 flex h-full flex-col justify-between p-8 sm:p-10">
                <div className="flex justify-end">
                  <Badge
                    className="px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.3em] text-orange-50/75"
                    variant="outline"
                  >
                    Guided Access
                  </Badge>
                </div>

                <div className="mx-auto flex w-full max-w-sm items-center justify-center">
                  <div className="relative h-[24rem] w-[18rem]">
                    <div className="absolute inset-x-2 bottom-0 h-16 rounded-xs bg-black/30 blur-2xl" />
                    <Card className="relative mx-auto flex h-[20rem] w-[16rem] items-end justify-center border-white/15 bg-slate-900/80 p-5 shadow-[0_35px_110px_rgba(0,0,0,0.45)] backdrop-blur-none">
                      <Card className="flex h-52 w-44 flex-col border-stone-700/70 bg-[#1b1d24] p-4 shadow-none backdrop-blur-none">
                        <div className="rounded-xs border border-stone-700 bg-[#efd07d] px-4 py-5 text-stone-900">
                          <div className="font-mono text-[0.68rem] uppercase tracking-[0.35em] text-stone-600">
                            Reader
                          </div>
                          <div className="mt-6 text-2xl font-semibold tracking-[0.24em]">
                            MEMOIR
                          </div>
                        </div>
                        <div className="mt-auto flex items-center justify-between px-1 font-mono text-[0.68rem] uppercase tracking-[0.26em] text-stone-500">
                          <span>Review</span>
                          <span>Publish</span>
                        </div>
                      </Card>
                      <div className="absolute bottom-3 h-3 w-16 rounded-xs bg-[#6a3029]" />
                    </Card>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-orange-50/70">
                    Product direction
                  </p>
                  <p className="max-w-lg text-sm leading-7 text-orange-50/80">
                    Use separate student and faculty entry points, funnel every
                    upload through review, then publish only approved material
                    into the shared reading room.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader className="p-6 sm:p-8">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-orange-200/70">
                Core workflow
              </p>
            </CardHeader>

            <CardContent className="grid gap-4 p-6 pt-0 sm:p-8 sm:pt-0 md:grid-cols-3">
              {workflowCards.map((card) => (
                <Card
                  key={card.title}
                  className="border-white/10 bg-black/14 shadow-none backdrop-blur-none"
                >
                  <CardHeader className="p-5">
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                    <CardDescription>{card.copy}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-6 sm:p-8">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-orange-200/70">
                Ready now
              </p>
              <CardTitle className="mt-2">
                Separate auth entry points plus a protected dashboard scaffold.
              </CardTitle>
              <CardDescription>
                This first pass gives you student signup, student sign in, admin
                sign in, and a protected dashboard with the right visual
                direction. The next natural step is real role and approval status
                persistence on the user model.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      </div>
    </main>
  );
}
