import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { profiles } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL);
      _db = drizzle(client, { schema });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Admin helpers
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(profiles).orderBy(desc(profiles.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get users:", error);
    return [];
  }
}

export async function updateUserRole(userId: string, rol: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db
      .update(profiles)
      .set({ rol, updatedAt: new Date() })
      .where(eq(profiles.id, userId));
  } catch (error) {
    console.error("[Database] Failed to update user role:", error);
    throw error;
  }
}

export async function updateUserStatus(
  userId: string,
  status: "active" | "pending" | "blocked"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db
      .update(profiles)
      .set({ status, updatedAt: new Date() })
      .where(eq(profiles.id, userId));
  } catch (error) {
    console.error("[Database] Failed to update user status:", error);
    throw error;
  }
}
