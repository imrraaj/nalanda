import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { startTransition, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { CredentialField } from "@/components/auth/credential-field";
import { authClient } from "@/lib/auth-client";
import { getSession } from "@/lib/auth-session";

export const Route = createFileRoute("/admin/sign-in")({
  beforeLoad: async () => {
    const session = await getSession();

    if (session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminSignInPage,
});

function AdminSignInPage() {
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
      setErrorMessage("Faculty sign in failed. Try again shortly.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Faculty sign in"
      description="Sign in to review and manage Memoir."
      footer={
        <p>
          Student access?{" "}
          <Link to="/students/sign-in" className="text-orange-300 transition hover:text-orange-200">
            Student sign in
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
          placeholder="Enter your faculty email"
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
          {isSubmitting ? "Signing in..." : "Sign in as faculty"}
        </button>
      </form>
    </AuthShell>
  );
}
