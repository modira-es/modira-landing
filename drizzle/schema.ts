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
export const roleEnum = pgEnum("role", ["user", "owner", "admin", "manager", "employee"]);
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
 * Companies table for multi-tenant SaaS customers
 */
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyCode: varchar("company_code", { length: 50 }).notNull().unique(),
  companyName: text("company_name").notNull(),
  legalName: text("legal_name"),
  cifVat: text("cif_vat"),
  billingEmail: varchar("billing_email", { length: 320 }),
  phone: text("phone"),
  website: text("website"),
  logoUrl: text("logo_url"),
  address: text("address"),
  postalCode: text("postal_code"),
  city: text("city"),
  province: text("province"),
  country: text("country"),
  industry: text("industry"),
  employees: integer("employees"),
  timezone: varchar("timezone", { length: 64 }).default("UTC").notNull(),
  language: varchar("language", { length: 10 }).default("es").notNull(),
  currency: varchar("currency", { length: 3 }).default("EUR").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionPlan: text("subscription_plan"),
  subscriptionStatus: varchar("subscription_status", { length: 50 }),
  trialEndsAt: timestamp("trial_ends_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  settings: jsonb("settings").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

/**
 * Profiles table linked to Supabase Auth users
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().notNull(), // Linked to auth.users.id
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  nombre: text("nombre").notNull(),
  apellidos: text("apellidos"),
  empresa: text("empresa"),
  telefono: text("telefono"),
  avatarUrl: text("avatar_url"),
  puesto: text("puesto"),
  departamento: text("departamento"),
  rol: roleEnum("rol").default("user").notNull(),
  status: statusEnum("status").default("active").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  fechaRegistro: timestamp("fecha_registro").defaultNow().notNull(),
  fechaUltimoLogin: timestamp("fecha_ultimo_login"),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

/**
 * Clients table for company customer records
 */
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  empresa: text("empresa"),
  email: varchar("email", { length: 320 }),
  telefono: text("telefono"),
  contactoPrincipal: text("contacto_principal"),
  cifVat: text("cif_vat"),
  direccion: text("direccion"),
  ciudad: text("ciudad"),
  provincia: text("provincia"),
  pais: text("pais"),
  codigoPostal: text("codigo_postal"),
  sector: text("sector"),
  notas: text("notas"),
  etiquetas: jsonb("etiquetas").default([]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

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
