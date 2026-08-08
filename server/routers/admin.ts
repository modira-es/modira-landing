import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAllUsers,
  updateUserRole,
  updateUserStatus,
} from "../db";

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
      const users = await getAllUsers();
      return users.map((user) => ({
        id: user.id,
        name: user.nombre,
        email: user.id, // Note: In Supabase, email is in auth.users. 
        // We might need a join or just use id as placeholder for now.
        // Actually, the user profile might not have email.
        company: user.empresa,
        companyId: user.companyId,
        role: user.rol,
        status: user.status,
        createdAt: user.createdAt,
        lastSignedIn: user.fechaUltimoLogin,
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
        await updateUserRole(input.userId, input.role);
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
        await updateUserStatus(input.userId, input.status);
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
      const users = await getAllUsers();
      const totalUsers = users.length;
      const activeUsers = users.filter((u) => u.status === "active").length;
      const blockedUsers = users.filter((u) => u.status === "blocked").length;
      const adminUsers = users.filter((u) => u.rol === "admin").length;

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
