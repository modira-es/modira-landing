export type InvoiceStatus =
  | "paid"
  | "pending"
  | "overdue"
  | "draft"
  | "cancelled"
  | string;

export interface Invoice {
  id: string;
  invoiceNumber: string;
  companyId?: string | null;
  companyName?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  status: InvoiceStatus;
  issueDate?: Date | null;
  dueDate?: Date | null;
  subtotal?: number | null;
  tax?: number | null;
  discount?: number | null;
  total: number;
  currency: string;
  pdfUrl?: string | null;
  stripeInvoiceId?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}
