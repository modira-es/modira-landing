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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#102A66] to-[#173B8F] text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold">Facturación</h1>
          <p className="text-white/80 mt-2">Descarga tus facturas y gestiona tus métodos de pago</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-6 p-6">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={activeTab === "invoices" ? "default" : "outline"}
              onClick={() => setActiveTab("invoices")}
              className={activeTab === "invoices" ? "bg-[#173B8F] hover:bg-[#102A66] text-white" : "border-[#E8ECF2] text-[#173B8F]"}
            >
              Facturas
            </Button>
            <Button
              variant={activeTab === "subscriptions" ? "default" : "outline"}
              onClick={() => setActiveTab("subscriptions")}
              className={activeTab === "subscriptions" ? "bg-[#173B8F] hover:bg-[#102A66] text-white" : "border-[#E8ECF2] text-[#173B8F]"}
            >
              Suscripciones
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button className="gap-2 border-[#E8ECF2] text-[#173B8F]" variant="outline" onClick={() => setShowFilters((current) => !current)}>
              <Filter className="w-4 h-4" /> Filtros
            </Button>
            <Button className="bg-[#173B8F] text-white hover:bg-[#102A66] gap-2">
              <Plus className="w-4 h-4" /> Nueva factura
            </Button>
          </div>
        </div>

        {showFilters && (
          <Card className="border border-[#E8ECF2] shadow-sm">
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#52627A]">Buscar</p>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Buscar por factura, cliente o empresa"
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 border-[#E8ECF2] focus:ring-[#173B8F]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#52627A]">Estado</p>
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
                <p className="text-sm font-medium text-[#52627A]">Cliente</p>
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
          <Card className="border border-[#E8ECF2] shadow-sm">
            <CardHeader>
              <div>
                <CardTitle className="text-[#102A66]">Suscripciones</CardTitle>
                <CardDescription className="text-[#52627A]">
                  Mantén el control de tus suscripciones activas y renuncios automáticos.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoicesQuery.isLoading ? (
                  <div className="flex items-center justify-center py-14">
                    <Loader2 className="h-8 w-8 animate-spin text-[#173B8F]" />
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-[#E8ECF2] bg-[#F4F6F9] p-8 text-center text-[#52627A]">
                    <AlertCircle className="mx-auto mb-4 h-10 w-10 text-[#173B8F]" />
                    <p className="font-semibold text-[#102A66]">No hay datos de suscripciones disponibles</p>
                    <p className="mt-2 text-sm">Este panel está preparado para mostrar las suscripciones del cliente.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "invoices" && (
          <div className="space-y-4">
            <Card className="border border-[#E8ECF2] shadow-sm">
              <CardHeader>
                <div>
                  <CardTitle className="text-[#102A66]">Facturas</CardTitle>
                  <CardDescription className="text-[#52627A]">
                    Administra todas las facturas con filtros, búsqueda en tiempo real, ordenación y selección múltiple.
                  </CardDescription>
                </div>
                <CardAction>
                  <Button className="bg-[#173B8F] text-white hover:bg-[#102A66] gap-2">
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
                      className="pl-11 border-[#E8ECF2] focus:ring-[#173B8F]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button
                      variant="outline"
                      className="gap-2 border-[#E8ECF2] text-[#173B8F]"
                      onClick={() => onSortChange("issueDate")}
                    >
                      Fecha emisión
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 border-[#E8ECF2] text-[#173B8F]"
                      onClick={() => onSortChange("dueDate")}
                    >
                      Fecha vencimiento
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 border-[#E8ECF2] text-[#173B8F]"
                      onClick={() => onSortChange("total")}
                    >
                      Importe
                    </Button>
                  </div>
                </div>

                {selectedInvoiceIds.length > 0 && (
                  <div className="flex flex-col gap-3 rounded-3xl border border-[#E8ECF2] bg-[#F4F6F9] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-[#52627A]">
                      {selectedInvoiceIds.length} factura{selectedInvoiceIds.length > 1 ? "s" : ""} seleccionada{selectedInvoiceIds.length > 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" className="bg-[#173B8F]/10 text-[#173B8F] hover:bg-[#173B8F]/20" onClick={() => handleBulkAction("markPaid")}>Marcar como pagada</Button>
                      <Button variant="secondary" className="bg-[#173B8F]/10 text-[#173B8F] hover:bg-[#173B8F]/20" onClick={() => handleBulkAction("send")}>Enviar</Button>
                      <Button variant="destructive" onClick={() => handleBulkAction("delete")}>Eliminar</Button>
                    </div>
                  </div>
                )}

                {invoicesQuery.isLoading ? (
                  <div className="flex items-center justify-center py-14">
                    <Loader2 className="h-8 w-8 animate-spin text-[#173B8F]" />
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-[#E8ECF2] bg-[#F4F6F9] p-10 text-center">
                    <AlertCircle className="mx-auto mb-3 h-10 w-10 text-[#173B8F]" />
                    <h2 className="text-xl font-semibold text-[#102A66]">No se han encontrado facturas</h2>
                    <p className="mt-2 text-sm text-[#52627A]">Cambia el filtro o prueba otra búsqueda para ver resultados.</p>
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
