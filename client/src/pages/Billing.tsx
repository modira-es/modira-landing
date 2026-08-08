import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, Filter, Plus, Search } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { InvoiceTable, SortKey } from "@/components/invoices/InvoiceTable";
import { InvoiceStatus } from "@/types/invoice";
import { CardAction } from "@/components/ui/card";

const statusOptions: { value: InvoiceStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "paid", label: "Pagada" },
  { value: "pending", label: "Pendiente" },
  { value: "overdue", label: "Vencida" },
  { value: "draft", label: "Borrador" },
  { value: "cancelled", label: "Cancelada" },
];

const PAGE_SIZE = 10;

export default function Billing() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"subscriptions" | "invoices">("invoices");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("issueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const invoicesQuery = useInvoices(!!user);

  const invoices = useMemo(() => {
    if (!invoicesQuery.data) return [];
    return invoicesQuery.data;
  }, [invoicesQuery.data]);

  const clientOptions = useMemo(() => {
    const options = new Set<string>();
    invoices.forEach((invoice) => {
      if (invoice.clientName) {
        options.add(invoice.clientName);
      }
    });
    return [
      { value: "all", label: "Todos" },
      ...Array.from(options).map((client) => ({ value: client, label: client })),
    ];
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const searched = invoices.filter((invoice) => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      if (!normalizedSearch) return true;
      return [
        invoice.invoiceNumber,
        invoice.clientName,
        invoice.companyName,
        invoice.projectName,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch));
    });

    const statusFiltered = searched.filter((invoice) => {
      if (statusFilter === "all") return true;
      return invoice.status === statusFilter;
    });

    const clientFiltered = statusFiltered.filter((invoice) => {
      if (clientFilter === "all") return true;
      return invoice.clientName === clientFilter;
    });

    const sorted = [...clientFiltered].sort((a, b) => {
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;

      if (sortBy === "total") {
        return sortOrder === "asc" ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
      }

      const aDate = new Date(aValue as string | Date).getTime();
      const bDate = new Date(bValue as string | Date).getTime();
      return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
    });

    return sorted;
  }, [invoices, searchTerm, statusFilter, clientFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));

  const pageInvoices = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredInvoices.slice(start, start + PAGE_SIZE);
  }, [filteredInvoices, currentPage]);

  const isAllSelected = pageInvoices.length > 0 && pageInvoices.every((invoice) => selectedInvoiceIds.includes(invoice.id));

  const onToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedInvoiceIds((current) => current.filter((id) => !pageInvoices.some((invoice) => invoice.id === id)));
      return;
    }
    setSelectedInvoiceIds((current) => {
      const nextSelection = new Set(current);
      pageInvoices.forEach((invoice) => nextSelection.add(invoice.id));
      return Array.from(nextSelection);
    });
  };

  const onToggleSelect = (invoiceId: string) => {
    setSelectedInvoiceIds((current) =>
      current.includes(invoiceId)
        ? current.filter((id) => id !== invoiceId)
        : [...current, invoiceId]
    );
  };

  const onSortChange = (sortKey: SortKey) => {
    if (sortBy === sortKey) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(sortKey);
    setSortOrder("desc");
  };

  const handleInvoiceAction = (invoice: any, action: string) => {
    console.log(`Invoice action: ${action}`, invoice);
  };

  const handleBulkAction = (action: string) => {
    console.log(`Bulk action: ${action}`, selectedInvoiceIds);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[#1E3A8A]">Facturación</h1>
          <p className="text-gray-600 max-w-3xl">
            Gestiona tus facturas de forma clara y rápida, con control total sobre estados,
            clientes y fechas de pago.
          </p>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={activeTab === "invoices" ? "default" : "outline"}
              onClick={() => setActiveTab("invoices")}
            >
              Facturas
            </Button>
            <Button
              variant={activeTab === "subscriptions" ? "default" : "outline"}
              onClick={() => setActiveTab("subscriptions")}
            >
              Suscripciones
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button className="gap-2" onClick={() => setShowFilters((current) => !current)}>
              <Filter className="w-4 h-4" /> Filtros
            </Button>
            <Button className="bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90 gap-2">
              <Plus className="w-4 h-4" /> Nueva factura
            </Button>
          </div>
        </div>

        {showFilters && (
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Buscar</p>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Buscar por factura, cliente o empresa"
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Estado</p>
                <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value as InvoiceStatus | "all"); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Cliente</p>
                <Select value={clientFilter} onValueChange={(value) => { setClientFilter(value); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "subscriptions" && (
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <div>
                <CardTitle>Suscripciones</CardTitle>
                <CardDescription>
                  Mantén el control de tus suscripciones activas y renuncios automáticos.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoicesQuery.isLoading ? (
                  <div className="flex items-center justify-center py-14">
                    <Loader2 className="h-8 w-8 animate-spin text-[#1E3A8A]" />
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
                    <AlertCircle className="mx-auto mb-4 h-10 w-10 text-slate-400" />
                    <p className="font-semibold text-slate-900">No hay datos de suscripciones disponibles</p>
                    <p className="mt-2 text-sm">Este panel está preparado para mostrar las suscripciones del cliente.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "invoices" && (
          <div className="space-y-4">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <div>
                  <CardTitle>Facturas</CardTitle>
                  <CardDescription>
                    Administra todas las facturas con filtros, búsqueda en tiempo real, ordenación y selección múltiple.
                  </CardDescription>
                </div>
                <CardAction>
                  <Button className="bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90 gap-2">
                    <Plus className="w-4 h-4" /> Nueva factura
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Buscar facturas, cliente, empresa o proyecto"
                      value={searchTerm}
                      onChange={(event) => {
                        setSearchTerm(event.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-11"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => onSortChange("issueDate")}
                    >
                      Fecha emisión
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => onSortChange("dueDate")}
                    >
                      Fecha vencimiento
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => onSortChange("total")}
                    >
                      Importe
                    </Button>
                  </div>
                </div>

                {selectedInvoiceIds.length > 0 && (
                  <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-700">
                      {selectedInvoiceIds.length} factura{selectedInvoiceIds.length > 1 ? "s" : ""} seleccionada{selectedInvoiceIds.length > 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => handleBulkAction("markPaid")}>Marcar como pagada</Button>
                      <Button variant="secondary" onClick={() => handleBulkAction("send")}>Enviar</Button>
                      <Button variant="destructive" onClick={() => handleBulkAction("delete")}>Eliminar</Button>
                    </div>
                  </div>
                )}

                {invoicesQuery.isLoading ? (
                  <div className="flex items-center justify-center py-14">
                    <Loader2 className="h-8 w-8 animate-spin text-[#1E3A8A]" />
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
                    <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
                    <h2 className="text-xl font-semibold text-slate-900">No se han encontrado facturas</h2>
                    <p className="mt-2 text-sm text-slate-600">Cambia el filtro o prueba otra búsqueda para ver resultados.</p>
                  </div>
                ) : (
                  <InvoiceTable
                    invoices={pageInvoices}
                    selectedInvoiceIds={selectedInvoiceIds}
                    onToggleSelectAll={onToggleSelectAll}
                    onToggleSelect={onToggleSelect}
                    isAllSelected={isAllSelected}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setCurrentPage(page)}
                    onInvoiceAction={handleInvoiceAction}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
