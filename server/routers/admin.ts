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
  if (!ctx.user || ctx.user.role !== "admin") {
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
        name: user.name,
        email: user.email,
        company: user.company,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastSignedIn: user.lastSignedIn,
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
        userId: z.number(),
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
        userId: z.number(),
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
      const adminUsers = users.filter((u) => u.role === "admin").length;

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
