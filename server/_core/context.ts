import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Profile } from "../../shared/types";
import { verifySupabaseToken, supabase } from "../lib/supabase";

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
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (!error && data) {
        profile = {
          ...data,
          // Map snake_case from Supabase to camelCase expected by Profile type if necessary
          // However, Drizzle schema seems to use some snake_case fields as well.
          // Let's ensure types match or cast.
          companyId: data.company_id,
          avatarUrl: data.avatar_url,
          fechaRegistro: data.fecha_registro,
          fechaUltimoLogin: data.fecha_ultimo_login,
          lastSeenAt: data.last_seen_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        } as any;
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user: profile,
  };
}
