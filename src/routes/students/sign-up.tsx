import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { startTransition, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { CredentialField } from "@/components/auth/credential-field";
import { authClient } from "@/lib/auth-client";
import { getSession } from "@/lib/auth-session";

export const Route = createFileRoute("/students/sign-up")({
  beforeLoad: async () => {
    const session = await getSession();

    if (session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: StudentSignUpPage,
});

function StudentSignUpPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!acceptedTerms) {
      setErrorMessage("Accept the terms to continue with student registration.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (result.error) {
        setErrorMessage(result.error.message);
        return;
      }

      startTransition(() => {
        void navigate({ to: "/dashboard" });
      });
    } catch {
      setErrorMessage("Student signup is unavailable right now. Try again shortly.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      badge="Student Access"
      title="Create your reading room account."
      description="Students can request access, upload material for faculty review, and join the moderated PDF library once their account is approved."
      sceneLabel="Approval Pipeline"
      sceneTitle="Curated access, not open downloads."
      sceneDescription="Memoir is designed around moderated enrollment, faculty-reviewed uploads, and a controlled reading interface so your LMS library stays structured from day one."
      highlights={[
        { label: "Enrollment", value: "Faculty reviewed" },
        { label: "PDF access", value: "Reader only" },
        { label: "Uploads", value: "Queued approval" },
      ]}
      footer={
        <div className="space-y-3 text-sm text-stone-400">
          <p>
            Already have an account?{" "}
            <Link to="/students/sign-in" className="text-orange-300 transition hover:text-orange-200">
              Sign in
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
          autoComplete="name"
          disabled={isSubmitting}
          label="Full name"
          name="name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter your name"
          required
          value={name}
        />

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
          autoComplete="new-password"
          disabled={isSubmitting}
          hint="Minimum 8 characters"
          label="Password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a password"
          required
          type="password"
          value={password}
        />

        <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-stone-300">
          <input
            checked={acceptedTerms}
            className="mt-1 h-4 w-4 rounded border-white/15 bg-white/5 accent-orange-400"
            disabled={isSubmitting}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            type="checkbox"
          />
          <span>
            I agree to the terms, privacy policy, and moderated content review process.
          </span>
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
          {isSubmitting ? "Creating account..." : "Create student account"}
        </button>
      </form>

      <div className="rounded-2xl border border-orange-300/12 bg-orange-500/8 p-4 text-sm leading-6 text-orange-100/85">
        New student accounts are ready for your approval workflow. Once you add role and status fields to the user model, this screen can plug straight into enforced review gates.
      </div>
    </AuthShell>
  );
}
