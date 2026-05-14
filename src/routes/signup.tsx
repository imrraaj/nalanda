import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { signUpWithEmail } from "@/lib/auth.actions";

export const Route = createFileRoute("/signup")({
  beforeLoad: async () => {
    const { getSession } = await import("@/lib/auth.function");
    const session = await getSession();

    if (session) {
      throw redirect({
        search: { folderId: undefined, openId: undefined, q: undefined },
        to: "/dashboard",
      });
    }
  },
  component: SignUpPage,
});

function SignUpPage() {
  const [fullName, setFullName] = useState("");
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
      const result = await signUpWithEmail({
        email: email.trim(),
        name: fullName.trim(),
        password,
      });

      if (result?.error) {
        const message = result.error.message ?? "Sign up failed.";
        setErrorMessage(message);
        toast.error("Sign up failed", message);
        return;
      }

      setSuccess(true);
      toast.success("Account created", "Your account is pending admin approval.");
    } catch {
      const message = "Sign up unavailable. Try again shortly.";
      setErrorMessage(message);
      toast.error("Sign up failed", message);
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
            <Link to="/login" search={{ redirectTo: undefined }} className="text-primary hover:underline">Back to sign in</Link>
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
      description="Create a student account to request access to the Pilot360 LMS library."
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/login" search={{ redirectTo: undefined }} className="text-primary hover:underline">Sign in</Link>
        </p>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground" htmlFor="full-name">Full name</label>
          <Input id="full-name" autoComplete="name" className="h-11 border-border bg-input text-foreground placeholder:text-muted-foreground/60" disabled={isSubmitting} onChange={(e) => setFullName(((e.currentTarget as unknown) as { value: string }).value)} placeholder="Your full name" required type="text" value={fullName} />
        </div>
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
