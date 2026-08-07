import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.startsWith('%') || supabaseKey.startsWith('%')) {
  console.error(
    "Missing or invalid Supabase URL or Anon Key. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file"
  );
}

// Create a dummy client if config is missing to avoid crashing the entire app
export const supabase = (supabaseUrl && supabaseKey && !supabaseUrl.startsWith('%') && !supabaseKey.startsWith('%')) 
  ? createClient(supabaseUrl, supabaseKey)
  : {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({ data: { session: null }, error: new Error("Supabase not configured") }),
        signUp: async () => ({ data: { user: null }, error: new Error("Supabase not configured") }),
        signOut: async () => ({ error: null }),
        resetPasswordForEmail: async () => ({ error: new Error("Supabase not configured") }),
        updateUser: async () => ({ error: new Error("Supabase not configured") }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: new Error("Supabase not configured") }) }) }),
        update: () => ({ eq: () => ({ data: null, error: new Error("Supabase not configured") }) }),
        insert: () => ({ data: null, error: new Error("Supabase not configured") }),
      }),
    } as any;

/**
 * Get the current user session
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[Supabase] Error getting current user:", error);
    return null;
  }

  return user;
}

/**
 * Get the current session
 */
export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("[Supabase] Error getting session:", error);
    return null;
  }

  return session;
}

/**
 * Sign up a new user
 */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user };
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, session: data.session };
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("[Supabase] Error signing out:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Request password reset
 */
export async function resetPasswordRequest(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update password with token
 */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get user profile from profiles table
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("[Supabase] Error getting profile:", error);
    return null;
  }

  return data;
}

/**
 * Create user profile
 */
export async function createUserProfile(
  userId: string,
  profileData: {
    nombre: string;
    empresa?: string;
    telefono?: string;
    rol?: string;
  }
) {
  const { data, error } = await supabase.from("profiles").insert([
    {
      id: userId,
      nombre: profileData.nombre,
      empresa: profileData.empresa || null,
      telefono: profileData.telefono || null,
      rol: profileData.rol || "user",
      fecha_registro: new Date().toISOString(),
      fecha_ultimo_login: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error("[Supabase] Error creating profile:", error);
    return { success: false, error: error.message };
  }

  return { success: true, profile: data };
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  profileData: Partial<{
    nombre: string;
    empresa: string;
    telefono: string;
    rol: string;
  }>
) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...profileData,
      fecha_ultimo_login: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("[Supabase] Error updating profile:", error);
    return { success: false, error: error.message };
  }

  return { success: true, profile: data };
}
