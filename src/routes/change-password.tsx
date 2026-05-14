import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { changePassword } from "@/lib/auth.actions";

export const Route = createFileRoute("/change-password")({
  beforeLoad: async () => {
    const { getSession } = await import("@/lib/auth.function");
    const session = await getSession();

    if (!session) {
      throw redirect({
        search: { redirectTo: "/change-password" },
        to: "/login",
      });
    }
  },
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      const message = "New password and confirmation do not match.";
      setErrorMessage(message);
      toast.error("Password mismatch", message);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
      });

      if (result?.error) {
        const message = result.error.message ?? "Password could not be updated.";
        setErrorMessage(message);
        toast.error("Password update failed", message);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage("Password updated.");
      toast.success("Password updated", "Use your new password the next time you sign in.");
    } catch {
      const message = "Password could not be updated.";
      setErrorMessage(message);
      toast.error("Password update failed", message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Update password"
      description="Use your current password, then choose a new one."
      footer={
        <p>
          <Link
            className="text-primary hover:underline"
            search={{ folderId: undefined, openId: undefined, q: undefined }}
            to="/dashboard"
          >
            Back to library
          </Link>
        </p>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label
            className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
            htmlFor="current-password"
          >
            Current password
          </label>
          <Input
            autoComplete="current-password"
            className="h-11 border-border bg-input text-foreground placeholder:text-muted-foreground/60"
            disabled={isSubmitting}
            id="current-password"
            onChange={(event) => setCurrentPassword(event.currentTarget.value)}
            placeholder="Current password"
            required
            type="password"
            value={currentPassword}
          />
        </div>

        <div className="space-y-1.5">
          <label
            className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
            htmlFor="new-password"
          >
            New password
          </label>
          <Input
            autoComplete="new-password"
            className="h-11 border-border bg-input text-foreground placeholder:text-muted-foreground/60"
            disabled={isSubmitting}
            id="new-password"
            minLength={8}
            onChange={(event) => setNewPassword(event.currentTarget.value)}
            placeholder="New password"
            required
            type="password"
            value={newPassword}
          />
        </div>

        <div className="space-y-1.5">
          <label
            className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
            htmlFor="confirm-password"
          >
            Confirm new password
          </label>
          <Input
            autoComplete="new-password"
            className="h-11 border-border bg-input text-foreground placeholder:text-muted-foreground/60"
            disabled={isSubmitting}
            id="confirm-password"
            minLength={8}
            onChange={(event) => setConfirmPassword(event.currentTarget.value)}
            placeholder="Confirm new password"
            required
            type="password"
            value={confirmPassword}
          />
        </div>

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {successMessage ? (
          <Alert>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Button className="mt-1 h-11 w-full font-semibold" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthShell>
  );
}
