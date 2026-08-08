export * from "./_core/errors";

// Enums equivalents
export type Role = "user" | "owner" | "admin" | "manager" | "employee";
export type Status = "active" | "pending" | "blocked";
export type ProjectStatus = "activo" | "pausado" | "completado";
export type QuotationStatus = "borrador" | "pendiente" | "pagado" | "rechazado" | "caducado";
export type StripeProductType = "one_time" | "subscription";

/**
 * Companies
 */
export interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  legalName: string | null;
  cifVat: string | null;
  billingEmail: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  industry: string | null;
  employees: number | null;
  timezone: string;
  language: string;
  currency: string;
  stripeCustomerId: string | null;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  settings: any;
  createdAt: string;
  updatedAt: string;
}

/**
 * Profiles
 */
export interface Profile {
  id: string;
  companyId: string | null;
  nombre: string;
  apellidos: string | null;
  empresa: string | null;
  telefono: string | null;
  avatarUrl: string | null;
  puesto: string | null;
  departamento: string | null;
  rol: Role;
  status: Status;
  isActive: boolean;
  fechaRegistro: string;
  fechaUltimoLogin: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Clients
 */
export interface Client {
  id: string;
  companyId: string;
  nombre: string;
  empresa: string | null;
  email: string | null;
  telefono: string | null;
  contactoPrincipal: string | null;
  cifVat: string | null;
  direccion: string | null;
  codigoPostal: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  sector: string | null;
  notas: string | null;
  etiquetas: any[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Projects
 */
export interface Project {
  id: string;
  companyId: string | null;
  userId: string;
  nombre: string;
  descripcion: string | null;
  estado: ProjectStatus;
  fechaInicio: string | null;
  fechaFin: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Quotations
 */
export interface Quotation {
  id: string;
  companyId: string;
  userId: string;
  projectId: string | null;
  clientId: string | null;
  numeroPresupuesto: string;
  titulo: string;
  descripcionDetallada: string | null;
  serviciosIncluidos: any[];
  precioBase: string | number;
  ivaPorcentaje: string | number;
  precioTotal: string | number;
  estado: string;
  fechaEmision: string | null;
  fechaValidez: string | null;
  notas: string | null;
  stripeSessionId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payments
 */
export interface Payment {
  id: string;
  companyId: string;
  userId: string;
  invoiceId: string | null;
  stripeInvoiceId: string | null;
  stripePaymentIntentId: string | null;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  paidAt: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Stripe Products
 */
export interface StripeProduct {
  id: string;
  stripeProductId: string;
  name: string;
  description: string | null;
  type: StripeProductType;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Stripe Prices
 */
export interface StripePrice {
  id: string;
  stripePriceId: string;
  stripeProductId: string;
  amount: number;
  currency: string;
  interval: string | null;
  intervalCount: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * User Subscriptions
 */
export interface UserSubscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
}
