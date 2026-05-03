import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth.client";
import { deriveNameFromEmail } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
});

function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await authClient.signUp.email({
        email: email.trim(),
        name: deriveNameFromEmail(email),
        password,
      });

      if (result?.error) {
        setErrorMessage(result.error.message ?? "Sign up failed.");
        return;
      }

      setSuccess(true);
    } catch {
      setErrorMessage("Sign up unavailable. Try again shortly.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <AuthShell
        title="Account created"
        description="Your account is pending admin approval. You'll be able to sign in once approved."
        footer={
          <p>
            <Link to="/login" className="text-primary hover:underline">Back to sign in</Link>
          </p>
        }
      >
        <div className="border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
          An administrator will review your request shortly.
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create account"
      description="Create a student account to request access to the Memoir library."
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground" htmlFor="email">Email</label>
          <Input id="email" autoComplete="email" className="h-11 border-border bg-input text-foreground placeholder:text-muted-foreground/60" disabled={isSubmitting} onChange={(e) => setEmail(((e.currentTarget as unknown) as { value: string }).value)} placeholder="you@example.com" required type="email" value={email} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground" htmlFor="password">Password</label>
          <Input id="password" autoComplete="new-password" className="h-11 border-border bg-input text-foreground placeholder:text-muted-foreground/60" disabled={isSubmitting} onChange={(e) => setPassword(((e.currentTarget as unknown) as { value: string }).value)} placeholder="Create a password" required type="password" value={password} />
        </div>
        {errorMessage ? <Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert> : null}
        <Button className="mt-1 h-11 w-full font-semibold" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
