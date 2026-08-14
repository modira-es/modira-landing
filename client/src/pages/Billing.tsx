import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  Search,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface Invoice {
  id: string;
  user_id: string;
  company_id: string | null;
  project_id: string | null;
  numero_factura: string;
  monto: number | string | null;
  estado: string | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  descripcion: string | null;
  subtotal: number | string | null;
  iva_porcentaje: number | string | null;
  iva_importe: number | string | null;
  document_path: string | null;
}

interface ProjectInfo {
  id: string;
  nombre: string;
  company_id: string | null;
}

interface CompanyInfo {
  id: string;
  company_name: string;
}

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

const formatDate = (value: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("es-ES");
};

const normalizeStatus = (status: string | null) => {
  const value = (status || "").toLowerCase().trim();

  if (value === "pagada" || value === "paid") return "pagada";
  if (value === "pendiente" || value === "pending") return "pendiente";
  if (value === "vencida" || value === "overdue") return "vencida";

  return value || "pendiente";
};

const statusLabel = (status: string | null) => {
  switch (normalizeStatus(status)) {
    case "pagada":
      return "Pagada";
    case "pendiente":
      return "Pendiente";
    case "vencida":
      return "Vencida";
    default:
      return status || "Pendiente";
  }
};

export default function ClientBilling() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [openingPdf, setOpeningPdf] = useState<string | null>(null);

  const loadBillingData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ============================================================
      // 1. FACTURAS DEL CLIENTE
      //
      // La política RLS de invoices limita al cliente a sus propias
      // facturas. No hacemos joins para evitar que una política RLS
      // de otra tabla impida cargar la factura.
      // ============================================================
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select(
          `
            id,
            user_id,
            company_id,
            project_id,
            numero_factura,
            monto,
            estado,
            fecha_emision,
            fecha_vencimiento,
            descripcion,
            subtotal,
            iva_porcentaje,
            iva_importe,
            document_path
          `
        )
        .eq("user_id", user.id)
        .order("fecha_emision", { ascending: false });

      if (invoiceError) throw invoiceError;

      const loadedInvoices = (invoiceData || []) as Invoice[];
      setInvoices(loadedInvoices);

      // ============================================================
      // 2. PROYECTOS RELACIONADOS
      // ============================================================
      const projectIds = Array.from(
        new Set(
          loadedInvoices
            .map((invoice) => invoice.project_id)
            .filter(Boolean) as string[]
        )
      );

      if (projectIds.length > 0) {
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("id, nombre, company_id")
          .in("id", projectIds);

        if (!projectError) {
          setProjects((projectData || []) as ProjectInfo[]);
        } else {
          console.warn(
            "[ClientBilling] No se pudieron cargar los proyectos:",
            projectError
          );
          setProjects([]);
        }
      } else {
        setProjects([]);
      }

      // ============================================================
      // 3. EMPRESAS RELACIONADAS
      // ============================================================
      const companyIds = Array.from(
        new Set(
          loadedInvoices
            .map((invoice) => invoice.company_id)
            .filter(Boolean) as string[]
        )
      );

      if (companyIds.length > 0) {
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("id, company_name")
          .in("id", companyIds);

        if (!companyError) {
          setCompanies((companyData || []) as CompanyInfo[]);
        } else {
          console.warn(
            "[ClientBilling] No se pudieron cargar las empresas:",
            companyError
          );
          setCompanies([]);
        }
      } else {
        setCompanies([]);
      }
    } catch (err: any) {
      console.error("[ClientBilling] Error:", err);
      setError(
        err?.message ||
          "No se ha podido cargar la información de facturación."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, [user]);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const projectName =
        projects.find((project) => project.id === invoice.project_id)?.nombre ||
        "";

      const companyName =
        companies.find((company) => company.id === invoice.company_id)
          ?.company_name || "";

      const matchesSearch =
        !query ||
        invoice.numero_factura.toLowerCase().includes(query) ||
        projectName.toLowerCase().includes(query) ||
        companyName.toLowerCase().includes(query) ||
        (invoice.descripcion || "").toLowerCase().includes(query);

      const normalized = normalizeStatus(invoice.estado);

      const matchesStatus =
        statusFilter === "todos" || normalized === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, projects, companies, search, statusFilter]);

  const billingStatus = useMemo(() => {
    const pending = invoices.some(
      (invoice) =>
        normalizeStatus(invoice.estado) === "pendiente" ||
        normalizeStatus(invoice.estado) === "vencida"
    );

    if (invoices.length === 0) {
      return "sin_facturas";
    }

    return pending ? "pendiente" : "al_dia";
  }, [invoices]);

  const paidCount = useMemo(
    () =>
      invoices.filter(
        (invoice) => normalizeStatus(invoice.estado) === "pagada"
      ).length,
    [invoices]
  );

  const pendingCount = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          normalizeStatus(invoice.estado) === "pendiente" ||
          normalizeStatus(invoice.estado) === "vencida"
      ).length,
    [invoices]
  );

  const getProjectName = (invoice: Invoice) =>
    projects.find((project) => project.id === invoice.project_id)?.nombre ||
    "Sin proyecto";

  const getCompanyName = (invoice: Invoice) =>
    companies.find((company) => company.id === invoice.company_id)
      ?.company_name || "Sin empresa";

  const openInvoicePdf = async (invoice: Invoice) => {
    if (!invoice.document_path) {
      toast.info("Esta factura todavía no tiene un PDF disponible.");
      return;
    }

    setOpeningPdf(invoice.id);

    try {
      const { data, error: signedUrlError } = await supabase.storage
        .from("invoices")
        .createSignedUrl(invoice.document_path, 300);

      if (signedUrlError) throw signedUrlError;

      if (!data?.signedUrl) {
        throw new Error("No se pudo generar el enlace seguro del PDF.");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      console.error("[ClientBilling] Error abriendo PDF:", err);
      toast.error(
        err?.message || "No se ha podido abrir el PDF de la factura."
      );
    } finally {
      setOpeningPdf(null);
    }
  };

  const downloadInvoicePdf = async (invoice: Invoice) => {
    if (!invoice.document_path) {
      toast.info("Esta factura todavía no tiene un PDF disponible.");
      return;
    }

    setOpeningPdf(invoice.id);

    try {
      const { data, error: signedUrlError } = await supabase.storage
        .from("invoices")
        .createSignedUrl(invoice.document_path, 300, {
          download: `${invoice.numero_factura}.pdf`,
        });

      if (signedUrlError) throw signedUrlError;

      if (!data?.signedUrl) {
        throw new Error("No se pudo generar el enlace seguro del PDF.");
      }

      const response = await fetch(data.signedUrl);

      if (!response.ok) {
        throw new Error("No se pudo descargar el PDF.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `${invoice.numero_factura}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("[ClientBilling] Error descargando PDF:", err);
      toast.error(
        err?.message || "No se ha podido descargar el PDF de la factura."
      );
    } finally {
      setOpeningPdf(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white">
      <header className="bg-gradient-to-r from-[#102A66] to-[#173B8F] text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Facturación</h1>
              <p className="text-white/80 mt-2">Consulta tus facturas y descarga sus documentos.</p>
            </div>
            <Button onClick={() => setLocation("/area-cliente")} className="w-full md:w-auto shrink-0 bg-white text-[#173B8F] hover:bg-white/90 font-semibold flex gap-2 items-center justify-center shadow-sm">
              <ArrowLeft className="h-4 w-4" />
              Volver al Área de Clientes
            </Button>
          </div>
        </div>
      </header>

        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[#173B8F]" />
            <p className="text-[#52627A]">
              Cargando tu información de facturación...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <header className="bg-gradient-to-r from-[#102A66] to-[#173B8F] text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Facturación</h1>
              <p className="text-white/80 mt-2">Consulta tus facturas y descarga sus documentos.</p>
            </div>
            <Button onClick={() => setLocation("/area-cliente")} className="w-full md:w-auto shrink-0 bg-white text-[#173B8F] hover:bg-white/90 font-semibold flex gap-2 items-center justify-center shadow-sm">
              <ArrowLeft className="h-4 w-4" />
              Volver al Área de Clientes
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {error && (
          <Card className="mb-8 border-2 border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">
                  No se ha podido cargar la facturación
                </p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Estado general de facturación */}
        <section className="mb-10">
          <Card className="border border-[#E8ECF2] bg-white p-6 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                {billingStatus === "al_dia" && (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                )}

                {billingStatus === "pendiente" && (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <AlertCircle className="h-6 w-6 text-amber-600" />
                  </div>
                )}

                {billingStatus === "sin_facturas" && (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                    <FileText className="h-6 w-6 text-gray-500" />
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#52627A]">
                    Estado de facturación
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-[#102A66]">
                    {billingStatus === "al_dia" &&
                      "Estás al día con tus facturas"}
                    {billingStatus === "pendiente" &&
                      "Tienes facturas pendientes"}
                    {billingStatus === "sin_facturas" &&
                      "Todavía no tienes facturas"}
                  </h2>

                  <p className="mt-1 text-[#52627A]">
                    {billingStatus === "al_dia" &&
                      "Todas tus facturas registradas están pagadas."}
                    {billingStatus === "pendiente" &&
                      `Tienes ${pendingCount} ${
                        pendingCount === 1 ? "factura pendiente" : "facturas pendientes"
                      }.`}
                    {billingStatus === "sin_facturas" &&
                      "Cuando se emita una factura aparecerá aquí."}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Badge
                  variant="outline"
                  className="border-green-200 bg-green-50 px-3 py-1.5 text-green-700"
                >
                  {paidCount} pagadas
                </Badge>

                {pendingCount > 0 && (
                  <Badge
                    variant="outline"
                    className="border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700"
                  >
                    {pendingCount} pendientes
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        </section>

        {/* Facturas */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#102A66]">
              Mis facturas
            </h2>
            <p className="mt-1 text-[#52627A]">
              Consulta el detalle y descarga el PDF de cada factura disponible.
            </p>
          </div>

          <Card className="overflow-hidden border border-[#E8ECF2] bg-white">
            {/* Buscador y filtros */}
            <div className="border-b border-[#E8ECF2] p-5 md:p-6">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A98AB]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por factura, proyecto o empresa..."
                    className="h-11 w-full rounded-lg border border-[#DCE2EA] bg-white pl-10 pr-4 text-sm text-[#182230] outline-none transition focus:border-[#173B8F] focus:ring-2 focus:ring-[#173B8F]/10"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 rounded-lg border border-[#DCE2EA] bg-white px-4 text-sm text-[#182230] outline-none focus:border-[#173B8F]"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="pagada">Pagadas</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="vencida">Vencidas</option>
                </select>
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-[#F8FAFC]">
                  <tr className="border-b border-[#E8ECF2]">
                    <th className="px-6 py-4 text-left text-sm font-bold text-[#182230]">
                      Nº Factura
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-[#182230]">
                      Proyecto
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-[#182230]">
                      Fecha emisión
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-[#182230]">
                      Vencimiento
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-[#182230]">
                      Importe
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-[#182230]">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-[#182230]">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-16 text-center text-[#52627A]"
                      >
                        <FileText className="mx-auto mb-3 h-10 w-10 text-[#B7C0CD]" />
                        <p className="font-semibold text-[#182230]">
                          {invoices.length === 0
                            ? "No tienes facturas registradas"
                            : "No se han encontrado facturas"}
                        </p>
                        <p className="mt-1 text-sm">
                          {invoices.length === 0
                            ? "Las facturas emitidas para tu cuenta aparecerán aquí."
                            : "Prueba a cambiar el filtro o la búsqueda."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((invoice) => {
                      const status = normalizeStatus(invoice.estado);
                      const hasPdf = Boolean(invoice.document_path);

                      return (
                        <tr
                          key={invoice.id}
                          className="border-b border-[#EEF1F5] transition hover:bg-[#FAFBFD]"
                        >
                          <td className="px-6 py-5">
                            <button
                              type="button"
                              onClick={() => setSelectedInvoice(invoice)}
                              className="font-mono text-sm font-semibold text-[#173B8F] hover:underline"
                            >
                              {invoice.numero_factura}
                            </button>
                          </td>

                          <td className="px-6 py-5">
                            <div className="font-medium text-[#182230]">
                              {getProjectName(invoice)}
                            </div>
                            <div className="mt-1 text-xs text-[#7B8798]">
                              {getCompanyName(invoice)}
                            </div>
                          </td>

                          <td className="px-6 py-5 text-sm text-[#52627A]">
                            {formatDate(invoice.fecha_emision)}
                          </td>

                          <td className="px-6 py-5 text-sm text-[#52627A]">
                            {formatDate(invoice.fecha_vencimiento)}
                          </td>

                          <td className="px-6 py-5 text-right font-semibold text-[#182230]">
                            {currency.format(Number(invoice.monto || 0))}
                          </td>

                          <td className="px-6 py-5 text-center">
                            <Badge
                              className={
                                status === "pagada"
                                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                                  : status === "pendiente"
                                  ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                                  : status === "vencida"
                                  ? "bg-red-100 text-red-800 hover:bg-red-100"
                                  : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                              }
                            >
                              {statusLabel(invoice.estado)}
                            </Badge>
                          </td>

                          <td className="px-6 py-5">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedInvoice(invoice)}
                                className="gap-2 border-[#DCE2EA] text-[#173B8F] hover:bg-[#F4F7FB]"
                              >
                                <Eye className="h-4 w-4" />
                                Ver
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!hasPdf || openingPdf === invoice.id}
                                onClick={() => downloadInvoicePdf(invoice)}
                                className="gap-2 border-[#DCE2EA] text-[#173B8F] hover:bg-[#F4F7FB]"
                              >
                                {openingPdf === invoice.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                                PDF
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </main>

      {/* Modal detalle factura */}
      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedInvoice(null);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#E8ECF2] px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#52627A]">
                  Detalle de factura
                </p>
                <h3 className="mt-1 font-mono text-xl font-bold text-[#102A66]">
                  {selectedInvoice.numero_factura}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="rounded-lg p-2 text-[#7B8798] hover:bg-[#F4F6F9] hover:text-[#182230]"
                aria-label="Cerrar"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <p className="text-sm text-[#7B8798]">Proyecto</p>
                  <p className="mt-1 font-semibold text-[#182230]">
                    {getProjectName(selectedInvoice)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-[#7B8798]">Empresa</p>
                  <p className="mt-1 font-semibold text-[#182230]">
                    {getCompanyName(selectedInvoice)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-[#7B8798]">Fecha de emisión</p>
                  <p className="mt-1 font-semibold text-[#182230]">
                    {formatDate(selectedInvoice.fecha_emision)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-[#7B8798]">Fecha de vencimiento</p>
                  <p className="mt-1 font-semibold text-[#182230]">
                    {formatDate(selectedInvoice.fecha_vencimiento)}
                  </p>
                </div>
              </div>

              {selectedInvoice.descripcion && (
                <div className="rounded-xl bg-[#F7F9FC] p-4">
                  <p className="text-sm font-semibold text-[#52627A]">
                    Concepto
                  </p>
                  <p className="mt-1 text-[#182230]">
                    {selectedInvoice.descripcion}
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-[#E8ECF2] p-5">
                <div className="flex items-center justify-between text-sm text-[#52627A]">
                  <span>Base imponible</span>
                  <span>
                    {currency.format(Number(selectedInvoice.subtotal || 0))}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm text-[#52627A]">
                  <span>
                    IVA ({Number(selectedInvoice.iva_porcentaje || 0)}%)
                  </span>
                  <span>
                    {currency.format(Number(selectedInvoice.iva_importe || 0))}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#E8ECF2] pt-4">
                  <span className="font-bold text-[#182230]">Total</span>
                  <span className="text-2xl font-bold text-[#173B8F]">
                    {currency.format(Number(selectedInvoice.monto || 0))}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#F7F9FC] p-4">
                <div className="flex items-center gap-3">
                  {normalizeStatus(selectedInvoice.estado) === "pagada" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  )}

                  <div>
                    <p className="text-sm font-semibold text-[#182230]">
                      {statusLabel(selectedInvoice.estado)}
                    </p>
                    <p className="text-xs text-[#7B8798]">
                      Estado actual de la factura
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#E8ECF2] bg-[#FAFBFD] px-6 py-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedInvoice(null)}
              >
                Cerrar
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={!selectedInvoice.document_path}
                onClick={() => openInvoicePdf(selectedInvoice)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Ver PDF
              </Button>

              <Button
                type="button"
                disabled={!selectedInvoice.document_path}
                onClick={() => downloadInvoicePdf(selectedInvoice)}
                className="gap-2 bg-[#173B8F] text-white hover:bg-[#102A66]"
              >
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-16 border-t bg-white py-8">
        <div className="container mx-auto px-4 text-center text-sm text-[#7B8798]">
          <p>© {new Date().getFullYear()} Modira. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}