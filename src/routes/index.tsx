import { Link, createFileRoute } from "@tanstack/react-router";

import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-44 bg-primary/8" />
        <div className="absolute left-0 top-0 h-full w-full bg-[linear-gradient(rgb(35_83_171_/_0.04)_1px,transparent_1px),linear-gradient(90deg,rgb(35_83_171_/_0.04)_1px,transparent_1px)] bg-size-[28px_28px]" />
      </div>

      <header className="relative z-10 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <BrandMark />
          <nav className="flex w-full flex-col gap-2 text-sm sm:w-auto sm:flex-row sm:items-center">
            <a className="rounded-[4px] px-3 py-2 text-primary hover:bg-muted" href="#programs">
              Programs
            </a>
            <a className="rounded-[4px] px-3 py-2 text-primary hover:bg-muted" href="#support">
              Student support
            </a>
            <a className="rounded-[4px] px-3 py-2 text-primary hover:bg-muted" href="#contact">
              Contact
            </a>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid min-h-[calc(100vh-73px)] w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-18">
          <div>
            <Badge text="Pilot360 training library" />

            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Flight training material for students preparing with Pilot 360.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Access instructor-managed study material for DGCA preparation, ground school, simulator practice, flight training, and the steps toward becoming an airline pilot.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className={buttonVariants({ className: "h-11 px-6 font-semibold", size: "lg" })}
                to="/dashboard"
              >
                Go to dashboard
              </Link>
              <Link
                className={buttonVariants({ className: "h-11 px-6", size: "lg", variant: "outline" })}
                to="/login"
              >
                Student login
              </Link>
            </div>
          </div>

          <div className="grid gap-3 rounded-[8px] border border-border bg-card p-4 shadow-md sm:grid-cols-2 lg:grid-cols-1">
            {[
              ["17+ years", "DGCA-approved aviation training experience from Pilot 360."],
              ["Global locations", "Training pathways connected to USA, India, Europe, Canada, Australia, New Zealand, and South Africa."],
              ["Complete guidance", "Support from career counselling and DGCA medicals through exams, flight school selection, and license conversion."],
            ].map(([title, text]) => (
              <div className="rounded-[4px] bg-muted/70 p-4" key={title}>
                <p className="text-lg font-semibold text-primary">{title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border/70 bg-card" id="programs">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <Badge text="Training coverage" />
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                Material aligned with Pilot 360 programs.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Pilot 360 offers ground school, simulator training, DGCA support, type rating guidance, aviation English, aptitude preparation, and license conversion assistance.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "DGCA CPL ground classes",
                "ATPL ground classes",
                "RTR(A) classes",
                "Flight simulator training",
                "DGCA medicals and computer number",
                "Airline preparation and psychometric training",
              ].map((item) => (
                <div className="rounded-[4px] border border-border bg-background p-4 text-sm font-medium text-foreground" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-3" id="support">
          {[
            ["Structured study", "Instructor-led resources help students move from basic aviation concepts to exam-ready preparation."],
            ["Simulator readiness", "Practice material supports cockpit familiarization, communication, navigation, and confidence before aircraft training."],
            ["Career pathway", "Content supports the wider Pilot 360 journey: counselling, flight training, type rating, license conversion, and airline readiness."],
          ].map(([title, text]) => (
            <article className="rounded-[8px] border border-border bg-card p-5 shadow-sm" key={title}>
              <h3 className="text-lg font-semibold text-primary">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
            </article>
          ))}
        </section>

        <section className="bg-primary text-primary-foreground" id="contact">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Need access to the library?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-primary-foreground/80">
                Create a student account or contact Pilot 360 at connect@pilot360.co for training and enrollment support.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link className={buttonVariants({ className: "h-10 bg-white px-5 text-primary hover:bg-white/90", variant: "secondary" })} to="/signup">
                Create account
              </Link>
              <a className={buttonVariants({ className: "h-10 border-white/35 px-5 text-white hover:bg-white/10", variant: "outline" })} href="mailto:connect@pilot360.co">
                Email Pilot 360
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      {text}
    </span>
  );
}
