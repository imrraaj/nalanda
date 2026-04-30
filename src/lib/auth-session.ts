import { createServerFn } from "@tanstack/react-start";

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const [{ getRequestHeaders }, { getSessionFromHeaders }] = await Promise.all([
    import("@tanstack/react-start/server"),
    import("@/lib/auth-server"),
  ]);
  const headers = getRequestHeaders();

  return getSessionFromHeaders(headers);
});
