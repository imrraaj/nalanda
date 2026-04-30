import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { startTransition, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { CredentialField } from "@/components/auth/credential-field";
import { authClient } from "@/lib/auth-client";
import { getSession } from "@/lib/auth-session";

export const Route = createFileRoute("/students/sign-in")({
  beforeLoad: async () => {
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
      const result = await authClient.signIn.email({
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
      description="Continue to your Memoir workspace."
      footer={
        <p>
          New here?{" "}
          <Link to="/students/sign-up" className="text-orange-300 transition hover:text-orange-200">
            Create account
          </Link>
        </p>
      }
    >
      <form className="space-y-5" method="post" onSubmit={handleSubmit}>
        <CredentialField
          autoComplete="email"
          disabled={isSubmitting}
          label="Email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter your email"
          required
          type="email"
          value={email}
        />

        <CredentialField
          autoComplete="current-password"
          disabled={isSubmitting}
          label="Password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          required
          type="password"
          value={password}
        />

        {errorMessage ? (
          <div className="rounded-xs border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {errorMessage}
          </div>
        ) : null}

        <button
          className="w-full rounded-xs bg-white px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
