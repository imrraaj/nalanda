import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "@/lib/auth";

export async function getSessionFromHeaders(headers: Headers) {
  return auth.api.getSession({ headers });
}

export async function getCurrentSession() {
  return getSessionFromHeaders(getRequestHeaders());
}
