import { createClientOnlyFn } from "@tanstack/react-start";

import { getSignInBlockReason } from "@/lib/auth.function";

type SignInInput = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

type SignUpInput = {
  email: string;
  name: string;
  password: string;
};

export const signInWithEmail = createClientOnlyFn(async (input: SignInInput) => {
  const { authClient } = await import("@/lib/auth.client");

  const result = await authClient.signIn.email({
    email: input.email,
    password: input.password,
    rememberMe: input.rememberMe ?? true,
  });

  if (
    result?.error?.code === "INVALID_EMAIL_OR_PASSWORD" ||
    result?.error?.code === "BANNED_USER"
  ) {
    const blockReason = await getSignInBlockReason({
      data: { email: input.email },
    });

    if (blockReason) {
      return {
        ...result,
        error: blockReason,
      };
    }
  }

  return result;
});

export const signUpWithEmail = createClientOnlyFn(async (input: SignUpInput) => {
  const { authClient } = await import("@/lib/auth.client");

  return authClient.signUp.email({
    email: input.email,
    name: input.name,
    password: input.password,
  });
});

export const signOut = createClientOnlyFn(async () => {
  const { authClient } = await import("@/lib/auth.client");

  await authClient.signOut();
});

export const changePassword = createClientOnlyFn(async (input: {
  currentPassword: string;
  newPassword: string;
}) => {
  const { authClient } = await import("@/lib/auth.client");

  return authClient.changePassword({
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
    revokeOtherSessions: true,
  });
});
