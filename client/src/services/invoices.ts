import { InvoiceStatus } from "@/types/invoice";

export const invoiceStatusOptions = [
  { value: "all", label: "Todos" },
  { value: "paid", label: "Pagada" },
  { value: "pending", label: "Pendiente" },
  { value: "overdue", label: "Vencida" },
  { value: "draft", label: "Borrador" },
  { value: "cancelled", label: "Cancelada" },
] as const;

export function getInvoiceStatusConfig(status: InvoiceStatus) {
  switch (status) {
    case "paid":
      return { label: "Pagada", className: "bg-emerald-100 text-emerald-800" };
    case "pending":
      return { label: "Pendiente", className: "bg-amber-100 text-amber-800" };
    case "overdue":
      return { label: "Vencida", className: "bg-rose-100 text-rose-800" };
    case "draft":
      return { label: "Borrador", className: "bg-slate-100 text-slate-800" };
    case "cancelled":
      return { label: "Cancelada", className: "bg-rose-100 text-rose-800" };
    default:
      return { label: status || "Pendiente", className: "bg-slate-100 text-slate-800" };
  }
}

export function formatCurrency(amount: number, currency: string) {
  return (amount / 100).toLocaleString("es-ES", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
}

export function formatDate(date?: Date | string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getClientLabel(clientName?: string | null) {
  return clientName || "Sin cliente";
}
