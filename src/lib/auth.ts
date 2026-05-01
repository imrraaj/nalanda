import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "@/db/index";
import { eq } from "drizzle-orm";
import { account, session, user as userTable, verification } from "@/db/schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
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


