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
  unique,
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
  country: text("country").default("ES"),
  industry: text("industry"),
  employees: integer("employees"),
  timezone: varchar("timezone", { length: 64 }).default("Europe/Madrid").notNull(),
  language: varchar("language", { length: 10 }).default("es").notNull(),
  currency: varchar("currency", { length: 3 }).default("EUR").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionPlan: text("subscription_plan"),
  subscriptionStatus: varchar("subscription_status", { length: 50 }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  settings: jsonb("settings").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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
  fechaRegistro: timestamp("fecha_registro", { withTimezone: true }).defaultNow().notNull(),
  fechaUltimoLogin: timestamp("fecha_ultimo_login", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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
  codigoPostal: text("codigo_postal"),
  ciudad: text("ciudad"),
  provincia: text("provincia"),
  pais: text("pais").default("ES"),
  sector: text("sector"),
  notas: text("notas"),
  etiquetas: jsonb("etiquetas").default([]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Projects table
 */
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  estado: projectStatusEnum("estado").default("activo").notNull(),
  fechaInicio: timestamp("fecha_inicio", { withTimezone: true }).defaultNow(),
  fechaFin: timestamp("fecha_fin", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Quotations table
 */
export const quotations = pgTable("quotations", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  numeroPresupuesto: text("numero_presupuesto").notNull(),
  titulo: text("titulo").notNull(),
  descripcionDetallada: text("descripcion_detallada"),
  serviciosIncluidos: jsonb("servicios_incluidos").default([]).notNull(),
  precioBase: numeric("precio_base", { precision: 12, scale: 2 }).default("0.00").notNull(),
  ivaPorcentaje: numeric("iva_porcentaje", { precision: 5, scale: 2 }).default("21.00").notNull(),
  precioTotal: numeric("precio_total", { precision: 12, scale: 2 }).default("0.00").notNull(),
  estado: text("estado").default("borrador").notNull(), // Using text to match SQL migration which says VARCHAR(50)
  fechaEmision: timestamp("fecha_emision", { withTimezone: true }).defaultNow(),
  fechaValidez: timestamp("fecha_validez", { withTimezone: true }),
  notas: text("notas"),
  stripeSessionId: text("stripe_session_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyNumberUnique: unique("quotations_company_number_unique").on(table.companyId, table.numeroPresupuesto),
}));

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;

/**
 * Invoices table
 */
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  // Add other fields as needed based on common patterns, but SQL migration only showed company_id addition
  // Since the user said they exist, I should add them if I find their definitions elsewhere or just keep them minimal
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Budgets table
 */
export const budgets = pgTable("budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Support Tickets table
 */
export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Automations table
 */
export const automations = pgTable("automations", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Payments Table
 */
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  amount: integer("amount").notNull(), // Amount in cents
  currency: varchar("currency", { length: 3 }).default("EUR").notNull(),
  status: varchar("status", { length: 50 }).notNull(), 
  description: text("description"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  dueDate: timestamp("due_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

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
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
