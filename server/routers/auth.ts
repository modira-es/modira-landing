import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { createSession } from "../auth-middleware";
import {
  registerUser,
  authenticateUser,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  resetPasswordWithToken,
  getUserById,
  getUserByEmail,
} from "../auth";
import { TRPCError } from "@trpc/server";

export const authRouter = router({
  // Register a new user
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
        email: z.string().email("Email inválido"),
        password: z.string(),
        confirmPassword: z.string(),
        company: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Validate passwords match
      if (input.password !== input.confirmPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Las contraseñas no coinciden",
        });
      }

      const result = await registerUser({
        name: input.name,
        email: input.email,
        password: input.password,
        company: input.company,
      });

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error || "Error al registrar el usuario",
        });
      }

      // Create session after registration
      await createSession(result.userId!, ctx.res);

      return {
        success: true,
        userId: result.userId,
        message: "Usuario registrado exitosamente",
      };
    }),

  // Login with email and password
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await authenticateUser(input.email, input.password);

      if (!result.success) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: result.error || "Error al iniciar sesión",
        });
      }

      // Get user data
      const user = await getUserById(result.userId!);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuario no encontrado",
        });
      }

      // Create session
      await createSession(user.id, ctx.res);

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.company,
        },
      };
    }),

  // Request password reset
  requestPasswordReset: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
      })
    )
    .mutation(async ({ input }) => {
      const user = await getUserByEmail(input.email);

      // Always return success to prevent email enumeration
      if (!user || !user.passwordHash) {
        return {
          success: true,
          message:
            "Si el correo existe, recibirás un enlace para restablecer tu contraseña",
        };
      }

      const token = await generatePasswordResetToken(user.id);

      // TODO: Send email with reset link
      // const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      // await sendPasswordResetEmail(user.email, resetUrl);

      return {
        success: true,
        message:
          "Si el correo existe, recibirás un enlace para restablecer tu contraseña",
        // For development only - remove in production
        token: process.env.NODE_ENV === "development" ? token : undefined,
      };
    }),

  // Verify password reset token
  verifyResetToken: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .query(async ({ input }) => {
      const result = await verifyPasswordResetToken(input.token);

      if (!result.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error || "Token inválido",
        });
      }

      return {
        valid: true,
        userId: result.userId,
      };
    }),

  // Reset password with token
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        password: z.string(),
        confirmPassword: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Validate passwords match
      if (input.password !== input.confirmPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Las contraseñas no coinciden",
        });
      }

      const result = await resetPasswordWithToken(input.token, input.password);

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error || "Error al restablecer la contraseña",
        });
      }

      return {
        success: true,
        message: "Contraseña restablecida exitosamente",
      };
    }),

  // Get current user
  me: publicProcedure.query(({ ctx }) => {
    if (!ctx.user) {
      return null;
    }

    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      role: ctx.user.role,
      company: ctx.user.company,
      status: ctx.user.status,
    };
  }),

  // Logout
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return {
      success: true,
    } as const;
  }),
});
