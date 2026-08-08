import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Search, MessageSquare, Clock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface SupportTicket {
  id: string;
  titulo: string;
  descripcion: string;
  estado: "abierto" | "en_progreso" | "cerrado";
  prioridad: "baja" | "normal" | "alta" | "urgente";
  created_at: string;
}

export default function Support() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    titulo: "",
    descripcion: "",
    prioridad: "normal" as SupportTicket["prioridad"],
  });

  const fetchTickets = async () => {
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
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (companyId) {
        query = query.eq("company_id", companyId);
      } else {
        query = query.eq("user_id", user.id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setTickets(data || []);
    } catch (err: any) {
      console.error("Error fetching tickets:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const handleCreateTicket = async () => {
    if (!user) return;
    if (!newTicket.titulo || !newTicket.descripcion) {
      toast.error("Por favor rellena todos los campos");
      return;
    }

    try {
      // Get company_id
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      const { error: createError } = await supabase.from("support_tickets").insert([
        {
          user_id: user.id,
          company_id: profileData?.company_id,
          titulo: newTicket.titulo,
          descripcion: newTicket.descripcion,
          prioridad: newTicket.prioridad,
          estado: "abierto",
        },
      ]);

      if (createError) throw createError;

      toast.success("Ticket creado correctamente");
      setIsDialogOpen(false);
      setNewTicket({ titulo: "", descripcion: "", prioridad: "normal" });
      fetchTickets();
    } catch (err: any) {
      console.error("Error creating ticket:", err);
      toast.error(`Error al crear el ticket: ${err.message}`);
    }
  };

  const getStatusBadge = (estado: SupportTicket["estado"]) => {
    switch (estado) {
      case "abierto":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Abierto</Badge>;
      case "en_progreso":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none">En Progreso</Badge>;
      case "cerrado":
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-none">Cerrado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const getPriorityBadge = (prioridad: SupportTicket["prioridad"]) => {
    switch (prioridad) {
      case "urgente":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">Urgente</Badge>;
      case "alta":
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">Alta</Badge>;
      case "normal":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Normal</Badge>;
      case "baja":
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-none">Baja</Badge>;
      default:
        return <Badge variant="outline">{prioridad}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1E3A8A]">Soporte Técnico</h1>
            <p className="text-gray-600 mt-1">
              ¿Tienes algún problema o duda? Estamos aquí para ayudarte.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white flex gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Abrir nuevo ticket de soporte</DialogTitle>
                <DialogDescription>
                  Describe tu problema detalladamente y nos pondremos en contacto contigo lo antes posible.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="titulo">Asunto</Label>
                  <Input
                    id="titulo"
                    placeholder="Ej: Error al sincronizar facturas"
                    value={newTicket.titulo}
                    onChange={(e) => setNewTicket({ ...newTicket, titulo: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="prioridad">Prioridad</Label>
                  <Select
                    value={newTicket.prioridad}
                    onValueChange={(value: any) => setNewTicket({ ...newTicket, prioridad: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    placeholder="Explica qué sucede..."
                    className="min-h-[120px]"
                    value={newTicket.descripcion}
                    onChange={(e) => setNewTicket({ ...newTicket, descripcion: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white" onClick={handleCreateTicket}>
                  Enviar Ticket
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
              placeholder="Buscar tickets..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 h-32 animate-pulse bg-gray-50" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-gray-200">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-[#1E3A8A]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No tienes tickets abiertos</h3>
            <p className="text-gray-600 mt-2 max-w-sm mx-auto">
              Si necesitas ayuda con cualquier aspecto de la plataforma, abre un ticket y nuestro equipo te asistirá.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="p-6 hover:border-[#1E3A8A]/30 transition-colors border-2 border-gray-100">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-[#1E3A8A]">{ticket.titulo}</h3>
                      {getStatusBadge(ticket.estado)}
                      {getPriorityBadge(ticket.prioridad)}
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                      {ticket.descripcion}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(ticket.created_at).toLocaleDateString("es-ES")} {new Date(ticket.created_at).toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>ID: #{ticket.id.substring(0, 8)}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Button variant="outline" className="w-full md:w-auto">Ver Conversación</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
