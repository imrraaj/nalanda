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
  const [rememberMe, setRememberMe] = useState(true);
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
        rememberMe,
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
      badge="Student Portal"
      title="Return to your moderated library."
      description="Continue reading approved material, track upload reviews, and move back into the Memoir reader without exposing raw PDF downloads."
      sceneLabel="Reader Workspace"
      sceneTitle="A calmer front door for students."
      sceneDescription="The student path stays intentionally narrow: sign in, open approved material, upload coursework for review, and keep progress inside the controlled reader."
      highlights={[
        { label: "Catalog", value: "Approved only" },
        { label: "Uploads", value: "Review tracked" },
        { label: "Reader", value: "Session based" },
      ]}
      footer={
        <div className="space-y-3 text-sm text-stone-400">
          <p>
            New student?{" "}
            <Link to="/students/sign-up" className="text-orange-300 transition hover:text-orange-200">
              Create your account
            </Link>
          </p>
          <p>
            Faculty or admin?{" "}
            <Link to="/admin/sign-in" className="text-orange-300 transition hover:text-orange-200">
              Use faculty sign in
            </Link>
          </p>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <CredentialField
          autoComplete="email"
          disabled={isSubmitting}
          label="Email address"
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

        <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-stone-300">
          <input
            checked={rememberMe}
            className="h-4 w-4 rounded border-white/15 bg-white/5 accent-orange-400"
            disabled={isSubmitting}
            onChange={(event) => setRememberMe(event.target.checked)}
            type="checkbox"
          />
          <span>Keep this session active on this device.</span>
        </label>

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
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-stone-300">
        Approved students can read from the shared catalog, while new submissions stay visible only after faculty review.
      </div>
    </AuthShell>
  );
}
