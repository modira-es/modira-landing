import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import EmployeeAreaHeader from "@/components/EmployeeAreaHeader";
import EmployeeProjects from "@/components/EmployeeProjects";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function EmployeeArea() {
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [workerName, setWorkerName] = useState("");
  const [auditRequests, setAuditRequests] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [invoiceCompanyFilter, setInvoiceCompanyFilter] = useState("all");
const [invoiceProjectFilter, setInvoiceProjectFilter] = useState("all");
const invoiceCompanies = Array.from(
  new Map(
    invoices
      .filter((inv) => inv.companies)
      .map((inv) => [
        inv.companies.id,
        inv.companies
      ])
  ).values()
);
const filteredInvoices = invoices.filter((inv) => {
  const companyMatch =
    invoiceCompanyFilter === "all" ||
    inv.company_id === invoiceCompanyFilter;

  const projectMatch =
    invoiceProjectFilter === "all" ||
    inv.project_id === invoiceProjectFilter;

  return companyMatch && projectMatch;
});
const invoiceProjects = Array.from(
  new Map(
    invoices
      .filter((inv) => inv.projects)
      .map((inv) => [
        inv.projects.id,
        inv.projects
      ])
  ).values()
);

const [tickets, setTickets] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

const [activeTab, setActiveTab] = useState<
  "projects" | "billing" | "audits" | "tickets"
>("projects");

const [showCreateInvoice, setShowCreateInvoice] = useState(false);

const [generatedInvoiceNumber, setGeneratedInvoiceNumber] = useState("");
const [creatingInvoice, setCreatingInvoice] = useState(false);
const [invoiceError, setInvoiceError] = useState("");

const [invoiceForm, setInvoiceForm] = useState({
  company_id: "",
  project_id: "",
  fecha_emision: "",
  fecha_vencimiento: "",
  concepto: "",
  amount: "",
  iva: "21",
});


  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // 1. Obtener nombre del trabajador
        const { data: worker } = await supabase
          .from("workers")
          .select("display_name")
          .eq("auth_user_id", user.id)
          .single();
        
        if (worker) setWorkerName(worker.display_name);

        const { data: companiesData, error: companiesError } = await supabase
  .from("companies")
  .select("id, company_name")
  .order("company_name", { ascending: true });

if (companiesError) {
  console.error(
    "[EmployeeArea] Error loading companies:",
    companiesError
  );
} else {
  setCompanies(companiesData || []);
}

        // 2. Cargar Solicitudes de Auditoría (created_at ASC)
        const { data: audits } = await supabase
          .from("audit_requests")
          .select("*")
          .order("created_at", { ascending: true });
        
        if (audits) setAuditRequests(audits);

        // 3. Cargar Facturas (created_at ASC)
const { data: invs } = await supabase
  .from("invoices")
  .select(`
    *,
    profiles:user_id (nombre, email),
    companies:company_id (id, company_name),
    projects:project_id (id, nombre)
  `)
  .order("created_at", { ascending: true });

if (invs) setInvoices(invs);

        // 4. Cargar Tickets (created_at ASC)
        const { data: tks } = await supabase
          .from("support_tickets")
          .select(`
            *,
            profiles:user_id (nombre, email)
          `)
          .order("created_at", { ascending: true });
        
        if (tks) setTickets(tks);

      } catch (err) {
        console.error("[EmployeeArea] Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);
  const handleGenerateInvoiceNumber = async () => {
  setCreatingInvoice(true);
  setInvoiceError("");

  try {
    const { data, error } = await supabase.rpc(
      "generate_invoice_number"
    );

    if (error) {
      console.error(
        "[EmployeeArea] Error generating invoice number:",
        error
      );

      setInvoiceError(error.message);
      return;
    }

    if (!data) {
      setInvoiceError(
        "No se ha podido generar el número de factura."
      );
      return;
    }

    setGeneratedInvoiceNumber(data);

  } catch (err) {
    console.error(
      "[EmployeeArea] Unexpected error generating invoice number:",
      err
    );

    setInvoiceError(
      "Ha ocurrido un error al generar el número de factura."
    );
  } finally {
    setCreatingInvoice(false);
  }
};

  const handleLogout = async () => {
    await signOut();
    setLocation("/");
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy HH:mm", { locale: es });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <EmployeeAreaHeader userName={workerName || "Trabajador"} onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-12">

  {/* Navegación del Área de Empleados */}
  <div className="mb-10 border-b border-gray-200">
    <div className="flex gap-8 overflow-x-auto">

      <button
        type="button"
        onClick={() => setActiveTab("projects")}
        className={`pb-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
          activeTab === "projects"
            ? "border-[#1E3A8A] text-[#1E3A8A]"
            : "border-transparent text-gray-500 hover:text-[#1E3A8A]"
        }`}
      >
        Proyectos
      </button>

      <button
        type="button"
        onClick={() => setActiveTab("billing")}
        className={`pb-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
          activeTab === "billing"
            ? "border-[#1E3A8A] text-[#1E3A8A]"
            : "border-transparent text-gray-500 hover:text-[#1E3A8A]"
        }`}
      >
        Facturación
      </button>

      <button
        type="button"
        onClick={() => setActiveTab("audits")}
        className={`pb-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
          activeTab === "audits"
            ? "border-[#1E3A8A] text-[#1E3A8A]"
            : "border-transparent text-gray-500 hover:text-[#1E3A8A]"
        }`}
      >
        Auditorías
      </button>

      <button
        type="button"
        onClick={() => setActiveTab("tickets")}
        className={`pb-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
          activeTab === "tickets"
            ? "border-[#1E3A8A] text-[#1E3A8A]"
            : "border-transparent text-gray-500 hover:text-[#1E3A8A]"
        }`}
      >
        Tickets
      </button>

    </div>
  </div>

  {/* Contenido de las pestañas */}

  {/* Proyectos */}
  <div hidden={activeTab !== "projects"}>
    <EmployeeProjects />
  </div>

        {/* Auditorías Section */}
        <div hidden={activeTab !== "audits"}>
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#1E3A8A]">Solicitudes de auditoría</h2>
            <Badge variant="outline" className="bg-white">{auditRequests.length} solicitudes</Badge>
          </div>
          <Card className="border-none shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-bold">Nombre</TableHead>
                    <TableHead className="font-bold">Email</TableHead>
                    <TableHead className="font-bold">Empresa</TableHead>
                    <TableHead className="font-bold text-center">Empleados</TableHead>
                    <TableHead className="font-bold">Proceso</TableHead>
                    <TableHead className="font-bold">Estado</TableHead>
                    <TableHead className="font-bold">Fecha solicitud</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                  {auditRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No hay solicitudes de auditoría disponibles.
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.nombre}</TableCell>
                        <TableCell>{req.email}</TableCell>
                        <TableCell>{req.empresa}</TableCell>
                        <TableCell className="text-center">{req.empleados}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={req.proceso_manual}>
                          {req.proceso_manual}
                        </TableCell>
                        <TableCell>
                          <Badge variant={req.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                            {req.status || 'pendiente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(req.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </section>
        </div>

       {/* Facturas Section */}
<div hidden={activeTab !== "billing"}>
  <section className="space-y-6">

    <div className="flex items-center justify-between">
  <h2 className="text-2xl font-bold text-[#1E3A8A]">
    Facturas
  </h2>

  <div className="flex items-center gap-3">

    <Badge variant="outline" className="bg-white">
      {filteredInvoices.length} facturas
    </Badge>

    <button
      type="button"
      onClick={() => setShowCreateInvoice(true)}
      className="rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#162D6B]"
    >
      + Crear factura
    </button>

  </div>
</div>

    {/* Filtros */}
    <div className="flex flex-wrap gap-4">

      {/* Filtro empresa */}
      <select
        value={invoiceCompanyFilter}
        onChange={(e) => setInvoiceCompanyFilter(e.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm"
      >
        <option value="all">Todas las empresas</option>

        {companies.map((company) => (
  <option
    key={company.id}
    value={company.id}
  >
    {company.company_name}
  </option>
))}
      </select>

      {/* Filtro proyecto */}
      <select
        value={invoiceProjectFilter}
        onChange={(e) => setInvoiceProjectFilter(e.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm"
      >
        <option value="all">Todos los proyectos</option>

        {invoiceProjects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.nombre}
          </option>
        ))}
      </select>

    </div>

    <Card className="border-none shadow-md overflow-hidden">
      <div className="overflow-x-auto">

        <Table>

          <TableHeader className="bg-gray-50">
            <TableRow>

              <TableHead className="font-bold">
                Cliente
              </TableHead>

              <TableHead className="font-bold">
                Empresa
              </TableHead>

              <TableHead className="font-bold">
                Proyecto
              </TableHead>

              <TableHead className="font-bold">
                Nº Factura
              </TableHead>

              <TableHead className="font-bold text-right">
                Importe
              </TableHead>

              <TableHead className="font-bold text-center">
                Estado
              </TableHead>

              <TableHead className="font-bold">
                Fecha emisión
              </TableHead>

            </TableRow>
          </TableHeader>

          <TableBody className="bg-white">

            {filteredInvoices.length === 0 ? (

              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-gray-500"
                >
                  No hay facturas registradas.
                </TableCell>
              </TableRow>

            ) : (

              filteredInvoices.map((inv) => (

                <TableRow key={inv.id}>

                  {/* Cliente */}
                  <TableCell>
                    <div className="font-medium">
                      {inv.profiles?.nombre || "N/A"}
                    </div>

                    <div className="text-xs text-gray-500">
                      {inv.profiles?.email || ""}
                    </div>
                  </TableCell>

                  {/* Empresa */}
                  <TableCell>
                    {inv.companies?.company_name || "Sin empresa"}
                  </TableCell>

                  {/* Proyecto */}
                  <TableCell>
                    {inv.projects?.nombre || "Sin proyecto"}
                  </TableCell>

                  {/* Nº Factura */}
                  <TableCell className="font-mono text-sm">
                    {inv.invoice_number}
                  </TableCell>

                  {/* Importe */}
                  <TableCell className="text-right font-semibold">
                    {new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    }).format(inv.amount)}
                  </TableCell>

                  {/* Estado */}
                  <TableCell className="text-center">
                    <Badge
                      className={
                        inv.status === "paid"
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : inv.status === "pending"
                          ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                      }
                    >
                      {inv.status === "paid"
                        ? "Pagada"
                        : inv.status === "pending"
                        ? "Pendiente"
                        : inv.status}
                    </Badge>
                  </TableCell>

                  {/* Fecha emisión */}
                  <TableCell className="text-sm">
                    {inv.fecha_emision
                      ? format(
                          new Date(inv.fecha_emision),
                          "dd/MM/yyyy"
                        )
                      : "N/A"}
                  </TableCell>

                </TableRow>

              ))

            )}

          </TableBody>

        </Table>

      </div>
    </Card>

  </section>
</div>
{/* Crear factura - Modal */}
{showCreateInvoice && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">

    <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">

      {/* Cabecera */}
      <div className="flex items-center justify-between border-b px-6 py-5">

        <div>
          <h3 className="text-xl font-bold text-[#1E3A8A]">
            Crear factura
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Introduce los datos de la nueva factura.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateInvoice(false)}
          className="text-2xl leading-none text-gray-400 hover:text-gray-700"
        >
          ×
        </button>

      </div>


      {/* Contenido */}
      <div className="max-h-[75vh] overflow-y-auto px-6 py-6">

        <div className="space-y-6">

          {/* Datos principales */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
              Datos de la factura
            </h4>

            <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3">
  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
    Nº de factura
  </div>

  <div
  className={`mt-1 text-sm font-medium ${
    generatedInvoiceNumber
      ? "text-[#1E3A8A]"
      : "text-gray-400"
  }`}
>
  {generatedInvoiceNumber || "Se generará automáticamente"}
</div>
</div>
{invoiceError && (
  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    {invoiceError}
  </div>
)}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              {/* Empresa */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Empresa
                </label>

                <select
                  value={invoiceForm.company_id}
                  onChange={(e) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      company_id: e.target.value,
                      project_id: "",
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#1E3A8A]"
                >
                  <option value="">
                    Seleccionar empresa
                  </option>

                  {invoiceCompanies.map((company) => (
                    <option
                      key={company.id}
                      value={company.id}
                    >
                      {company.company_name}
                    </option>
                  ))}
                </select>
              </div>


              {/* Proyecto */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Proyecto
                </label>

                <select
                  value={invoiceForm.project_id}
                  onChange={(e) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      project_id: e.target.value,
                    })
                  }
                  disabled={!invoiceForm.company_id}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#1E3A8A] disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">
                    {invoiceForm.company_id
                      ? "Seleccionar proyecto"
                      : "Selecciona primero una empresa"}
                  </option>

                  {invoiceProjects
                    .filter(
                      (project) =>
                        project.company_id === invoiceForm.company_id
                    )
                    .map((project) => (
                      <option
                        key={project.id}
                        value={project.id}
                      >
                        {project.nombre}
                      </option>
                    ))}
                </select>
              </div>

            </div>
          </div>


          {/* Fechas */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
              Fechas
            </h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Fecha de emisión
                </label>

                <input
                  type="date"
                  value={invoiceForm.fecha_emision}
                  onChange={(e) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      fecha_emision: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1E3A8A]"
                />
              </div>


              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Fecha de vencimiento
                </label>

                <input
                  type="date"
                  value={invoiceForm.fecha_vencimiento}
                  onChange={(e) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      fecha_vencimiento: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1E3A8A]"
                />
              </div>

            </div>
          </div>


          {/* Concepto */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
              Concepto
            </h4>

            <textarea
              value={invoiceForm.concepto}
              onChange={(e) =>
                setInvoiceForm({
                  ...invoiceForm,
                  concepto: e.target.value,
                })
              }
              rows={4}
              placeholder="Describe el servicio o concepto de la factura..."
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1E3A8A]"
            />
          </div>


          {/* Datos económicos */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
              Datos económicos
            </h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              {/* Importe */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Base imponible (€)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoiceForm.amount}
                  onChange={(e) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      amount: e.target.value,
                    })
                  }
                  placeholder="0,00"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1E3A8A]"
                />
              </div>


              {/* IVA */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  IVA
                </label>

                <select
                  value={invoiceForm.iva}
                  onChange={(e) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      iva: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#1E3A8A]"
                >
                  <option value="0">0 %</option>
                  <option value="4">4 %</option>
                  <option value="10">10 %</option>
                  <option value="21">21 %</option>
                </select>
              </div>

            </div>


            {/* Total */}
            <div className="mt-4 rounded-lg bg-gray-50 px-4 py-4">

              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Base imponible</span>

                <span>
                  {Number(invoiceForm.amount || 0).toLocaleString(
                    "es-ES",
                    {
                      style: "currency",
                      currency: "EUR",
                    }
                  )}
                </span>
              </div>


              <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                <span>
                  IVA ({invoiceForm.iva}%)
                </span>

                <span>
                  {(
                    Number(invoiceForm.amount || 0) *
                    (Number(invoiceForm.iva || 0) / 100)
                  ).toLocaleString(
                    "es-ES",
                    {
                      style: "currency",
                      currency: "EUR",
                    }
                  )}
                </span>
              </div>


              <div className="mt-3 flex items-center justify-between border-t pt-3">

                <span className="font-bold text-gray-800">
                  Total
                </span>

                <span className="text-xl font-bold text-[#1E3A8A]">
                  {(
                    Number(invoiceForm.amount || 0) *
                    (1 + Number(invoiceForm.iva || 0) / 100)
                  ).toLocaleString(
                    "es-ES",
                    {
                      style: "currency",
                      currency: "EUR",
                    }
                  )}
                </span>

              </div>

            </div>
          </div>

        </div>

      </div>


      {/* Botones */}
      <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">

        <button
          type="button"
          onClick={() => setShowCreateInvoice(false)}
          className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          Cancelar
        </button>

        <button
  type="button"
  onClick={handleGenerateInvoiceNumber}
  disabled={creatingInvoice}
  className="rounded-lg bg-[#1E3A8A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#162D6B] disabled:cursor-not-allowed disabled:opacity-60"
>
  {creatingInvoice
    ? "Generando..."
    : generatedInvoiceNumber
    ? "Generar otro número"
    : "Crear factura"}
</button>

      </div>

    </div>

  </div>
)}
{/* Tickets Section */}
<div hidden={activeTab !== "tickets"}>
  <section className="space-y-6">

    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-[#1E3A8A]">
        Tickets de soporte
      </h2>

      <Badge variant="outline" className="bg-white">
        {tickets.length} tickets
      </Badge>
    </div>

    <Card className="border-none shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-bold">
                Cliente/Usuario
              </TableHead>

              <TableHead className="font-bold">
                Título
              </TableHead>

              <TableHead className="font-bold text-center">
                Estado
              </TableHead>

              <TableHead className="font-bold text-center">
                Prioridad
              </TableHead>

              <TableHead className="font-bold">
                Fecha creación
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="bg-white">
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-gray-500"
                >
                  No hay tickets de soporte activos.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((tk) => (
                <TableRow key={tk.id}>

                  <TableCell>
                    <div className="font-medium">
                      {tk.profiles?.nombre || "N/A"}
                    </div>

                    <div className="text-xs text-gray-500">
                      {tk.profiles?.email || ""}
                    </div>
                  </TableCell>

                  <TableCell className="font-medium">
                    {tk.title}
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge
                      variant={
                        tk.status === "open"
                          ? "destructive"
                          : "secondary"
                      }
                      className="capitalize"
                    >
                      {tk.status === "open"
                        ? "Abierto"
                        : tk.status === "closed"
                        ? "Cerrado"
                        : tk.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <span
                      className={`text-xs font-bold uppercase ${
                        tk.priority === "high"
                          ? "text-red-600"
                          : tk.priority === "medium"
                          ? "text-orange-600"
                          : "text-blue-600"
                      }`}
                    >
                      {tk.priority}
                    </span>
                  </TableCell>

                  <TableCell className="text-sm text-gray-500">
                    {formatDate(tk.created_at)}
                  </TableCell>

                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>

  </section>
</div>
</main>
      <footer className="bg-white border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2024 Modira. Panel de Gestión Interna.</p>
        </div>
      </footer>
    </div>
  );
}
