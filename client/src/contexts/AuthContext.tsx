import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  User,
  Session,
} from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isRecoverySession: boolean;

  signUp: (
    email: string,
    password: string,
    nombre: string,
    empresa?: string,
    captchaToken?: string
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;

  signIn: (
    email: string,
    password: string,
    captchaToken?: string
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;

  signOut: () => Promise<{
    success: boolean;
    error?: string;
  }>;

  resetPassword: (
    email: string,
    captchaToken?: string
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;

  updatePassword: (
    newPassword: string
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;
}

export const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  const [session, setSession] =
    useState<Session | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [isRecoverySession, setIsRecoverySession] =
    useState(false);

  /*
   * Inicializa el estado de autenticación
   * y mantiene sincronizado el contexto con
   * los cambios de sesión de Supabase.
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error(
          "[Auth] Error initializing auth:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    /*
     * No se registra la sesión ni el access token.
     * Solo se actualiza el estado local de autenticación.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === "PASSWORD_RECOVERY") {
          setIsRecoverySession(true);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    nombre: string,
    empresa?: string,
    captchaToken?: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      const { data, error } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nombre,
              empresa: empresa || null,
            },
            captchaToken,
          },
        });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: "Error creating user",
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        "[Auth] Sign up error:",
        error
      );

      return {
        success: false,
        error: "Error during sign up",
      };
    }
  };

  const signIn = async (
    email: string,
    password: string,
    captchaToken?: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
          options: {
            captchaToken,
          },
        });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        "[Auth] Sign in error:",
        error
      );

      return {
        success: false,
        error: "Error during sign in",
      };
    }
  };

  const signOut = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        "[Auth] Sign out error:",
        error
      );

      return {
        success: false,
        error: "Error during sign out",
      };
    }
  };

  const resetPassword = async (
    email: string,
    captchaToken?: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              `${window.location.origin}/auth/reset-password`,
            captchaToken,
          }
        );

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        "[Auth] Reset password error:",
        error
      );

      return {
        success: false,
        error:
          "Error requesting password reset",
      };
    }
  };

  const updatePassword = async (
    newPassword: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      const { error } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        "[Auth] Update password error:",
        error
      );

      return {
        success: false,
        error: "Error updating password",
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isRecoverySession,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
}