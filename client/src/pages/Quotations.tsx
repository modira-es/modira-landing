import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, Download, Search, ArrowLeft, Loader2 } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchQuotations = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const { data: profileData, error: profileError } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
        if (profileError) throw profileError;
        const companyId = profileData?.company_id;
        let query = supabase.from("quotations").select("id, numero_presupuesto, titulo, precio_total, estado, fecha_emision, fecha_validez").order("fecha_emision", { ascending: false });
        if (companyId) query = query.eq("company_id", companyId); else query = query.eq("user_id", user.id);
        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;
        setQuotations(data || []);
      } catch (err: any) {
        console.error("Error fetching quotations:", err);
        setError(err.message);
      } finally { setLoading(false); }
    };
    fetchQuotations();
  }, [user]);

  const getStatusBadge = (estado: Quotation["estado"]) => {
    switch (estado) {
      case "pendiente": return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none">Pendiente</Badge>;
      case "pagado": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Pagado</Badge>;
      case "rechazado": return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">Rechazado</Badge>;
      case "caducado": return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-none">Caducado</Badge>;
      case "borrador": return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Borrador</Badge>;
      default: return <Badge variant="outline">{estado}</Badge>;
    }
  };
  const formatCurrency = (amount: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);
  const filteredQuotations = quotations.filter(q => q.numero_presupuesto.toLowerCase().includes(searchTerm.toLowerCase()) || q.titulo.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gradient-to-r from-[#102A66] to-[#173B8F] text-white py-8">
        <div className="container mx-auto px-4"><div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"><div><h1 className="text-4xl font-bold">Presupuestos</h1><p className="text-white/80 mt-2">Revisa y gestiona tus propuestas comerciales personalizadas</p></div><Button onClick={() => setLocation("/area-cliente")} className="w-full md:w-auto shrink-0 bg-white text-[#173B8F] hover:bg-white/90 font-semibold flex gap-2 items-center justify-center shadow-sm"><ArrowLeft className="h-4 w-4" />Volver al Área de Clientes</Button></div></div>
      </header>
      <main className="container mx-auto px-4 py-12">
        {error && <Card className="p-4 border-red-200 bg-red-50 text-red-700 mb-8">Error: {error}</Card>}
        <div className="flex flex-col md:flex-row gap-4 mb-8"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52627A]" /><input type="text" placeholder="Buscar por número o título..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-[#E8ECF2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#173B8F] bg-white" /></div></div>
        <Card className="border border-[#E8ECF2] overflow-hidden">
          {loading ? <div className="flex items-center justify-center min-h-[400px]"><div className="text-center"><Loader2 className="h-12 w-12 text-[#173B8F] animate-spin mx-auto mb-4" /><p className="text-[#52627A]">Cargando presupuestos...</p></div></div> : filteredQuotations.length === 0 ? <div className="p-12 text-center"><div className="mx-auto w-16 h-16 bg-[#173B8F]/10 rounded-full flex items-center justify-center mb-4"><FileText className="h-8 w-8 text-[#173B8F]" /></div><h3 className="text-lg font-bold text-[#102A66]">No hay presupuestos</h3><p className="text-[#52627A] mt-2">Aún no se han generado presupuestos para tu cuenta. Contacta con nuestro equipo para solicitar uno.</p></div> : <Table><TableHeader><TableRow className="bg-[#F4F6F9] hover:bg-[#F4F6F9] border-b border-[#E8ECF2]"><TableHead className="font-bold text-[#102A66]">Número</TableHead><TableHead className="font-bold text-[#102A66]">Título</TableHead><TableHead className="font-bold text-[#102A66]">Fecha</TableHead><TableHead className="font-bold text-[#102A66]">Importe</TableHead><TableHead className="font-bold text-[#102A66]">Estado</TableHead><TableHead className="text-right font-bold text-[#102A66]">Acciones</TableHead></TableRow></TableHeader><TableBody>{filteredQuotations.map(q => <TableRow key={q.id} className="hover:bg-[#F4F6F9]/50 transition-colors border-b border-[#E8ECF2]"><TableCell className="font-medium text-[#182230]">{q.numero_presupuesto}</TableCell><TableCell className="text-[#182230]">{q.titulo}</TableCell><TableCell className="text-[#52627A]">{new Date(q.fecha_emision).toLocaleDateString("es-ES")}</TableCell><TableCell className="font-semibold text-[#173B8F]">{formatCurrency(q.precio_total)}</TableCell><TableCell>{getStatusBadge(q.estado)}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" className="text-[#173B8F] hover:text-[#173B8F] hover:bg-[#173B8F]/10" onClick={() => setLocation(`/presupuesto/${q.id}`)}><Eye className="h-4 w-4 mr-1" />Ver</Button><Button variant="ghost" size="sm" className="text-[#52627A] hover:text-[#173B8F] hover:bg-[#173B8F]/10"><Download className="h-4 w-4" /></Button></div></TableCell></TableRow>)}</TableBody></Table>}
        </Card>
      </main>
      <footer className="bg-[#102A66] text-white py-8 mt-20"><div className="container mx-auto px-4 text-center text-white/70 text-sm"><p>© 2024 Modira. Todos los derechos reservados.</p></div></footer>
    </div>
  );
}