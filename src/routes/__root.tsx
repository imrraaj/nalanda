/// <reference types="vite/client" />
import { Component, type ErrorInfo, type ReactNode } from "react";
import {
  Link,
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "@/styles/index.css?url";

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
        title: "Memoir",
      },
      {
        name: "theme-color",
        content: "#120808",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundPage,
});

function RootComponent() {
  return (
    <RootDocument>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html className="dark h-full" lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
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
          className="rounded-[4px] border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
          onClick={() => window.history.back()}
          type="button"
        >
          Go back
        </button>
        <Link
          className="rounded-[4px] bg-primary px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90"
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
