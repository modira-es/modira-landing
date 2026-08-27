import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Download,
  Eye,
  ArrowLeft,
  Calendar,
  ShieldCheck,
  Zap,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function QuotationView() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [quotation, setQuotation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [pdfLoading, setPdfLoading] = useState<
    "view" | "download" | null
  >(null);

  const [responseLoading, setResponseLoading] = useState<
    "accept" | "reject" | null
  >(null);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
      return;
    }

    if (id && user) {
      fetchQuotation();
    }
  }, [id, user, authLoading]);

  // ============================================================
  // CARGAR PRESUPUESTO
  // ============================================================

  const fetchQuotation = async () => {
    if (!user || !id) return;

    setLoading(true);

    try {
      /*
       * La seguridad de acceso al presupuesto ya está controlada
       * por las políticas RLS de quotations.
       *
       * El cliente solo puede consultar presupuestos de su empresa.
       */
      const { data, error } = await supabase
        .from("quotations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      setQuotation(data);
    } catch (error) {
      console.error(
        "[QuotationView] Error fetching quotation:",
        error
      );

      setQuotation(null);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // PDF — ABRIR
  // ============================================================

  const handleViewPdf = async () => {
    if (!quotation?.document_path) {
      alert(
        "Este presupuesto todavía no tiene un PDF adjunto."
      );
      return;
    }

    /*
     * Abrimos la ventana inmediatamente para evitar que
     * el navegador bloquee el popup después del await.
     */
    const newWindow = window.open(
      "",
      "_blank"
    );

    if (!newWindow) {
      alert(
        "El navegador ha bloqueado la ventana del PDF. Permite las ventanas emergentes para este sitio."
      );
      return;
    }

    setPdfLoading("view");

    try {
      const { data, error } = await supabase.storage
        .from("quotations")
        .createSignedUrl(
          quotation.document_path,
          60 * 10
        );

      if (error) {
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error(
          "No se pudo generar la URL segura del PDF."
        );
      }

      newWindow.location.href =
        data.signedUrl;
    } catch (error: any) {
      console.error(
        "[QuotationView] Error opening quotation PDF:",
        error
      );

      newWindow.close();

      alert(
        error?.message ||
          "No se ha podido abrir el PDF del presupuesto."
      );
    } finally {
      setPdfLoading(null);
    }
  };

  // ============================================================
  // PDF — DESCARGAR
  // ============================================================

  const handleDownloadPdf = async () => {
    if (!quotation?.document_path) {
      alert(
        "Este presupuesto todavía no tiene un PDF adjunto."
      );
      return;
    }

    setPdfLoading("download");

    try {
      const { data, error } = await supabase.storage
        .from("quotations")
        .createSignedUrl(
          quotation.document_path,
          60 * 10,
          {
            download:
              `${quotation.numero_presupuesto}.pdf`,
          }
        );

      if (error) {
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error(
          "No se pudo generar la URL segura del PDF."
        );
      }

      const link =
        document.createElement("a");

      link.href = data.signedUrl;
      link.download =
        `${quotation.numero_presupuesto}.pdf`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      console.error(
        "[QuotationView] Error downloading quotation PDF:",
        error
      );

      alert(
        error?.message ||
          "No se ha podido descargar el PDF del presupuesto."
      );
    } finally {
      setPdfLoading(null);
    }
  };

  // ============================================================
  // ACEPTAR / RECHAZAR PRESUPUESTO
  // ============================================================

  const handleQuotationResponse = async (
    response: "Aceptado" | "Rechazado"
  ) => {
    if (!quotation?.id) return;

    const isAccepting =
      response === "Aceptado";

    const confirmed = window.confirm(
      isAccepting
        ? "¿Quieres aceptar este presupuesto?"
        : "¿Quieres rechazar este presupuesto?"
    );

    if (!confirmed) {
      return;
    }

    setResponseLoading(
      isAccepting ? "accept" : "reject"
    );

    try {
      /*
       * IMPORTANTE:
       *
       * El cliente NO debe hacer UPDATE directo sobre
       * quotations porque la arquitectura RLS actual
       * reserva UPDATE para workers.
       *
       * Esta llamada utiliza una RPC específica para que
       * PostgreSQL compruebe que el presupuesto pertenece
       * a la empresa del usuario y permita únicamente
       * cambiar su estado.
       */
      const { data, error } =
        await supabase.rpc(
          "respond_to_quotation",
          {
            p_quotation_id: quotation.id,
            p_estado: response,
          }
        );

      if (error) {
        throw error;
      }

      setQuotation(
        data || {
          ...quotation,
          estado: response,
        }
      );

      alert(
        isAccepting
          ? "Presupuesto aceptado correctamente."
          : "Presupuesto rechazado correctamente."
      );
    } catch (error: any) {
      console.error(
        "[QuotationView] Error responding to quotation:",
        error
      );

      alert(
        error?.message ||
          `No se ha podido ${
            isAccepting
              ? "aceptar"
              : "rechazar"
          } el presupuesto.`
      );
    } finally {
      setResponseLoading(null);
    }
  };

  // ============================================================
  // ESTADO
  // ============================================================

  const getStatusConfig = (
    status: string
  ) => {
    switch (
      String(status || "").toLowerCase()
    ) {
      case "pendiente":
        return {
          label: "Pendiente de aceptación",
          color: "text-yellow-600",
          bg: "bg-yellow-50",
          icon: AlertCircle,
        };

      case "aceptado":
        return {
          label: "Aceptado",
          color: "text-green-600",
          bg: "bg-green-50",
          icon: CheckCircle2,
        };

      case "rechazado":
        return {
          label: "Rechazado",
          color: "text-red-600",
          bg: "bg-red-50",
          icon: XCircle,
        };

      default:
        return {
          label:
            status || "Sin estado",
          color: "text-gray-500",
          bg: "bg-gray-100",
          icon: Clock,
        };
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A]" />
      </div>
    );
  }

  // ============================================================
  // NO ENCONTRADO
  // ============================================================

  if (!quotation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FA] p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Presupuesto no encontrado
        </h1>

        <Button
          onClick={() =>
            setLocation("/area-cliente")
          }
        >
          Volver al Área de Cliente
        </Button>
      </div>
    );
  }

  // ============================================================
  // DATOS CALCULADOS
  // ============================================================

  const status = getStatusConfig(
    quotation.estado
  );

  const StatusIcon = status.icon;

  const currencyFormatter =
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    });

  const hasPdf =
    !!quotation.document_path;

  const precioBase = Number(
    quotation.precio_base || 0
  );

  const ivaPorcentaje = Number(
    quotation.iva_porcentaje || 0
  );

  const precioTotal = Number(
    quotation.precio_total || 0
  );

  const ivaAmount =
    precioTotal - precioBase;

  const isPending =
    String(
      quotation.estado || ""
    ).toLowerCase() === "pendiente";

  const services =
    Array.isArray(
      quotation.servicios_incluidos
    )
      ? quotation.servicios_incluidos
      : [];

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-20">

      {/* =====================================================
          TOP BAR — ÚNICO LUGAR PARA LAS ACCIONES
      ====================================================== */}

      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">

          {/* VOLVER */}

          <Button
  variant="ghost"
  onClick={() =>
    setLocation("/area-cliente")
  }
  className="flex gap-2 self-start hover:bg-[#1E3A8A] hover:text-white"
>
  <ArrowLeft className="w-4 h-4" />
  Volver
</Button>

          {/* ACCIONES */}

          <div className="flex flex-wrap gap-2 justify-end">

            {/* VER PDF */}

            {hasPdf && (
              <Button
                variant="outline"
                onClick={handleViewPdf}
                disabled={
                  pdfLoading !== null
                }
                className="flex gap-2 hover:bg-[#1E3A8A] hover:text-white hover:border-[#1E3A8A]"
              >
                {pdfLoading === "view" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}

                Ver PDF
              </Button>
            )}

            {/* DESCARGAR PDF */}

            {hasPdf && (
              <Button
                variant="outline"
                onClick={
                  handleDownloadPdf
                }
                disabled={
                  pdfLoading !== null
                }
                className="flex gap-2 hover:bg-[#1E3A8A] hover:text-white hover:border-[#1E3A8A]"
              >
                {pdfLoading ===
                "download" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}

                Descargar PDF
              </Button>
            )}

            {/* ACEPTAR */}

            {isPending && (
              <Button
                onClick={() =>
                  handleQuotationResponse(
                    "Aceptado"
                  )
                }
                disabled={
                  responseLoading !== null
                }
                className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white flex gap-2"
              >
                {responseLoading ===
                "accept" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}

                Aceptar presupuesto
              </Button>
            )}

            {/* RECHAZAR */}

            {isPending && (
              <Button
                variant="outline"
                onClick={() =>
                  handleQuotationResponse(
                    "Rechazado"
                  )
                }
                disabled={
                  responseLoading !== null
                }
                className="flex gap-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                {responseLoading ===
                "reject" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}

                Rechazar
              </Button>
            )}

          </div>
        </div>
      </div>

      {/* =====================================================
          CONTENIDO
      ====================================================== */}

      <div className="max-w-5xl mx-auto px-4 mt-8">

        {/* ===================================================
            CABECERA
        ==================================================== */}

        <Card className="p-8 border-none shadow-sm mb-8 overflow-hidden relative">

          <div className="absolute top-0 right-0 w-32 h-32 bg-[#1E3A8A]/5 rounded-bl-full -mr-16 -mt-16" />

          <div className="flex flex-col md:flex-row justify-between gap-8 relative">

            <div className="space-y-4">

              {/* ESTADO */}

              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${status.bg} ${status.color} text-sm font-bold`}
              >
                <StatusIcon className="w-4 h-4" />

                {status.label}
              </div>

              {/* TÍTULO */}

              <h1 className="text-4xl font-bold text-[#1E3A8A] break-words">
                {quotation.titulo}
              </h1>

              {/* NÚMERO */}

              <p className="text-gray-500 font-mono text-lg">
                {quotation.numero_presupuesto}
              </p>

            </div>

            {/* FECHAS */}

            <div className="text-right space-y-2">

              {quotation.fecha_emision && (
                <div className="flex items-center justify-end gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />

                  <span>
                    Emitido:{" "}
                    {new Date(
                      quotation.fecha_emision
                    ).toLocaleDateString(
                      "es-ES"
                    )}
                  </span>
                </div>
              )}

              {quotation.fecha_validez && (
                <div className="flex items-center justify-end gap-2 text-red-500 font-medium">
                  <Clock className="w-4 h-4" />

                  <span>
                    Válido hasta:{" "}
                    {new Date(
                      quotation.fecha_validez
                    ).toLocaleDateString(
                      "es-ES"
                    )}
                  </span>
                </div>
              )}

            </div>
          </div>
        </Card>

        {/* ===================================================
            GRID PRINCIPAL
        ==================================================== */}

        <div className="grid md:grid-cols-3 gap-8">

          {/* =================================================
              DETALLES
          ================================================== */}

          <div className="md:col-span-2 space-y-8">

            {/* DESCRIPCIÓN + SERVICIOS */}

            <Card className="p-8 border-none shadow-sm">

              {/* DESCRIPCIÓN */}

              <h2 className="text-xl font-bold text-[#1E3A8A] mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5" />

                Descripción del Proyecto
              </h2>

              <div className="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                {quotation.descripcion_detallada ||
                  "No hay descripción disponible."}
              </div>

              {/* SERVICIOS */}

              <h2 className="text-xl font-bold text-[#1E3A8A] mt-12 mb-6">
                Servicios Incluidos
              </h2>

              <div className="space-y-4">

                {services.length > 0 ? (
                  services.map(
                    (
                      item: any,
                      idx: number
                    ) => {

                      /*
                       * IMPORTANTE:
                       *
                       * Los servicios se guardan como:
                       * {
                       *   descripcion,
                       *   cantidad,
                       *   precio
                       * }
                       *
                       * NO existe necesariamente item.total.
                       *
                       * Por eso calculamos:
                       *
                       * cantidad × precio
                       */

                      const cantidad =
                        Number(
                          item?.cantidad || 0
                        );

                      const precioUnitario =
                        Number(
                          item?.precio || 0
                        );

                      const totalServicio =
                        cantidad *
                        precioUnitario;

                      return (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100"
                        >

                          <div className="min-w-0">

                            <p className="font-bold text-gray-900 break-words">
                              {item?.descripcion ||
                                "Servicio"}
                            </p>

                            <p className="text-sm text-gray-500 mt-1">
                              Cantidad:{" "}
                              {cantidad}
                            </p>

                            <p className="text-sm text-gray-500">
                              Precio unitario:{" "}
                              {currencyFormatter.format(
                                precioUnitario
                              )}
                            </p>

                          </div>

                          <p className="font-bold text-[#1E3A8A] whitespace-nowrap">
                            {currencyFormatter.format(
                              totalServicio
                            )}
                          </p>

                        </div>
                      );
                    }
                  )
                ) : (
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-500">
                    No hay servicios incluidos.
                  </div>
                )}

              </div>

            </Card>

            {/* =================================================
                GARANTÍA
            ================================================== */}

            <Card className="p-8 border-none shadow-sm bg-[#1E3A8A] text-white">

              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />

                Garantía Modira
              </h2>

              <p className="opacity-90 leading-relaxed">
                Todas nuestras automatizaciones
                incluyen 3 meses de soporte técnico
                y mantenimiento gratuito para
                asegurar que tu negocio no se
                detenga. Nos comprometemos a una
                disponibilidad del 99.9% en todos
                nuestros flujos críticos.
              </p>

            </Card>

          </div>

          {/* =================================================
              RESUMEN ECONÓMICO
          ================================================== */}

          <div>

            <Card className="p-6 border-none shadow-sm md:sticky md:top-24">

              <h2 className="text-lg font-bold text-[#1E3A8A] mb-6">
                Resumen Económico
              </h2>

              <div className="space-y-4">

                {/* BASE */}

                <div className="flex justify-between text-gray-600 gap-4">
                  <span>
                    Base Imponible
                  </span>

                  <span className="whitespace-nowrap">
                    {currencyFormatter.format(
                      precioBase
                    )}
                  </span>
                </div>

                {/* IVA */}

                <div className="flex justify-between text-gray-600 gap-4">
                  <span>
                    IVA ({ivaPorcentaje}%)
                  </span>

                  <span className="whitespace-nowrap">
                    {currencyFormatter.format(
                      ivaAmount
                    )}
                  </span>
                </div>

                {/* TOTAL */}

                <div className="pt-4 border-t border-gray-100 flex justify-between items-center gap-4">

                  <span className="text-lg font-bold text-gray-900">
                    Total
                  </span>

                  <span className="text-2xl font-bold text-[#1E3A8A] whitespace-nowrap">
                    {currencyFormatter.format(
                      precioTotal
                    )}
                  </span>

                </div>

              </div>

            </Card>

          </div>

        </div>
      </div>
    </div>
  );
}