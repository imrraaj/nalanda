import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "@/db/index";
import { eq } from "drizzle-orm";
import { account, session, user as userTable, verification } from "@/db/schema";

function getBaseUrlConfig() {
  const allowedHosts = new Set([
    "localhost:3000",
    "localhost:5173",
    "*.vercel.app",
  ]);
  const configuredUrl = process.env.BETTER_AUTH_URL?.trim();
  const defaultProtocol = process.env.NODE_ENV === "development" ? "http" : "https";

  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      allowedHosts.add(url.host);
      const protocol = url.protocol === "http:" ? "http" : "https";

      return {
        allowedHosts: Array.from(allowedHosts),
        fallback: url.origin,
        protocol,
      } as const;
    } catch {
      // Fall back to host-based inference when BETTER_AUTH_URL is malformed.
    }
  }

  return {
    allowedHosts: Array.from(allowedHosts),
    protocol: defaultProtocol,
  } as const;
}

export const auth = betterAuth({
  baseURL: getBaseUrlConfig(),
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: userTable,
      session,
      account,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (user.role !== "admin") {
            await db.update(userTable).set({ banned: true, banReason: "Pending admin approval" }).where(eq(userTable.id, user.id));
          }
        },
      },
    },
  },
  plugins: [
    tanstackStartCookies(),
    admin({
      defaultRole: "user",
    }),
  ],
});
