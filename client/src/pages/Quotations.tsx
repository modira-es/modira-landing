import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, Download, Search } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Quotation {
  id: string;
  numero_presupuesto: string;
  titulo: string;
  precio_total: number;
  estado: "borrador" | "pendiente" | "pagado" | "rechazado" | "caducado";
  fecha_emision: string;
  fecha_validez: string | null;
}

export default function Quotations() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuotations = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // Get company_id
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;
        const companyId = profileData?.company_id;

        let query = supabase
          .from("quotations")
          .select("id, numero_presupuesto, titulo, precio_total, estado, fecha_emision, fecha_validez")
          .order("fecha_emision", { ascending: false });

        if (companyId) {
          query = query.eq("company_id", companyId);
        } else {
          query = query.eq("user_id", user.id);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        setQuotations(data || []);
      } catch (err: any) {
        console.error("Error fetching quotations:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotations();
  }, [user]);

  const getStatusBadge = (estado: Quotation["estado"]) => {
    switch (estado) {
      case "pendiente":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none">Pendiente</Badge>;
      case "pagado":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Pagado</Badge>;
      case "rechazado":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">Rechazado</Badge>;
      case "caducado":
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-none">Caducado</Badge>;
      case "borrador":
        return <Badge variant="outline">Borrador</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1E3A8A]">Presupuestos</h1>
            <p className="text-gray-600 mt-1">
              Revisa y gestiona tus propuestas comerciales y presupuestos.
            </p>
          </div>
        </div>

        {error && (
          <Card className="p-4 border-red-200 bg-red-50 text-red-700">
            Error: {error}
          </Card>
        )}

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número o título..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
            />
          </div>
        </div>

        <Card className="border-2 border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 w-full bg-gray-50 animate-pulse rounded-md" />
              ))}
            </div>
          ) : quotations.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-[#1E3A8A]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No hay presupuestos</h3>
              <p className="text-gray-600 mt-2">
                Aún no se han generado presupuestos para tu cuenta.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-bold text-[#1E3A8A]">Número</TableHead>
                  <TableHead className="font-bold text-[#1E3A8A]">Título</TableHead>
                  <TableHead className="font-bold text-[#1E3A8A]">Fecha</TableHead>
                  <TableHead className="font-bold text-[#1E3A8A]">Importe</TableHead>
                  <TableHead className="font-bold text-[#1E3A8A]">Estado</TableHead>
                  <TableHead className="text-right font-bold text-[#1E3A8A]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((q) => (
                  <TableRow key={q.id} className="hover:bg-blue-50/30 transition-colors">
                    <TableCell className="font-medium">{q.numero_presupuesto}</TableCell>
                    <TableCell>{q.titulo}</TableCell>
                    <TableCell>{new Date(q.fecha_emision).toLocaleDateString("es-ES")}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(q.precio_total)}</TableCell>
                    <TableCell>{getStatusBadge(q.estado)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#1E3A8A] hover:text-[#1E3A8A] hover:bg-blue-100"
                          onClick={() => setLocation(`/presupuesto/${q.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
