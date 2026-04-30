import { auth } from "@/lib/auth";

export async function getSessionFromHeaders(headers: Headers) {
  return auth.api.getSession({ headers });
}
