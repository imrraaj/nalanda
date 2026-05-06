import { getRequestHeaders } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db/index";
import { user as userTable } from "@/db/schema";

export type SignInBlockReason =
  | {
      code: "BANNED_USER";
      message: string;
    }
  | {
      code: "PENDING_ADMIN_APPROVAL";
      message: string;
    };

export async function getSessionFromHeaders(headers: Headers) {
  return auth.api.getSession({ headers });
}

export async function getCurrentSession() {
  return getSessionFromHeaders(getRequestHeaders());
}

export async function getSignInBlockReasonByEmail(
  email: string,
): Promise<SignInBlockReason | null> {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    return null;
  }

  const [user] = await db
    .select({
      banReason: userTable.banReason,
      banned: userTable.banned,
    })
    .from(userTable)
    .where(eq(userTable.email, normalizedEmail))
    .limit(1);

  if (!user?.banned) {
    return null;
  }

  const banReason = user.banReason?.trim() ?? "";
  const normalizedReason = banReason.toLowerCase();

  if (
    normalizedReason === "pending admin approval" ||
    normalizedReason === "awaiting approval"
  ) {
    return {
      code: "PENDING_ADMIN_APPROVAL",
      message: "Admin has not approved this account yet.",
    };
  }

  if (normalizedReason === "access disabled by admin") {
    return {
      code: "BANNED_USER",
      message: "This account has been banned by an administrator.",
    };
  }

  if (normalizedReason === "access request rejected by admin") {
    return {
      code: "BANNED_USER",
      message: "This account request was rejected by an administrator.",
    };
  }

  return {
    code: "BANNED_USER",
    message: banReason || "This account has been banned.",
  };
}
