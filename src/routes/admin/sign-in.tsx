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
      badge="Faculty Control"
      title="Review access, curate material, keep the catalog clean."
      description="Admins and professors can use this entry point to process student approvals, review uploaded PDFs, and supervise the library surface that students eventually see."
      sceneLabel="Faculty Queue"
      sceneTitle="The moderation side of the same system."
      sceneDescription="This flow shares the current Better Auth credentials setup, while the dashboard already frames the faculty queues, review cadence, and protected reader model you described."
      highlights={[
        { label: "Approvals", value: "Student onboarding" },
        { label: "Review", value: "PDF moderation" },
        { label: "Catalog", value: "Faculty curated" },
      ]}
      footer={
        <div className="space-y-3 text-sm text-stone-400">
          <p>
            Student reader?{" "}
            <Link to="/students/sign-in" className="text-orange-300 transition hover:text-orange-200">
              Use student sign in
            </Link>
          </p>
          <p>
            Need a new student account page?{" "}
            <Link to="/students/sign-up" className="text-orange-300 transition hover:text-orange-200">
              Open student signup
            </Link>
          </p>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <CredentialField
          autoComplete="email"
          disabled={isSubmitting}
          label="Faculty email"
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
          <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {errorMessage}
          </div>
        ) : null}

        <button
          className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Signing in..." : "Sign in as faculty"}
        </button>
      </form>

      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-stone-300">
        Role-based enforcement is the next backend step. For now, this route gives you a separate faculty/admin entry experience on top of the working Better Auth credentials flow.
      </div>
    </AuthShell>
  );
}
