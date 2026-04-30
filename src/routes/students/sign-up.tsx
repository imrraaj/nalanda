import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { startTransition, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { CredentialField } from "@/components/auth/credential-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { getSession } from "@/lib/auth-session";
import { deriveNameFromEmail } from "@/lib/utils";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await authClient.signUp.email({
        name: deriveNameFromEmail(email),
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
      title="Create account"
      description="Sign up to request access to Memoir."
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/students/sign-in" className="text-orange-300 transition hover:text-orange-200">
            Sign in
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
          autoComplete="new-password"
          disabled={isSubmitting}
          label="Password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a password"
          required
          type="password"
          value={password}
        />

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
