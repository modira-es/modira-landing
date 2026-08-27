import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { supabase } from "../lib/supabase";

/**
 * Admin-only procedure that checks if user is admin
 */
const adminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user || ctx.user.rol !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Solo administradores pueden acceder a esta función",
    });
  }
  return next({ ctx });
});

export const adminRouter = router({
  // Get all users
  getUsers: adminProcedure.query(async () => {
    try {
      const { data: users, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (users || []).map((user) => ({
        id: user.id,
        name: user.nombre,
        email: user.id, 
        company: user.empresa,
        companyId: user.company_id,
        role: user.rol,
        status: user.status,
        createdAt: user.created_at,
        lastSignedIn: user.fecha_ultimo_login,
      }));
    } catch (error) {
      console.error("Error getting users:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al obtener usuarios",
      });
    }
  }),

  // Update user role
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["user", "admin"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ rol: input.role, updated_at: new Date().toISOString() })
          .eq("id", input.userId);

        if (error) throw error;

        return {
          success: true,
          message: "Rol actualizado exitosamente",
        };
      } catch (error) {
        console.error("Error updating user role:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al actualizar el rol del usuario",
        });
      }
    }),

  // Update user status
  updateUserStatus: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        status: z.enum(["active", "pending", "blocked"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ status: input.status, updated_at: new Date().toISOString() })
          .eq("id", input.userId);

        if (error) throw error;

        return {
          success: true,
          message: "Estado actualizado exitosamente",
        };
      } catch (error) {
        console.error("Error updating user status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al actualizar el estado del usuario",
        });
      }
    }),

  // Get user statistics
  getStatistics: adminProcedure.query(async () => {
    try {
      const { data: users, error } = await supabase
        .from("profiles")
        .select("status, rol");

      if (error) throw error;

      const totalUsers = users?.length || 0;
      const activeUsers = users?.filter((u) => u.status === "active").length || 0;
      const blockedUsers = users?.filter((u) => u.status === "blocked").length || 0;
      const adminUsers = users?.filter((u) => u.rol === "admin").length || 0;

      return {
        totalUsers,
        activeUsers,
        blockedUsers,
        adminUsers,
      };
    } catch (error) {
      console.error("Error getting statistics:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al obtener estadísticas",
      });
    }
  }),
});
