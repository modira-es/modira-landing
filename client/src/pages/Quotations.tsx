import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

import { toast } from "sonner";

interface Quotation {
  id: string;
  user_id: string;
  company_id: string | null;
  project_id: string | null;
  client_id: string | null;

  numero_presupuesto: string;
  titulo: string;
  descripcion_detallada: string | null;

  servicios_incluidos:
    | Array<{
        descripcion: string;
        cantidad: number;
        precio: number;
      }>
    | null;

  precio_base: number | string | null;
  iva_porcentaje: number | string | null;
  precio_total: number | string | null;

  estado: string | null;

  fecha_emision: string | null;
  fecha_validez: string | null;

  notas: string | null;

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

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("es-ES");
};

const normalizeStatus = (status: string | null) => {
  const value = (status || "").toLowerCase().trim();

  if (
    value === "aceptado" ||
    value === "accepted"
  ) {
    return "aceptado";
  }

  if (
    value === "pendiente" ||
    value === "pending"
  ) {
    return "pendiente";
  }

  if (
    value === "rechazado" ||
    value === "rejected"
  ) {
    return "rechazado";
  }

  return value || "pendiente";
};

const statusLabel = (status: string | null) => {
  switch (normalizeStatus(status)) {
    case "aceptado":
      return "Aceptado";

    case "pendiente":
      return "Pendiente";

    case "rechazado":
      return "Rechazado";

    default:
      return status || "Pendiente";
  }
};

function ClientQuotationsHeader({
  onBack,
}: {
  onBack: () => void;
}) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener(
      "scroll",
      handleScroll
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full h-[80px] z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-[#102A66]/10"
          : "bg-gradient-to-r from-[#102A66] to-[#173B8F] shadow-lg"
      }`}
    >
      <nav className="container mx-auto h-[80px] pl-10 pr-4 flex items-center justify-between">
        {/* LOGO + SECCIÓN */}
        <div className="flex items-center gap-3 h-full">
          <img
            src={
              isScrolled
                ? "/Images/logo-modira-azul.png"
                : "/Images/logo-modira-blanco.png"
            }
            alt="Modira"
            className="h-8 w-auto object-contain transition-all duration-300"
          />

          <span
            className={`modira-font text-xl leading-none flex items-center translate-y-[2px] transition-colors duration-300 ${
              isScrolled
                ? "text-[#102A66]"
                : "text-white"
            }`}
          >
            Presupuestos
          </span>
        </div>

        {/* DESCRIPCIÓN */}
        <div className="hidden md:flex flex-1 justify-center items-center px-8">
          <span
            className={`text-[14px] font-bold italic text-center transition-colors duration-300 ${
              isScrolled
                ? "text-[#102A66]/80"
                : "text-white/80"
            }`}
          >
            Consulta tus presupuestos y descarga sus documentos.
          </span>
        </div>

        {/* VOLVER */}
        <Button
          onClick={onBack}
          className={`text-[14px] font-semibold flex gap-2 items-center shadow-md transition-all duration-300 shrink-0 ${
            isScrolled
              ? "bg-[#102A66] text-white hover:bg-[#173B8F]"
              : "bg-white text-[#102A66] hover:bg-white/90"
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Área de Clientes
        </Button>
      </nav>
    </header>
  );
}

export default function Quotations() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [quotations, setQuotations] =
    useState<Quotation[]>([]);

  const [projects, setProjects] =
    useState<ProjectInfo[]>([]);

  const [companies, setCompanies] =
    useState<CompanyInfo[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("todos");

  /*
   * Presupuesto actualmente abierto
   * en la vista previa.
   */
  const [selectedQuotation, setSelectedQuotation] =
    useState<Quotation | null>(null);

  /*
   * PDF que se está abriendo/descargando.
   */
  const [openingPdf, setOpeningPdf] =
    useState<string | null>(null);

  /*
   * Presupuesto cuya respuesta se está procesando.
   */
  const [respondingQuotation, setRespondingQuotation] =
    useState<string | null>(null);

  // ============================================================
  // CARGAR DATOS
  // ============================================================

  const loadQuotationData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ========================================================
      // 1. PERFIL / EMPRESA
      // ========================================================

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      const companyId =
        profileData?.company_id || null;

      // ========================================================
      // 2. PRESUPUESTOS
      // ========================================================

      let query = supabase
        .from("quotations")
        .select(
          `
            id,
            user_id,
            company_id,
            project_id,
            client_id,
            numero_presupuesto,
            titulo,
            descripcion_detallada,
            servicios_incluidos,
            precio_base,
            iva_porcentaje,
            precio_total,
            estado,
            fecha_emision,
            fecha_validez,
            notas,
            document_path
          `
        )
        .order("fecha_emision", {
          ascending: false,
        });

      /*
       * Mantenemos la misma lógica que tenía
       * el componente anterior:
       *
       * - si tiene empresa, presupuestos de su empresa;
       * - si no, presupuestos propios.
       */
      if (companyId) {
        query = query.eq(
          "company_id",
          companyId
        );
      } else {
        query = query.eq(
          "user_id",
          user.id
        );
      }

      const {
        data: quotationData,
        error: quotationError,
      } = await query;

      if (quotationError) {
        throw quotationError;
      }

      const loadedQuotations =
        (quotationData || []) as Quotation[];

      setQuotations(
        loadedQuotations
      );

      // ========================================================
      // 3. PROYECTOS
      // ========================================================

      const projectIds = Array.from(
        new Set(
          loadedQuotations
            .map(
              (quotation) =>
                quotation.project_id
            )
            .filter(Boolean) as string[]
        )
      );

      if (projectIds.length > 0) {
        const {
          data: projectData,
          error: projectError,
        } = await supabase
          .from("projects")
          .select(
            "id, nombre, company_id"
          )
          .in(
            "id",
            projectIds
          );

        if (!projectError) {
          setProjects(
            (projectData ||
              []) as ProjectInfo[]
          );
        } else {
          console.warn(
            "[ClientQuotations] No se pudieron cargar los proyectos:",
            projectError
          );

          setProjects([]);
        }
      } else {
        setProjects([]);
      }

      // ========================================================
      // 4. EMPRESAS
      // ========================================================

      const companyIds = Array.from(
        new Set(
          loadedQuotations
            .map(
              (quotation) =>
                quotation.company_id
            )
            .filter(Boolean) as string[]
        )
      );

      if (companyIds.length > 0) {
        const {
          data: companyData,
          error: companyError,
        } = await supabase
          .from("companies")
          .select(
            "id, company_name"
          )
          .in(
            "id",
            companyIds
          );

        if (!companyError) {
          setCompanies(
            (companyData ||
              []) as CompanyInfo[]
          );
        } else {
          console.warn(
            "[ClientQuotations] No se pudieron cargar las empresas:",
            companyError
          );

          setCompanies([]);
        }
      } else {
        setCompanies([]);
      }
    } catch (err: any) {
      console.error(
        "[ClientQuotations] Error:",
        err
      );

      setError(
        err?.message ||
          "No se ha podido cargar la información de presupuestos."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotationData();
  }, [user]);

  // ============================================================
  // FILTROS
  // ============================================================

  const filteredQuotations =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return quotations.filter(
        (quotation) => {
          const projectName =
            projects.find(
              (project) =>
                project.id ===
                quotation.project_id
            )?.nombre || "";

          const companyName =
            companies.find(
              (company) =>
                company.id ===
                quotation.company_id
            )?.company_name || "";

          const matchesSearch =
            !query ||
            quotation.numero_presupuesto
              .toLowerCase()
              .includes(query) ||
            quotation.titulo
              .toLowerCase()
              .includes(query) ||
            projectName
              .toLowerCase()
              .includes(query) ||
            companyName
              .toLowerCase()
              .includes(query);

          const normalized =
            normalizeStatus(
              quotation.estado
            );

          const matchesStatus =
            statusFilter === "todos" ||
            normalized ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      quotations,
      projects,
      companies,
      search,
      statusFilter,
    ]);

  // ============================================================
  // CONTADORES
  // ============================================================

  const acceptedCount =
    useMemo(
      () =>
        quotations.filter(
          (quotation) =>
            normalizeStatus(
              quotation.estado
            ) === "aceptado"
        ).length,
      [quotations]
    );

  const pendingCount =
    useMemo(
      () =>
        quotations.filter(
          (quotation) =>
            normalizeStatus(
              quotation.estado
            ) === "pendiente"
        ).length,
      [quotations]
    );

  const rejectedCount =
    useMemo(
      () =>
        quotations.filter(
          (quotation) =>
            normalizeStatus(
              quotation.estado
            ) === "rechazado"
        ).length,
      [quotations]
    );

  const quotationStatus =
    useMemo(() => {
      if (quotations.length === 0) {
        return "sin_presupuestos";
      }

      if (pendingCount > 0) {
        return "pendiente";
      }

      if (acceptedCount > 0) {
        return "aceptado";
      }

      return "rechazado";
    }, [
      quotations,
      pendingCount,
      acceptedCount,
    ]);

  // ============================================================
  // HELPERS
  // ============================================================

  const getProjectName = (
    quotation: Quotation
  ) => {
    if (!quotation.project_id) {
      return "Sin proyecto";
    }

    return (
      projects.find(
        (project) =>
          project.id ===
          quotation.project_id
      )?.nombre ||
      "Sin proyecto"
    );
  };

  const getCompanyName = (
    quotation: Quotation
  ) => {
    if (!quotation.company_id) {
      return "Sin empresa";
    }

    return (
      companies.find(
        (company) =>
          company.id ===
          quotation.company_id
      )?.company_name ||
      "Sin empresa"
    );
  };

  // ============================================================
  // ESTADO BADGE
  // ============================================================

  const getStatusBadge = (
    estado: string | null
  ) => {
    const status =
      normalizeStatus(estado);

    if (status === "aceptado") {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          Aceptado
        </Badge>
      );
    }

    if (status === "rechazado") {
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          Rechazado
        </Badge>
      );
    }

    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        Pendiente
      </Badge>
    );
  };

  // ============================================================
  // RESPONDER PRESUPUESTO
  //
  // IMPORTANTE:
  // NO hacemos UPDATE directo sobre quotations.
  //
  // Usamos la RPC 011:
  //
  // respond_to_quotation(
  //   p_estado,
  //   p_quotation_id
  // )
  //
  // que ya existe para permitir:
  //
  // Pendiente -> Aceptado
  // Pendiente -> Rechazado
  // ============================================================

  const handleQuotationResponse =
    async (
      quotation: Quotation,
      response:
        | "Aceptado"
        | "Rechazado"
    ) => {
      const currentStatus =
        normalizeStatus(
          quotation.estado
        );

      if (
        currentStatus !==
        "pendiente"
      ) {
        toast.info(
          "Este presupuesto ya no está pendiente."
        );

        return;
      }

      setRespondingQuotation(
        quotation.id
      );

      try {
        const {
          data,
          error: responseError,
        } = await supabase.rpc(
          "respond_to_quotation",
          {
            p_estado: response,
            p_quotation_id:
              quotation.id,
          }
        );

        if (responseError) {
          throw responseError;
        }

        /*
         * Actualizamos inmediatamente el estado
         * en pantalla usando la respuesta de la RPC.
         */
        const updatedQuotation =
          data as Quotation;

        setQuotations(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                quotation.id
                  ? {
                      ...item,
                      estado:
                        updatedQuotation?.estado ||
                        response,
                    }
                  : item
            )
        );

        setSelectedQuotation(
          (current) =>
            current?.id ===
            quotation.id
              ? {
                  ...current,
                  estado:
                    updatedQuotation?.estado ||
                    response,
                }
              : current
        );

        if (
          response ===
          "Aceptado"
        ) {
          toast.success(
            "Presupuesto aceptado."
          );
        } else {
          toast.success(
            "Presupuesto rechazado."
          );
        }
      } catch (err: any) {
        console.error(
          "[ClientQuotations] Error respondiendo al presupuesto:",
          err
        );

        toast.error(
          err?.message ||
            "No se ha podido actualizar el estado del presupuesto."
        );
      } finally {
        setRespondingQuotation(
          null
        );
      }
    };

  // ============================================================
  // ABRIR PDF
  // ============================================================

  const openQuotationPdf =
    async (
      quotation: Quotation
    ) => {
      if (!quotation.document_path) {
        toast.info(
          "Este presupuesto todavía no tiene un PDF disponible."
        );

        return;
      }

      setOpeningPdf(
        quotation.id
      );

      try {
        const {
          data,
          error: signedUrlError,
        } = await supabase.storage
          .from("quotations")
          .createSignedUrl(
            quotation.document_path,
            300
          );

        if (signedUrlError) {
          throw signedUrlError;
        }

        if (!data?.signedUrl) {
          throw new Error(
            "No se pudo generar el enlace seguro del PDF."
          );
        }

        window.open(
          data.signedUrl,
          "_blank",
          "noopener,noreferrer"
        );
      } catch (err: any) {
        console.error(
          "[ClientQuotations] Error abriendo PDF:",
          err
        );

        toast.error(
          err?.message ||
            "No se ha podido abrir el PDF del presupuesto."
        );
      } finally {
        setOpeningPdf(null);
      }
    };

  // ============================================================
  // DESCARGAR PDF
  // ============================================================

  const downloadQuotationPdf =
    async (
      quotation: Quotation
    ) => {
      if (!quotation.document_path) {
        toast.info(
          "Este presupuesto todavía no tiene un PDF disponible."
        );

        return;
      }

      setOpeningPdf(
        quotation.id
      );

      try {
        const {
          data,
          error: signedUrlError,
        } = await supabase.storage
          .from("quotations")
          .createSignedUrl(
            quotation.document_path,
            300,
            {
              download: `${quotation.numero_presupuesto}.pdf`,
            }
          );

        if (signedUrlError) {
          throw signedUrlError;
        }

        if (!data?.signedUrl) {
          throw new Error(
            "No se pudo generar el enlace seguro del PDF."
          );
        }

        const response =
          await fetch(
            data.signedUrl
          );

        if (!response.ok) {
          throw new Error(
            "No se pudo descargar el PDF."
          );
        }

        const blob =
          await response.blob();

        const url =
          URL.createObjectURL(
            blob
          );

        const anchor =
          document.createElement(
            "a"
          );

        anchor.href = url;

        anchor.download =
          `${quotation.numero_presupuesto}.pdf`;

        document.body.appendChild(
          anchor
        );

        anchor.click();

        anchor.remove();

        URL.revokeObjectURL(
          url
        );
      } catch (err: any) {
        console.error(
          "[ClientQuotations] Error descargando PDF:",
          err
        );

        toast.error(
          err?.message ||
            "No se ha podido descargar el PDF del presupuesto."
        );
      } finally {
        setOpeningPdf(null);
      }
    };

  // ============================================================
  // LOADING
  // ============================================================

  if (
    authLoading ||
    loading
  ) {
    return (
      <div className="min-h-screen bg-white">
        <ClientQuotationsHeader
          onBack={() =>
            setLocation(
              "/area-cliente"
            )
          }
        />

        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[#173B8F]" />

            <p className="text-[#52627A]">
              Cargando tus presupuestos...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <ClientQuotationsHeader
        onBack={() =>
          setLocation(
            "/area-cliente"
          )
        }
      />

      <main className="container mx-auto px-4 pt-[112px] pb-12">
        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (
          <Card className="mb-8 border-2 border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />

              <div>
                <p className="font-semibold text-red-800">
                  No se han podido cargar los presupuestos
                </p>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* ======================================================
            ESTADO GENERAL
        ====================================================== */}

        <section className="mb-10">
          <Card className="border border-[#E8ECF2] bg-white p-6 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                {quotationStatus ===
                  "aceptado" && (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                )}

                {quotationStatus ===
                  "pendiente" && (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <AlertCircle className="h-6 w-6 text-amber-600" />
                  </div>
                )}

                {quotationStatus ===
                  "rechazado" && (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                )}

                {quotationStatus ===
                  "sin_presupuestos" && (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                    <FileText className="h-6 w-6 text-gray-500" />
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#52627A]">
                    Estado de presupuestos
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-[#102A66]">
                    {quotationStatus ===
                      "aceptado" &&
                      "Tienes presupuestos aceptados"}

                    {quotationStatus ===
                      "pendiente" &&
                      "Tienes presupuestos pendientes"}

                    {quotationStatus ===
                      "rechazado" &&
                      "Tienes presupuestos rechazados"}

                    {quotationStatus ===
                      "sin_presupuestos" &&
                      "Todavía no tienes presupuestos"}
                  </h2>

                  <p className="mt-1 text-[#52627A]">
                    {quotationStatus ===
                      "aceptado" &&
                      `Tienes ${acceptedCount} ${
                        acceptedCount === 1
                          ? "presupuesto aceptado"
                          : "presupuestos aceptados"
                      }.`}

                    {quotationStatus ===
                      "pendiente" &&
                      `Tienes ${pendingCount} ${
                        pendingCount === 1
                          ? "presupuesto pendiente"
                          : "presupuestos pendientes"
                      }.`}

                    {quotationStatus ===
                      "rechazado" &&
                      `Tienes ${rejectedCount} ${
                        rejectedCount === 1
                          ? "presupuesto rechazado"
                          : "presupuestos rechazados"
                      }.`}

                    {quotationStatus ===
                      "sin_presupuestos" &&
                      "Cuando se genere un presupuesto aparecerá aquí."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Badge
                  variant="outline"
                  className="border-green-200 bg-green-50 px-3 py-1.5 text-green-700"
                >
                  {acceptedCount} aceptados
                </Badge>

                {pendingCount >
                  0 && (
                  <Badge
                    variant="outline"
                    className="border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700"
                  >
                    {pendingCount} pendientes
                  </Badge>
                )}

                {rejectedCount >
                  0 && (
                  <Badge
                    variant="outline"
                    className="border-red-200 bg-red-50 px-3 py-1.5 text-red-700"
                  >
                    {rejectedCount} rechazados
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        </section>

        {/* ======================================================
            PRESUPUESTOS
        ====================================================== */}

        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#102A66]">
              Mis presupuestos
            </h2>

            <p className="mt-1 text-[#52627A]">
              Consulta el detalle y descarga el PDF de cada presupuesto disponible.
            </p>
          </div>

          <Card className="overflow-hidden border border-[#E8ECF2] bg-white">
            {/* ==================================================
                BUSCADOR
            ================================================== */}

            <div className="border-b border-[#E8ECF2] p-5 md:p-6">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A98AB]" />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Buscar por presupuesto, proyecto o empresa..."
                    className="h-11 w-full rounded-lg border border-[#DCE2EA] bg-white pl-10 pr-4 text-sm text-[#182230] outline-none transition focus:border-[#173B8F] focus:ring-2 focus:ring-[#173B8F]/10"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                  className="h-11 rounded-lg border border-[#DCE2EA] bg-white px-4 text-sm text-[#182230] outline-none focus:border-[#173B8F]"
                >
                  <option value="todos">
                    Todos los estados
                  </option>

                  <option value="aceptado">
                    Aceptados
                  </option>

                  <option value="pendiente">
                    Pendientes
                  </option>

                  <option value="rechazado">
                    Rechazados
                  </option>
                </select>
              </div>
            </div>

            {/* ==================================================
                TABLA
            ================================================== */}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                {filteredQuotations.length >
                  0 && (
                  <thead className="bg-[#F8FAFC]">
                    <tr className="border-b border-[#E8ECF2]">
                      <th className="px-6 py-4 text-left text-sm font-bold text-[#182230]">
                        Nº Presupuesto
                      </th>

                      <th className="px-6 py-4 text-left text-sm font-bold text-[#182230]">
                        Proyecto
                      </th>

                      <th className="px-6 py-4 text-left text-sm font-bold text-[#182230]">
                        Fecha emisión
                      </th>

                      <th className="px-6 py-4 text-left text-sm font-bold text-[#182230]">
                        Validez
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
                )}

                <tbody>
                  {filteredQuotations.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-16 text-center text-[#52627A]"
                      >
                        <FileText className="mx-auto mb-3 h-10 w-10 text-[#B7C0CD]" />

                        <p className="font-semibold text-[#182230]">
                          {quotations.length ===
                          0
                            ? "No tienes presupuestos registrados"
                            : "No se han encontrado presupuestos"}
                        </p>

                        <p className="mt-1 text-sm">
                          {quotations.length ===
                          0
                            ? "Los presupuestos emitidos para tu cuenta aparecerán aquí."
                            : "Prueba a cambiar el filtro o la búsqueda."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredQuotations.map(
                      (quotation) => {
                        const status =
                          normalizeStatus(
                            quotation.estado
                          );

                        const hasPdf =
                          Boolean(
                            quotation.document_path
                          );

                        return (
                          <tr
                            key={
                              quotation.id
                            }
                            className="border-b border-[#EEF1F5] transition hover:bg-[#FAFBFD]"
                          >
                            {/* Nº PRESUPUESTO */}
                            <td className="px-6 py-5">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedQuotation(
                                    quotation
                                  )
                                }
                                className="font-mono text-sm font-semibold text-[#173B8F] hover:underline"
                              >
                                {
                                  quotation.numero_presupuesto
                                }
                              </button>
                            </td>

                            {/* PROYECTO */}
                            <td className="px-6 py-5">
                              <div className="font-medium text-[#182230]">
                                {getProjectName(
                                  quotation
                                )}
                              </div>

                              <div className="mt-1 text-xs text-[#7B8798]">
                                {getCompanyName(
                                  quotation
                                )}
                              </div>
                            </td>

                            {/* FECHA EMISIÓN */}
                            <td className="px-6 py-5 text-sm text-[#52627A]">
                              {formatDate(
                                quotation.fecha_emision
                              )}
                            </td>

                            {/* VALIDEZ */}
                            <td className="px-6 py-5 text-sm text-[#52627A]">
                              {formatDate(
                                quotation.fecha_validez
                              )}
                            </td>

                            {/* IMPORTE */}
                            <td className="px-6 py-5 text-right font-semibold text-[#182230]">
                              {currency.format(
                                Number(
                                  quotation.precio_total ||
                                    0
                                )
                              )}
                            </td>

                            {/* ESTADO */}
                            <td className="px-6 py-5 text-center">
                              {getStatusBadge(
                                quotation.estado
                              )}
                            </td>

                            {/* ACCIONES */}
                            <td className="px-6 py-5">
                              <div className="flex justify-end gap-2">

  {/* VER */}
<Button
  type="button"
  variant="outline"
  size="sm"
  onClick={() =>
    setSelectedQuotation(quotation)
  }
  className="gap-2 border-[#DCE2EA] text-[#173B8F] hover:bg-[#F4F7FB]"
>
  <Eye className="h-4 w-4" />
  Ver
</Button>

  <Button
  type="button"
  variant="outline"
  size="sm"
  disabled={
    !quotation.document_path ||
    openingPdf === quotation.id
  }
  onClick={() =>
    downloadQuotationPdf(quotation)
  }
  className="gap-2 border-[#DCE2EA] text-[#173B8F] hover:bg-[#F4F7FB]"
>
  {openingPdf === quotation.id ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Download className="h-4 w-4" />
  )}

  PDF
</Button>

  {status === "pendiente" && (
    <Button
      type="button"
      size="sm"
      disabled={
        respondingQuotation === quotation.id
      }
      onClick={() =>
        handleQuotationResponse(
          quotation,
          "Aceptado"
        )
      }
      className="gap-2 bg-[#173B8F] text-white hover:bg-[#102A66]"
    >
      {respondingQuotation === quotation.id ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="h-4 w-4" />
      )}

      {respondingQuotation === quotation.id
        ? "Procesando..."
        : "Aceptar"}
    </Button>
  )}

</div>
                            </td>
                          </tr>
                        );
                      }
                    )
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </main>

      {/* ========================================================
          MODAL DETALLE DEL PRESUPUESTO
      ======================================================== */}

      {selectedQuotation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedQuotation(
                null
              );
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="flex items-start justify-between border-b border-[#E8ECF2] px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#52627A]">
                  Detalle de presupuesto
                </p>

                <h3 className="mt-1 font-mono text-xl font-bold text-[#102A66]">
                  {
                    selectedQuotation.numero_presupuesto
                  }
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedQuotation(
                    null
                  )
                }
                className="rounded-lg p-2 text-[#7B8798] hover:bg-[#F4F6F9] hover:text-[#182230]"
                aria-label="Cerrar"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* ==================================================
                CONTENIDO
            ================================================== */}

            <div className="space-y-6 px-6 py-6">
              {/* DATOS PRINCIPALES */}
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <p className="text-sm text-[#7B8798]">
                    Proyecto
                  </p>

                  <p className="mt-1 font-semibold text-[#182230]">
                    {getProjectName(
                      selectedQuotation
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-[#7B8798]">
                    Empresa
                  </p>

                  <p className="mt-1 font-semibold text-[#182230]">
                    {getCompanyName(
                      selectedQuotation
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-[#7B8798]">
                    Fecha de emisión
                  </p>

                  <p className="mt-1 font-semibold text-[#182230]">
                    {formatDate(
                      selectedQuotation.fecha_emision
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-[#7B8798]">
                    Fecha de validez
                  </p>

                  <p className="mt-1 font-semibold text-[#182230]">
                    {formatDate(
                      selectedQuotation.fecha_validez
                    )}
                  </p>
                </div>
              </div>

              {/* ==================================================
                  CONCEPTO
              ================================================== */}

              {(selectedQuotation.titulo ||
                selectedQuotation.descripcion_detallada) && (
                <div className="rounded-xl bg-[#F7F9FC] p-4">
                  <p className="text-sm font-semibold text-[#52627A]">
                    Concepto
                  </p>

                  {selectedQuotation.titulo && (
                    <p className="mt-1 font-semibold text-[#182230]">
                      {selectedQuotation.titulo}
                    </p>
                  )}

                  {selectedQuotation.descripcion_detallada && (
                    <p className="mt-2 whitespace-pre-line text-[#182230]">
                      {
                        selectedQuotation.descripcion_detallada
                      }
                    </p>
                  )}
                </div>
              )}

              {/* ==================================================
                  SERVICIOS
              ================================================== */}

              {Array.isArray(
                selectedQuotation.servicios_incluidos
              ) &&
                selectedQuotation
                  .servicios_incluidos
                  .length > 0 && (
                  <div>
                    <p className="mb-3 text-sm font-semibold text-[#52627A]">
                      Servicios incluidos
                    </p>

                    <div className="space-y-3">
                      {selectedQuotation.servicios_incluidos.map(
                        (
                          service,
                          index
                        ) => (
                          <div
                            key={
                              index
                            }
                            className="rounded-xl bg-[#F7F9FC] p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold text-[#182230]">
                                  {
                                    service.descripcion
                                  }
                                </p>

                                <p className="mt-1 text-sm text-[#7B8798]">
                                  Cantidad:{" "}
                                  {
                                    service.cantidad
                                  }
                                </p>
                              </div>

                              <p className="whitespace-nowrap font-semibold text-[#173B8F]">
                                {currency.format(
                                  Number(
                                    service.precio ||
                                      0
                                  )
                                )}
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* ==================================================
                  NOTAS
              ================================================== */}

              {selectedQuotation.notas && (
                <div className="rounded-xl bg-[#F7F9FC] p-4">
                  <p className="text-sm font-semibold text-[#52627A]">
                    Notas
                  </p>

                  <p className="mt-1 whitespace-pre-line text-[#182230]">
                    {
                      selectedQuotation.notas
                    }
                  </p>
                </div>
              )}

              {/* ==================================================
                  IMPORTE
              ================================================== */}

              <div className="rounded-xl border border-[#E8ECF2] p-5">
                <div className="flex items-center justify-between text-sm text-[#52627A]">
                  <span>
                    Base imponible
                  </span>

                  <span>
                    {currency.format(
                      Number(
                        selectedQuotation.precio_base ||
                          0
                      )
                    )}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm text-[#52627A]">
                  <span>
                    IVA (
                    {Number(
                      selectedQuotation.iva_porcentaje ||
                        0
                    )}
                    %)
                  </span>

                  <span>
                    {currency.format(
                      Number(
                        selectedQuotation.precio_total ||
                          0
                      ) -
                        Number(
                          selectedQuotation.precio_base ||
                            0
                        )
                    )}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#E8ECF2] pt-4">
                  <span className="font-bold text-[#182230]">
                    Total
                  </span>

                  <span className="text-2xl font-bold text-[#173B8F]">
                    {currency.format(
                      Number(
                        selectedQuotation.precio_total ||
                          0
                      )
                    )}
                  </span>
                </div>
              </div>

              {/* ==================================================
                  ESTADO
              ================================================== */}

              <div className="flex items-center justify-between rounded-xl bg-[#F7F9FC] p-4">
                <div className="flex items-center gap-3">
                  {normalizeStatus(
                    selectedQuotation.estado
                  ) ===
                  "aceptado" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : normalizeStatus(
                      selectedQuotation.estado
                    ) ===
                    "rechazado" ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  )}

                  <div>
                    <p className="text-sm font-semibold text-[#182230]">
                      {statusLabel(
                        selectedQuotation.estado
                      )}
                    </p>

                    <p className="text-xs text-[#7B8798]">
                      Estado actual del presupuesto
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ==================================================
                BOTONES
            ================================================== */}

            <div className="flex flex-col gap-3 border-t border-[#E8ECF2] bg-[#FAFBFD] px-6 py-4 sm:flex-row sm:flex-wrap sm:justify-end">
              {/* CERRAR */}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setSelectedQuotation(
                    null
                  )
                }
              >
                Cerrar
              </Button>

              {/* VER PDF */}
              <Button
                type="button"
                variant="outline"
                disabled={
                  !selectedQuotation.document_path ||
                  openingPdf ===
                    selectedQuotation.id
                }
                onClick={() =>
                  openQuotationPdf(
                    selectedQuotation
                  )
                }
                className="gap-2"
              >
                {openingPdf ===
                selectedQuotation.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}

                Ver PDF
              </Button>

              {/* DESCARGAR PDF */}
              <Button
                type="button"
                variant="outline"
                disabled={
                  !selectedQuotation.document_path ||
                  openingPdf ===
                    selectedQuotation.id
                }
                onClick={() =>
                  downloadQuotationPdf(
                    selectedQuotation
                  )
                }
                className="gap-2"
              >
                {openingPdf ===
                selectedQuotation.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}

                Descargar PDF
              </Button>

              {/* ==================================================
                  ACEPTAR
                  SOLO SI ESTÁ PENDIENTE
              ================================================== */}

              {normalizeStatus(
                selectedQuotation.estado
              ) === "pendiente" && (
                <Button
                  type="button"
                  disabled={
                    respondingQuotation ===
                    selectedQuotation.id
                  }
                  onClick={() =>
                    handleQuotationResponse(
                      selectedQuotation,
                      "Aceptado"
                    )
                  }
                  className="gap-2 bg-[#173B8F] text-white hover:bg-[#102A66]"
                >
                  {respondingQuotation ===
                  selectedQuotation.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}

                  {respondingQuotation ===
                  selectedQuotation.id
                    ? "Procesando..."
                    : "Aceptar"}
                </Button>
              )}

              {/* ==================================================
                  RECHAZAR
                  MANTENEMOS LA FUNCIONALIDAD EXISTENTE
              ================================================== */}

              {normalizeStatus(
                selectedQuotation.estado
              ) === "pendiente" && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    respondingQuotation ===
                    selectedQuotation.id
                  }
                  onClick={() =>
                    handleQuotationResponse(
                      selectedQuotation,
                      "Rechazado"
                    )
                  }
                  className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {respondingQuotation ===
                  selectedQuotation.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}

                  Rechazar
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          FOOTER
      ======================================================== */}

      <footer className="mt-16 border-t bg-white py-8">
        <div className="container mx-auto px-4 text-center text-sm text-[#7B8798]">
          <p>
            ©{" "}
            {new Date().getFullYear()}{" "}
            Modira. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}