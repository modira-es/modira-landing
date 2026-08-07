import bcrypt from "bcryptjs";
import { eq, and, gt, desc } from "drizzle-orm";
import { getDb } from "./db";
import { users, passwordResetTokens, loginAttempts } from "../drizzle/schema";
import type { InsertUser } from "../drizzle/schema";
import cryptoRandomString from "crypto-random-string";

const SALT_ROUNDS = 10;
const PASSWORD_RESET_EXPIRY_HOURS = 24;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPT_WINDOW_MINUTES = 15;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("La contraseña debe tener al menos 8 caracteres");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("La contraseña debe contener al menos una mayúscula");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("La contraseña debe contener al menos una minúscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("La contraseña debe contener al menos un número");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("La contraseña debe contener al menos un carácter especial");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Register a new user with email and password
 */
export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  company?: string;
}): Promise<{
  success: boolean;
  error?: string;
  userId?: number;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Base de datos no disponible" };
  }

  // Validate email format
  if (!validateEmail(data.email)) {
    return { success: false, error: "El correo electrónico no es válido" };
  }

  // Validate password strength
  const passwordValidation = validatePasswordStrength(data.password);
  if (!passwordValidation.valid) {
    return {
      success: false,
      error: passwordValidation.errors.join(". "),
    };
  }

  // Check if email already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  if (existingUser.length > 0) {
    return { success: false, error: "Este correo ya está registrado" };
  }

  // Hash password
  const passwordHash = await hashPassword(data.password);

  // Create user
  try {
    const result = await db.insert(users).values({
      name: data.name,
      email: data.email,
      passwordHash,
      company: data.company || null,
      loginMethod: "email",
      role: "user",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Get the inserted user ID from the result
    const userId = (result as any).insertId || result[0];

    return { success: true, userId: userId as number };
  } catch (error) {
    console.error("[Auth] Error registering user:", error);
    return { success: false, error: "Error al registrar el usuario" };
  }
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(email: string, password: string): Promise<{
  success: boolean;
  error?: string;
  userId?: number;
  blocked?: boolean;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Base de datos no disponible" };
  }

  // Check for too many failed attempts
  const recentAttempts = await db
    .select()
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, email),
        eq(loginAttempts.success, 0),
        gt(
          loginAttempts.createdAt,
          new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_MINUTES * 60 * 1000)
        )
      )
    );

  if (recentAttempts.length >= MAX_LOGIN_ATTEMPTS) {
    // Record the attempt
    await db.insert(loginAttempts).values({
      email,
      success: 0,
      createdAt: new Date(),
    });
    return {
      success: false,
      error: "Demasiados intentos fallidos. Intenta más tarde.",
      blocked: true,
    };
  }

  // Find user
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user.length === 0 || !user[0].passwordHash) {
    // Record failed attempt
    await db.insert(loginAttempts).values({
      email,
      success: 0,
      createdAt: new Date(),
    });
    return { success: false, error: "Correo o contraseña incorrectos" };
  }

  const dbUser = user[0];

  // Check if user is blocked
  if (dbUser.status === "blocked") {
    return {
      success: false,
      error: "Tu cuenta ha sido bloqueada",
      blocked: true,
    };
  }

  // Verify password
  const passwordMatch = await verifyPassword(
    password,
    dbUser.passwordHash || ""
  );

  if (!passwordMatch) {
    // Record failed attempt
    await db.insert(loginAttempts).values({
      email,
      success: 0,
      createdAt: new Date(),
    });
    return { success: false, error: "Correo o contraseña incorrectos" };
  }

  // Record successful attempt
  await db.insert(loginAttempts).values({
    email,
    success: 1,
    createdAt: new Date(),
  });

  // Update last signed in
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, dbUser.id));

  return { success: true, userId: dbUser.id };
}

/**
 * Generate password reset token
 */
export async function generatePasswordResetToken(
  userId: number
): Promise<string> {
  const db = await getDb();
  if (!db) {
    throw new Error("Base de datos no disponible");
  }

  const token = cryptoRandomString({ length: 32, type: "url-safe" });
  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000
  );

  await db.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt,
    createdAt: new Date(),
  });

  return token;
}

/**
 * Verify password reset token
 */
export async function verifyPasswordResetToken(
  token: string
): Promise<{ valid: boolean; userId?: number; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { valid: false, error: "Base de datos no disponible" };
  }

  const resetToken = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1);

  if (resetToken.length === 0) {
    return { valid: false, error: "Token inválido" };
  }

  const tokenRecord = resetToken[0];

  // Check if token is expired
  if (new Date() > tokenRecord.expiresAt) {
    return { valid: false, error: "El token ha expirado" };
  }

  // Check if token has already been used
  if (tokenRecord.usedAt) {
    return { valid: false, error: "El token ya ha sido utilizado" };
  }

  return { valid: true, userId: tokenRecord.userId };
}

/**
 * Reset password with token
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Base de datos no disponible" };
  }

  // Verify token
  const verification = await verifyPasswordResetToken(token);
  if (!verification.valid) {
    return { success: false, error: verification.error };
  }

  // Validate new password
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    return {
      success: false,
      error: passwordValidation.errors.join(". "),
    };
  }

  const userId = verification.userId!;

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update user password
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Mark token as used
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.token, token));

  return { success: true };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user.length > 0 ? user[0] : null;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;

  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user.length > 0 ? user[0] : null;
}
