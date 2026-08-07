import { Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";
import { getUserById } from "./auth";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Create a session for a user
 */
export async function createSession(
  userId: number,
  res: Response
): Promise<string> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get user
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Create session token (simplified - in production use JWT or similar)
  const sessionToken = Buffer.from(
    JSON.stringify({
      userId,
      email: user.email,
      iat: Date.now(),
      exp: Date.now() + SESSION_DURATION,
    })
  ).toString("base64");

  // Set secure cookie
  res.cookie(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });

  return sessionToken;
}

/**
 * Verify session from request
 */
export async function verifySession(req: Request): Promise<number | null> {
  const sessionToken = req.cookies[COOKIE_NAME];

  if (!sessionToken) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(sessionToken, "base64").toString());

    // Check expiration
    if (decoded.exp < Date.now()) {
      return null;
    }

    // Verify user still exists
    const user = await getUserById(decoded.userId);
    if (!user) {
      return null;
    }

    return decoded.userId;
  } catch (error) {
    return null;
  }
}

/**
 * Get authenticated user from request
 */
export async function getAuthenticatedUser(req: Request) {
  const userId = await verifySession(req);

  if (!userId) {
    return null;
  }

  return getUserById(userId);
}
