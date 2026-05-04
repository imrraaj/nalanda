import { createClientOnlyFn } from "@tanstack/react-start";

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

  return authClient.signIn.email({
    email: input.email,
    password: input.password,
    rememberMe: input.rememberMe ?? true,
  });
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
