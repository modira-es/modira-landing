import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Profile } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { profiles } from "../../drizzle/schema";
import { verifySupabaseToken } from "../lib/supabase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: Profile | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let profile: Profile | null = null;

  // Extract token from Authorization header
  const authHeader = opts.req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const user = await verifySupabaseToken(token);

    if (user) {
      const db = await getDb();
      if (db) {
        const result = await db
          .select()
          .from(profiles)
          .where(eq(profiles.id, user.id))
          .limit(1);
        
        if (result.length > 0) {
          profile = result[0];
        }
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user: profile,
  };
}
