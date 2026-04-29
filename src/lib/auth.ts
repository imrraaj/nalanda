import { betterAuth } from "better-auth";
import { createAuthClient } from "better-auth/react"
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/index";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg", // or "mysql", "sqlite"
    }),

    emailAndPassword: { 
        enabled: true,
    },

    plugins: [tanstackStartCookies()]
});

export const authClient = createAuthClient({
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
})