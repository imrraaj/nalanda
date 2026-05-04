import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { startTransition, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInWithEmail } from "@/lib/auth.actions";

export const Route = createFileRoute("/students/sign-in")({
  beforeLoad: async () => {
    const { getSession } = await import("@/lib/auth.function");
    const session = await getSession();

    if (session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: StudentSignInPage,
});

function StudentSignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await signInWithEmail({
        email: email.trim(),
        password,
        rememberMe: true,
      });

      if (result.error) {
        setErrorMessage(result.error.message);
        return;
      }

      startTransition(() => {
        void navigate({ to: "/dashboard" });
      });
    } catch {
      setErrorMessage("Student sign in failed. Try again shortly.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      description="Welcome back. Enter your credentials to continue."
      footer={
        <p>
          Don't have an account?{" "}
          <Link to="/students/sign-up" className="text-primary transition hover:brightness-110">
            Create one
          </Link>
        </p>
      }
    >
      <form className="space-y-5" method="post" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-widest text-stone-500" htmlFor="email">
            Email
          </label>
          <Input
            autoComplete="email"
            className="h-11 border-white/10 bg-white/5 text-white placeholder:text-stone-600 focus-visible:border-primary/60 focus-visible:ring-primary/20"
            disabled={isSubmitting}
            id="email"
            name="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-widest text-stone-500" htmlFor="password">
            Password
          </label>
          <Input
            autoComplete="current-password"
            className="h-11 border-white/10 bg-white/5 text-white placeholder:text-stone-600 focus-visible:border-primary/60 focus-visible:ring-primary/20"
            disabled={isSubmitting}
            id="password"
            name="password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            type="password"
            value={password}
          />
        </div>

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          className="mt-2 h-11 w-full text-sm font-semibold"
          disabled={isSubmitting}
          size="lg"
          type="submit"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
