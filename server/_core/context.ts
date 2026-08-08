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
      // Create a basic profile from auth user even if DB profile fetch fails
      profile = {
        id: user.id,
        email: user.email,
        rol: user.user_metadata?.rol || 'user',
        nombre: user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario',
      } as any;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (!error && data) {
          profile = {
            ...profile,
            ...data,
            companyId: data.company_id,
            avatarUrl: data.avatar_url,
            fechaRegistro: data.fecha_registro,
            fechaUltimoLogin: data.fecha_ultimo_login,
            lastSeenAt: data.last_seen_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          } as any;
        }
      } catch (err) {
        console.warn("[tRPC Context] Error fetching profile from DB:", err);
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user: profile,
  };
}
