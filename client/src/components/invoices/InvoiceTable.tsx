import {
  CheckCircle2,
  Copy,
  Download,
  Edit,
  Eye,
  MoreVertical,
  Send,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Invoice } from "@/types/invoice";
import { getInvoiceStatusConfig, formatCurrency } from "@/services/invoices";

export type SortKey = "issueDate" | "dueDate" | "total";
export type SortOrder = "asc" | "desc";

interface InvoiceTableProps {
  invoices: Invoice[];
  selectedInvoiceIds: string[];
  onToggleSelectAll: () => void;
  onToggleSelect: (invoiceId: string) => void;
  isAllSelected: boolean;
  sortBy: SortKey;
  sortOrder: SortOrder;
  onSortChange: (sortKey: SortKey) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onInvoiceAction: (invoice: Invoice, action: string) => void;
}

export function InvoiceTable({
  invoices,
  selectedInvoiceIds,
  onToggleSelectAll,
  onToggleSelect,
  isAllSelected,
  sortBy,
  sortOrder,
  onSortChange,
  currentPage,
  totalPages,
  onPageChange,
  onInvoiceAction,
}: InvoiceTableProps) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 px-3">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={() => onToggleSelectAll()}
              />
            </TableHead>
            <TableHead>Nº Factura</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Proyecto</TableHead>
            <TableHead>Fecha emisión</TableHead>
            <TableHead>Fecha de vencimiento</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Importe</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const { label, className } = getInvoiceStatusConfig(invoice.status);
            const isChecked = selectedInvoiceIds.includes(invoice.id);

            return (
              <TableRow key={invoice.id} className="group hover:bg-slate-50">
                <TableCell className="px-3 py-3">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => onToggleSelect(invoice.id)}
                  />
                </TableCell>
                <TableCell className="font-medium text-slate-900">{invoice.invoiceNumber}</TableCell>
                <TableCell>{invoice.clientName || "Sin cliente"}</TableCell>
                <TableCell>{invoice.companyName || "Sin empresa"}</TableCell>
                <TableCell>{invoice.projectName || "Sin proyecto"}</TableCell>
                <TableCell>{invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString("es-ES") : "-"}</TableCell>
                <TableCell>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("es-ES") : "-"}</TableCell>
                <TableCell>
                  <Badge className={`${className}`}>{label}</Badge>
                </TableCell>
                <TableCell className="text-right font-semibold text-slate-900">
                  {formatCurrency(invoice.total, invoice.currency)}
                </TableCell>
                <TableCell className="pr-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={8}>
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => onInvoiceAction(invoice, "view")}>
                        <Eye className="w-4 h-4" /> Ver factura
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onInvoiceAction(invoice, "download")}>
                        <Download className="w-4 h-4" /> Descargar PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onInvoiceAction(invoice, "markPaid")}> 
                        <CheckCircle2 className="w-4 h-4" /> Marcar como pagada
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onInvoiceAction(invoice, "duplicate")}>
                        <Copy className="w-4 h-4" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onInvoiceAction(invoice, "send")}>
                        <Send className="w-4 h-4" /> Enviar
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onInvoiceAction(invoice, "edit")}>
                        <Edit className="w-4 h-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => onInvoiceAction(invoice, "delete")}
                      >
                        <Trash2 className="w-4 h-4" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Mostrando {invoices.length} facturas en esta página
        </p>
        <Pagination>
          <PaginationContent>
            <PaginationPrevious
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) onPageChange(currentPage - 1);
              }}
              aria-disabled={currentPage === 1}
              className={currentPage === 1 ? "opacity-40 pointer-events-none" : undefined}
            />
            {Array.from({ length: totalPages }, (_, index) => (
              <PaginationItem key={index}>
                <PaginationLink
                  href="#"
                  isActive={currentPage === index + 1}
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(index + 1);
                  }}
                >
                  {index + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationNext
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages) onPageChange(currentPage + 1);
              }}
              aria-disabled={currentPage === totalPages}
              className={currentPage === totalPages ? "opacity-40 pointer-events-none" : undefined}
            />
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
