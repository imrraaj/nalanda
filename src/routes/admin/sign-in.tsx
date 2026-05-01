import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { startTransition, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth.client";
import { getSession } from "@/lib/auth.function";

export const Route = createFileRoute("/admin/sign-in")({
  beforeLoad: async () => {
    const session = await getSession();
    if (session) throw redirect({ to: "/admin/dashboard" });
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
      const result = await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) { setErrorMessage(result.error.message ?? "Invalid credentials."); return; }
      startTransition(() => { void navigate({ to: "/admin/dashboard" }); });
    } catch {
      setErrorMessage("Sign in unavailable. Try again shortly.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Faculty sign in"
      description="Access the Memoir dashboard to manage documents."
      footer={
        <p>
          Student?{" "}
          <Link to="/students/sign-in" className="text-primary hover:underline">Sign in here</Link>
        </p>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground" htmlFor="email">Email</label>
          <Input id="email" autoComplete="email" className="h-11 border-border bg-input text-foreground placeholder:text-muted-foreground/60" disabled={isSubmitting} onChange={(e) => setEmail(((e.currentTarget as unknown) as { value: string }).value)} placeholder="faculty@institution.edu" required type="email" value={email} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground" htmlFor="password">Password</label>
          <Input id="password" autoComplete="current-password" className="h-11 border-border bg-input text-foreground placeholder:text-muted-foreground/60" disabled={isSubmitting} onChange={(e) => setPassword(((e.currentTarget as unknown) as { value: string }).value)} placeholder="••••••••" required type="password" value={password} />
        </div>
        {errorMessage ? <Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert> : null}
        <Button className="mt-1 h-11 w-full font-semibold" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
