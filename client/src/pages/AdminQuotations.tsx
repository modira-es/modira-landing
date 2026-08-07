import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { 
  Plus, 
  Search, 
  FileText, 
  Edit, 
  Copy, 
  Trash2, 
  ExternalLink,
  MoreVertical,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Quotation } from "@shared/types";

export default function AdminQuotations() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchQuotations();
  }, [user, authLoading]);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quotations")
        .select(`
          *,
          profiles:user_id (nombre, empresa)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error("Error fetching quotations:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "borrador":
        return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"><Clock className="w-3 h-3"/> Borrador</span>;
      case "pendiente":
        return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Pendiente</span>;
      case "pagado":
        return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Pagado</span>;
      case "rechazado":
        return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"><XCircle className="w-3 h-3"/> Rechazado</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  const filteredQuotations = quotations.filter(q => {
    const matchesSearch = 
      q.numero_presupuesto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.profiles?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || q.estado === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1E3A8A]">Gestión de Presupuestos</h1>
            <p className="text-gray-600">Crea, edita y gestiona las propuestas comerciales para tus clientes.</p>
          </div>
          <Button className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white flex gap-2">
            <Plus className="w-4 h-4" /> Nuevo Presupuesto
          </Button>
        </div>

        <Card className="p-6 mb-8 border-none shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder="Buscar por número, título o cliente..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <select 
                className="bg-white border border-gray-200 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos los estados</option>
                <option value="borrador">Borrador</option>
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A]"></div>
          </div>
        ) : filteredQuotations.length === 0 ? (
          <Card className="p-20 text-center border-dashed border-2">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No se encontraron presupuestos</h3>
            <p className="text-gray-500">Comienza creando un nuevo presupuesto para tus clientes.</p>
            <Button variant="outline" className="mt-6" onClick={() => setSearchTerm("")}>
              Limpiar filtros
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredQuotations.map((q) => (
              <Card key={q.id} className="p-4 hover:shadow-md transition-shadow border-none shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="bg-blue-50 p-3 rounded-lg text-[#1E3A8A]">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-500">{q.numero_presupuesto}</span>
                      {getStatusBadge(q.estado)}
                    </div>
                    <h3 className="font-bold text-gray-900">{q.titulo}</h3>
                    <p className="text-sm text-gray-600">
                      Cliente: <span className="font-medium">{q.profiles?.nombre}</span> 
                      { q.profiles?.empresa && ` • ${q.profiles?.empresa}` }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-8 px-8 border-x border-gray-100">
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase font-bold">Total</p>
                    <p className="text-lg font-bold text-[#1E3A8A]">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(q.precio_total)}</p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-500 uppercase font-bold">Fecha</p>
                    <p className="text-sm">{new Date(q.created_at).toLocaleDateString('es-ES')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pl-4">
                  <Button variant="ghost" size="icon" title="Ver detalles" onClick={() => setLocation(`/presupuesto/${q.id}`)}>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="flex gap-2">
                        <Edit className="w-4 h-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex gap-2">
                        <Copy className="w-4 h-4" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600 flex gap-2">
                        <Trash2 className="w-4 h-4" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
