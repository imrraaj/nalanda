import { createServerFn } from "@tanstack/react-start";
import { getCurrentSession } from "@/lib/auth.server";

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  return getCurrentSession();
});
