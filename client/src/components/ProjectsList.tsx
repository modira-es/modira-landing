import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, Search, ArrowLeft, Loader2, AlertCircle, Filter, X } from "lucide-react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProjectStatus = "Pendiente" | "Activo" | "Pausado" | "Entregado" | "Completado";

interface Project {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: ProjectStatus;
  fecha_inicio: string;
  fecha_fin: string | null;
  created_at: string;
}

export default function ProjectsList() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    descripcion: "",
    fecha_inicio: new Date().toISOString().split("T")[0],
    fecha_fin: "",
  });

  const fetchProjects = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setProjects(data || []);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching projects:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const handleCreateProject = async () => {
    if (!user || !createForm.descripcion.trim()) {
      toast.error("La descripción del proyecto es obligatoria");
      return;
    }

    try {
      setIsCreating(true);

      const { data: debugCompanyId, error: debugCompanyError } =
        await supabase.rpc("current_user_company_id");

      console.log("DEBUG usuario:", user.id);
      console.log("DEBUG company_id:", debugCompanyId);
      console.log("DEBUG error company:", debugCompanyError);

      const { error: insertError } = await supabase
        .rpc("create_project", {
          p_descripcion: createForm.descripcion.trim(),
          p_fecha_inicio: new Date(createForm.fecha_inicio).toISOString(),
          p_fecha_fin: createForm.fecha_fin
            ? new Date(createForm.fecha_fin).toISOString()
            : null,
        });

      if (insertError) throw insertError;

      toast.success("Proyecto creado correctamente");
      setIsCreateDialogOpen(false);
      setCreateForm({
        descripcion: "",
        fecha_inicio: new Date().toISOString().split("T")[0],
        fecha_fin: "",
      });

      fetchProjects();
    } catch (err: any) {
      console.error("Error creating project:", err);
      toast.error(`Error al crear el proyecto: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusBadge = (estado: ProjectStatus) => {
    switch (estado) {
      case "Pendiente":
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-none">⚪ Pendiente</Badge>;
      case "Activo":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">🟢 Activo</Badge>;
      case "Pausado":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none">🟡 Pausado</Badge>;
      case "Entregado":
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none">📦 Entregado</Badge>;
      case "Completado":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">🔵 Completado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || p.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-white">

      {/* Header - mismo formato que Facturación */}
      <header className="bg-gradient-to-r from-[#102A66] to-[#173B8F] text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div>
              <h1 className="text-4xl font-bold">Mis Proyectos</h1>

              <p className="text-white/80 mt-2">
                Gestiona y revisa el estado de tus automatizaciones y proyectos activos
              </p>
            </div>

            <Button
              onClick={() => setLocation("/area-cliente")}
              className="w-full md:w-auto shrink-0 bg-white text-[#173B8F] hover:bg-white/90 font-semibold flex gap-2 items-center justify-center shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Área de Clientes
            </Button>

          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {error && (
          <Card className="p-4 border-red-200 bg-red-50 text-red-700 mb-8 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>Error: {error}</span>
          </Card>
        )}

        {/* Search and Filter and Create */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-end md:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52627A]" />
            <input
              type="text"
              placeholder="Buscar proyectos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-[#E8ECF2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#173B8F] bg-white"
            />
          </div>

          <div className="flex gap-2 items-center w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#52627A]" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] border-[#E8ECF2]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Pausado">Pausado</SelectItem>
                  <SelectItem value="Entregado">Entregado</SelectItem>
                  <SelectItem value="Completado">Completado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {statusFilter !== "all" && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setStatusFilter("all")}
                className="text-[#52627A] hover:text-[#173B8F]"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#173B8F] hover:bg-[#102A66] text-white flex gap-2 items-center whitespace-nowrap ml-auto md:ml-0">
                  <Plus className="h-4 w-4" />
                  Crear Proyecto
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
                  <DialogDescription>
                    Completa los detalles de tu nuevo proyecto de automatización.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="descripcion">Descripción del Proyecto *</Label>
                    <Textarea
                      id="descripcion"
                      placeholder="Describe lo que necesitas automatizar..."
                      value={createForm.descripcion}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          descripcion: e.target.value
                        })
                      }
                      rows={5}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="fecha_inicio">Fecha de Inicio</Label>
                    <Input
                      id="fecha_inicio"
                      type="date"
                      value={createForm.fecha_inicio}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          fecha_inicio: e.target.value
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="fecha_fin">
                      Fecha de Finalización (Opcional)
                    </Label>
                    <Input
                      id="fecha_fin"
                      type="date"
                      value={createForm.fecha_fin}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          fecha_fin: e.target.value
                        })
                      }
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancelar
                  </Button>

                  <Button
                    className="bg-[#173B8F] hover:bg-[#102A66] text-white"
                    onClick={handleCreateProject}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      "Crear Proyecto"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-[#173B8F] animate-spin mx-auto mb-4" />
              <p className="text-[#52627A]">
                Cargando tus proyectos...
              </p>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-[#E8ECF2] bg-[#F4F6F9]">
            <div className="mx-auto w-16 h-16 bg-[#173B8F]/10 rounded-full flex items-center justify-center mb-4">
              <Zap className="h-8 w-8 text-[#173B8F]" />
            </div>

            <h3 className="text-lg font-bold text-[#102A66]">
              No se encontraron proyectos
            </h3>

            <p className="text-[#52627A] mt-2 max-w-sm mx-auto">
              {searchTerm || statusFilter !== "all"
                ? "No hay proyectos que coincidan con los filtros aplicados."
                : "Comienza creando tu primer proyecto de automatización para optimizar tu negocio."}
            </p>

            {!searchTerm && statusFilter === "all" && (
              <Button
                className="mt-6 bg-[#173B8F] hover:bg-[#102A66] text-white"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear mi primer proyecto
              </Button>
            )}

            {(searchTerm || statusFilter !== "all") && (
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="p-6 border border-[#E8ECF2] hover:border-[#173B8F] hover:shadow-lg transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-[#173B8F]/10 p-3 rounded-lg text-[#173B8F]">
                    <Zap className="w-5 h-5" />
                  </div>

                  {getStatusBadge(project.estado)}
                </div>

                <h3 className="text-xl font-bold text-[#102A66] mb-2">
                  {project.nombre}
                </h3>

                <p className="text-[#52627A] text-sm line-clamp-3 mb-4 min-h-[4.5rem]">
                  {project.descripcion || "Sin descripción disponible."}
                </p>

                <div className="pt-4 border-t border-[#E8ECF2]">
                  <div className="space-y-2 text-xs text-[#52627A]">

                    <div className="flex justify-between">
                      <span>Inicio:</span>
                      <span className="font-semibold">
                        {new Date(project.fecha_inicio).toLocaleDateString("es-ES")}
                      </span>
                    </div>

                    {project.fecha_fin && (
                      <div className="flex justify-between">
                        <span>Finalización:</span>
                        <span className="font-semibold">
                          {new Date(project.fecha_fin).toLocaleDateString("es-ES")}
                        </span>
                      </div>
                    )}

                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#102A66] text-white py-8 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/60 text-sm">
            © {new Date().getFullYear()} Modira. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}