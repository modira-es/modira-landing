import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  numeric,
  jsonb,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const statusEnum = pgEnum("status", ["active", "pending", "blocked"]);
export const projectStatusEnum = pgEnum("project_status", ["activo", "pausado", "completado"]);
export const quotationStatusEnum = pgEnum("quotation_status", [
  "borrador",
  "pendiente",
  "pagado",
  "rechazado",
  "caducado",
]);
export const stripeProductTypeEnum = pgEnum("stripe_product_type", ["one_time", "subscription"]);

/**
 * Profiles table linked to Supabase Auth users
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().notNull(), // Linked to auth.users.id
  nombre: text("nombre").notNull(),
  empresa: text("empresa"),
  telefono: text("telefono"),
  rol: roleEnum("rol").default("user").notNull(),
  status: statusEnum("status").default("active").notNull(),
  fechaRegistro: timestamp("fecha_registro").defaultNow().notNull(),
  fechaUltimoLogin: timestamp("fecha_ultimo_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

/**
 * Projects table
 */
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  estado: projectStatusEnum("estado").default("activo").notNull(),
  fechaInicio: timestamp("fecha_inicio").defaultNow(),
  fechaFin: timestamp("fecha_fin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Quotations table
 */
export const quotations = pgTable("quotations", {
  id: uuid("id").primaryKey().defaultRandom(),
  numeroPresupuesto: text("numero_presupuesto").unique().notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  empresa: text("empresa"),
  titulo: text("titulo").notNull(),
  descripcionDetallada: text("descripcion_detallada"),
  serviciosIncluidos: jsonb("servicios_incluidos").default([]).notNull(),
  precioBase: numeric("precio_base", { precision: 12, scale: 2 }).default("0.00").notNull(),
  ivaPorcentaje: numeric("iva_porcentaje", { precision: 5, scale: 2 }).default("21.00").notNull(),
  precioTotal: numeric("precio_total", { precision: 12, scale: 2 }).default("0.00").notNull(),
  estado: quotationStatusEnum("estado").default("borrador").notNull(),
  fechaEmision: timestamp("fecha_emision").defaultNow(),
  fechaValidez: timestamp("fecha_validez"),
  notas: text("notas"),
  stripeSessionId: text("stripe_session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;

/**
 * Stripe Products Table
 */
export const stripeProducts = pgTable("stripe_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  stripeProductId: varchar("stripe_product_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: stripeProductTypeEnum("type").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type StripeProduct = typeof stripeProducts.$inferSelect;
export type InsertStripeProduct = typeof stripeProducts.$inferInsert;

/**
 * Stripe Prices Table
 */
export const stripePrices = pgTable("stripe_prices", {
  id: uuid("id").primaryKey().defaultRandom(),
  stripePriceId: varchar("stripe_price_id", { length: 255 }).notNull().unique(),
  stripeProductId: varchar("stripe_product_id", { length: 255 }).notNull(),
  amount: integer("amount").notNull(), // Amount in cents
  currency: varchar("currency", { length: 3 }).default("eur").notNull(),
  interval: varchar("interval", { length: 50 }), // "month", "year", null for one-time
  intervalCount: integer("interval_count").default(1),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type StripePrice = typeof stripePrices.$inferSelect;
export type InsertStripePrice = typeof stripePrices.$inferInsert;

/**
 * User Subscriptions Table
 */
export const userSubscriptions = pgTable("user_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).notNull().unique(),
  stripePriceId: varchar("stripe_price_id", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(), // "active", "past_due", "canceled", etc
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  canceledAt: timestamp("canceled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;

/**
 * Payments/Invoices Table
 */
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }).notNull().unique(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  amount: integer("amount").notNull(), // Amount in cents
  currency: varchar("currency", { length: 3 }).default("eur").notNull(),
  status: varchar("status", { length: 50 }).notNull(), // "paid", "draft", "open", "uncollectible", "void"
  description: text("description"),
  paidAt: timestamp("paid_at"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
