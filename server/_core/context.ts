import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Profile } from "../../shared/types";
import { verifySupabaseToken, supabase, createSupabaseUserClient } from "../lib/supabase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: Profile | null;
  supabase: ReturnType<typeof createSupabaseUserClient>;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let profile: Profile | null = null;
  let requestSupabase = supabase;

  // Extract token from Authorization header
  const authHeader = opts.req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    requestSupabase = createSupabaseUserClient(token);
    const user = await verifySupabaseToken(token);

    if (user) {
      try {
        const { data, error } = await requestSupabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!error && data) {
          profile = {
            ...data,
            companyId: data.company_id,
            avatarUrl: data.avatar_url,
            fechaRegistro: data.fecha_registro,
            fechaUltimoLogin: data.fecha_ultimo_login,
            lastSeenAt: data.last_seen_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          } as Profile;
        }
      } catch (err) {
        console.warn(
          "[tRPC Context] Error fetching profile from DB:",
          err
        );
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user: profile,
    supabase: requestSupabase,
  };
}