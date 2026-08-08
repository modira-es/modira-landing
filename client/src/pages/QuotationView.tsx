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
  CreditCard,
  ArrowLeft,
  Building2,
  Calendar,
  ShieldCheck,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function QuotationView() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [quotation, setQuotation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
      return;
    }
    if (id) fetchQuotation();
  }, [id, user, authLoading]);

  const fetchQuotation = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get user profile to check company_id
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id, rol")
        .eq("id", user.id)
        .single();

      const { data, error } = await supabase
        .from("quotations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      // Access control:
      // 1. If user is admin, allow.
      // 2. If user has company_id, it must match quotation's company_id.
      // 3. Otherwise, user_id must match.
      const isAdmin = profileData?.rol === "admin";
      const hasCompanyAccess = profileData?.company_id && data.company_id === profileData.company_id;
      const isOwner = data.user_id === user.id;

      if (!isAdmin && !hasCompanyAccess && !isOwner) {
        console.error("Access denied to quotation");
        setQuotation(null);
        return;
      }

      setQuotation(data);
    } catch (error) {
      console.error("Error fetching quotation:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "borrador": return { label: "Borrador", color: "text-gray-500", bg: "bg-gray-100", icon: Clock };
      case "pendiente": return { label: "Pendiente de Pago", color: "text-yellow-600", bg: "bg-yellow-50", icon: AlertCircle };
      case "pagado": return { label: "Pagado", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 };
      case "rechazado": return { label: "Rechazado", color: "text-red-600", bg: "bg-red-50", icon: XCircle };
      default: return { label: status, color: "text-gray-500", bg: "bg-gray-100", icon: Clock };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A]"></div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FA] p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Presupuesto no encontrado</h1>
        <Button onClick={() => setLocation("/area-cliente")}>Volver al Área de Cliente</Button>
      </div>
    );
  }

  const status = getStatusConfig(quotation.estado);
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-20">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => setLocation("/area-cliente")} className="flex gap-2">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" className="flex gap-2">
              <Download className="w-4 h-4" /> Descargar PDF
            </Button>
            {quotation.estado === 'pendiente' && (
              <Button className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white flex gap-2">
                <CreditCard className="w-4 h-4" /> Aceptar y Pagar
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8">
        {/* Header Card */}
        <Card className="p-8 border-none shadow-sm mb-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#1E3A8A]/5 rounded-bl-full -mr-16 -mt-16"></div>
          <div className="flex flex-col md:flex-row justify-between gap-8 relative">
            <div className="space-y-4">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${status.bg} ${status.color} text-sm font-bold`}>
                <StatusIcon className="w-4 h-4" />
                {status.label}
              </div>
              <h1 className="text-4xl font-bold text-[#1E3A8A]">{quotation.titulo}</h1>
              <p className="text-gray-500 font-mono text-lg">{quotation.numero_presupuesto}</p>
            </div>
            <div className="text-right space-y-2">
              <div className="flex items-center justify-end gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Emitido: {new Date(quotation.fecha_emision).toLocaleDateString('es-ES')}</span>
              </div>
              {quotation.fecha_validez && (
                <div className="flex items-center justify-end gap-2 text-red-500 font-medium">
                  <Clock className="w-4 h-4" />
                  <span>Válido hasta: {new Date(quotation.fecha_validez).toLocaleDateString('es-ES')}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Details */}
          <div className="md:col-span-2 space-y-8">
            <Card className="p-8 border-none shadow-sm">
              <h2 className="text-xl font-bold text-[#1E3A8A] mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5" /> Descripción del Proyecto
              </h2>
              <div className="prose max-w-none text-gray-700 leading-relaxed">
                {quotation.descripcion_detallada || "No hay descripción disponible."}
              </div>

              <h2 className="text-xl font-bold text-[#1E3A8A] mt-12 mb-6">Servicios Incluidos</h2>
              <div className="space-y-4">
                {quotation.servicios_incluidos?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-4 rounded-lg bg-gray-50 border border-gray-100">
                    <div>
                      <p className="font-bold text-gray-900">{item.descripcion}</p>
                      <p className="text-sm text-gray-500">Cantidad: {item.cantidad}</p>
                    </div>
                    <p className="font-bold text-[#1E3A8A]">
                      {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(item.total)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-8 border-none shadow-sm bg-[#1E3A8A] text-white">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> Garantía Modira
              </h2>
              <p className="opacity-90 leading-relaxed">
                Todas nuestras automatizaciones incluyen 3 meses de soporte técnico y mantenimiento gratuito para asegurar que tu negocio no se detenga. Nos comprometemos a una disponibilidad del 99.9% en todos nuestros flujos críticos.
              </p>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-8">
            <Card className="p-6 border-none shadow-sm sticky top-24">
              <h2 className="text-lg font-bold text-[#1E3A8A] mb-6">Resumen Económico</h2>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-gray-600">
                  <span>Base Imponible</span>
                  <span>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(quotation.precio_base)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>IVA ({quotation.iva_porcentaje}%)</span>
                  <span>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(quotation.precio_total - quotation.precio_base)}</span>
                </div>
                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-[#1E3A8A]">
                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(quotation.precio_total)}
                  </span>
                </div>
              </div>

              {quotation.estado === 'pendiente' && (
                <Button className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white py-6 text-lg font-bold shadow-lg shadow-blue-200">
                  Pagar Ahora
                </Button>
              )}
              
              <div className="mt-8 pt-8 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" /> Datos de Facturación
                </h3>
                <p className="text-sm text-gray-600 font-medium">{quotation.empresa || "Cliente Final"}</p>
                <p className="text-xs text-gray-400 mt-1">ID Cliente: {quotation.user_id?.substring(0, 8)}...</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
