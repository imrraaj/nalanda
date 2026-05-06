import { createServerFn } from "@tanstack/react-start";
import {
  getCurrentSession,
  getSignInBlockReasonByEmail,
} from "@/lib/auth.server";

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  return getCurrentSession();
});

export const getSignInBlockReason = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    return getSignInBlockReasonByEmail(data.email);
  });
