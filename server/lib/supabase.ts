import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrlEnv = process.env.VITE_SUPABASE_URL;
const supabaseKeyEnv = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrlEnv || !supabaseKeyEnv) {
  throw new Error(
    "Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

const supabaseUrl: string = supabaseUrlEnv;
const supabaseKey: string = supabaseKeyEnv;

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

export function createSupabaseUserClient(
  accessToken: string
): SupabaseClient {
  return createClient(
    supabaseUrl,
    supabaseKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Verify Supabase JWT and return the authenticated user.
 */
export async function verifySupabaseToken(token: string) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}