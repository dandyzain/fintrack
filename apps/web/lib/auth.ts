import { prisma } from "@fintrack/database";
import { demoStore } from "./demo-store";
import { getSessionFromRequest } from "./session";
import type { NextRequest } from "next/server";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Returns the currently authenticated user from session cookie or Bearer token,
 * or null if no valid session exists.
 */
export async function getCurrentUser(
  request?: NextRequest | Request
): Promise<CurrentUser | null> {
  const session = getSessionFromRequest(request);

  if (session && session.userId) {
    if (!process.env.DATABASE_URL) {
      const user = demoStore.getUserById(session.userId);
      if (user) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      }
    } else {
      // Database errors propagate to the caller; never resolve real-mode
      // sessions against the in-memory demo store.
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, name: true, email: true },
      });
      if (user) return user;
    }
  }

  return null;
}

/**
 * Returns the authenticated user's ID or falls back to demo user ID
 * for seamless developer / portfolio demo mode.
 */
export async function getCurrentUserId(
  request?: NextRequest | Request
): Promise<string> {
  const user = await getCurrentUser(request);
  if (user) return user.id;

  // Default fallback user for demonstration
  return demoStore.userId;
}
