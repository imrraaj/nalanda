/// <reference types="vite/client" />
import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from "react";
import {
  Link,
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";

import appCss from "@/styles/index.css?url";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Pilot360 LMS | Aviation Training Library",
      },
      {
        name: "description",
        content:
          "Pilot360 LMS is the training library for Pilot 360 students, instructor-led aviation study, DGCA preparation, and ground-school learning material.",
      },
      {
        name: "application-name",
        content: "Pilot360 LMS",
      },
      {
        name: "apple-mobile-web-app-title",
        content: "Pilot360 LMS",
      },
      {
        name: "theme-color",
        content: "#f6f9ff",
      },
      {
        name: "robots",
        content: "index, follow",
      },
      {
        name: "format-detection",
        content: "telephone=no",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:site_name",
        content: "Pilot360 LMS",
      },
      {
        property: "og:title",
        content: "Pilot360 LMS | Aviation Training Library",
      },
      {
        property: "og:description",
        content:
          "Pilot360 LMS is the training library for Pilot 360 students, instructor-led aviation study, DGCA preparation, and ground-school learning material.",
      },
      {
        property: "og:image",
        content: "/cessna.png",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: "Pilot360 LMS | Aviation Training Library",
      },
      {
        name: "twitter:description",
        content:
          "Pilot360 LMS is the training library for Pilot 360 students, instructor-led aviation study, DGCA preparation, and ground-school learning material.",
      },
      {
        name: "twitter:image",
        content: "/cessna.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/logo.webp" },
      { rel: "shortcut icon", href: "/logo.webp" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundPage,
});

function RootComponent() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const isNavigating = useRouterState({
    select: (state) =>
      state.status === "pending" || state.isLoading || state.isTransitioning,
  });

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return (
    <RootDocument isNavigating={hasHydrated && isNavigating}>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </RootDocument>
  );
}

function RootDocument({
  children,
  isNavigating,
}: Readonly<{ children: ReactNode; isNavigating: boolean }>) {
  return (
    <html className="h-full" lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div
          aria-hidden={!isNavigating}
          className="pointer-events-none fixed inset-x-0 top-0 z-100 h-0.5 overflow-hidden"
        >
          <div
            className={`h-full bg-primary transition-all duration-150 ${
              isNavigating ? "opacity-100" : "opacity-0"
            } ${isNavigating ? "w-[38%] animate-pulse" : "w-0"}`}
          />
        </div>
        {children}
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}

function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          404
        </p>
        <h1 className="font-heading text-3xl">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The page you requested does not exist or the link is no longer valid.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
          onClick={() => window.history.back()}
          type="button"
        >
          Go back
        </button>
        <Link
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90"
          to="/"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

type EBState = { hasError: boolean; error: Error | null };

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  override state: EBState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="font-heading text-2xl">Something went wrong</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
