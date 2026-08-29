import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { supabase } from "../lib/supabase";

export const adminRouter = router({
  /**
   * Obtener todos los usuarios.
   *
   * Protegido exclusivamente mediante adminProcedure.
   * La comprobación de administrador se realiza en el servidor.
   */
  getUsers: adminProcedure.query(async () => {
    try {
      const { data: users, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error getting users:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener usuarios",
        });
      }

      return (users || []).map((user) => ({
        id: user.id,
        name: user.nombre,
        email: user.email ?? user.id,
        company: user.empresa,
        companyId: user.company_id,
        role: user.rol,
        status: user.status,
        createdAt: user.created_at,
        lastSignedIn: user.fecha_ultimo_login,
      }));
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Error getting users:", error);

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al obtener usuarios",
      });
    }
  }),

  /**
   * Cambiar el rol de un usuario.
   *
   * Solo un administrador autenticado puede ejecutar esta operación.
   */
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: z.enum(["user", "admin"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Evitar que un administrador se quite a sí mismo
        // accidentalmente sus propios privilegios.
        if (input.userId === ctx.user.id && input.role !== "admin") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "No puedes quitarte a ti mismo los privilegios de administrador.",
          });
        }

        const { error } = await supabase
          .from("profiles")
          .update({
            rol: input.role,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.userId);

        if (error) {
          console.error("Error updating user role:", error);

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Error al actualizar el rol del usuario",
          });
        }

        return {
          success: true,
          message: "Rol actualizado exitosamente",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Error updating user role:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al actualizar el rol del usuario",
        });
      }
    }),

  /**
   * Cambiar el estado de un usuario.
   *
   * Solo un administrador autenticado puede ejecutar esta operación.
   */
  updateUserStatus: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        status: z.enum(["active", "pending", "blocked"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({
            status: input.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.userId);

        if (error) {
          console.error("Error updating user status:", error);

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Error al actualizar el estado del usuario",
          });
        }

        return {
          success: true,
          message: "Estado actualizado exitosamente",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Error updating user status:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al actualizar el estado del usuario",
        });
      }
    }),

  /**
   * Obtener estadísticas de usuarios.
   *
   * Solo disponible para administradores.
   */
  getStatistics: adminProcedure.query(async () => {
    try {
      const { data: users, error } = await supabase
        .from("profiles")
        .select("status, rol");

      if (error) {
        console.error("Error getting statistics:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener estadísticas",
        });
      }

      const totalUsers = users?.length ?? 0;

      const activeUsers =
        users?.filter((user) => user.status === "active").length ?? 0;

      const blockedUsers =
        users?.filter((user) => user.status === "blocked").length ?? 0;

      const adminUsers =
        users?.filter((user) => user.rol === "admin").length ?? 0;

      return {
        totalUsers,
        activeUsers,
        blockedUsers,
        adminUsers,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Error getting statistics:", error);

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al obtener estadísticas",
      });
    }
  }),
});