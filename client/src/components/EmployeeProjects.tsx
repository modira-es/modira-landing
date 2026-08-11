import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Search, Filter, X, Edit2, Check, User, Mail, Building2, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type ProjectStatus = "Pendiente" | "Activo" | "Pausado" | "Entregado" | "Completado";

interface Project {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: ProjectStatus;
  fecha_inicio: string;
  fecha_fin: string | null;
  company_id: string;
  user_id: string;
  created_at: string;
  cliente_nombre: string;
  cliente_email: string;
  empresa_nombre: string;
}

export default function EmployeeProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  
  // Editing state
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");

  const fetchProjects = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch all projects using the new secure RPC
      const { data: projectsData, error: projectsError } = await supabase
        .rpc("get_worker_projects");

      if (projectsError) throw projectsError;

      setProjects(projectsData || []);
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

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    try {
      setUpdatingId(projectId);

      const { data: updatedProject, error: updateError } =
  await supabase.rpc("update_project_by_worker", {
    p_project_id: projectId,
    p_nombre: null,
    p_estado: newStatus,
  });

if (updateError) throw updateError;

if (!updatedProject) {
  throw new Error("No se pudo actualizar el proyecto");
}

      // Update local state
      setProjects(
        projects.map((p) =>
          p.id === projectId ? { ...p, estado: newStatus as ProjectStatus } : p
        )
      );

      toast.success("Estado del proyecto actualizado correctamente");
    } catch (err: any) {
      console.error("Error updating project status:", err);
      toast.error(`Error al actualizar el estado: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleTitleUpdate = async (projectId: string) => {
    if (!tempTitle.trim()) {
      toast.error("El título no puede estar vacío");
      return;
    }

    try {
      setUpdatingId(projectId);

      const { data: updatedProject, error: updateError } =
  await supabase.rpc("update_project_by_worker", {
    p_project_id: projectId,
    p_nombre: tempTitle.trim(),
    p_estado: null,
  });

if (updateError) throw updateError;

if (!updatedProject) {
  throw new Error("No se pudo actualizar el proyecto");
}

      // Update local state
      setProjects(
        projects.map((p) =>
          p.id === projectId ? { ...p, nombre: tempTitle.trim() } : p
        )
      );

      toast.success("Título del proyecto actualizado");
      setEditingTitleId(null);
    } catch (err: any) {
      console.error("Error updating project title:", err);
      toast.error(`Error al actualizar el título: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const startEditingTitle = (project: Project) => {
    setEditingTitleId(project.id);
    setTempTitle(project.nombre);
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

const getStatusSelectClass = (status: string) => {
  switch (status) {
    case "Pendiente":
      return "bg-slate-100 text-slate-700";
    case "Activo":
      return "bg-emerald-100 text-emerald-700";
    case "Pausado":
      return "bg-amber-100 text-amber-700";
    case "Entregado":
      return "bg-blue-100 text-blue-700";
    case "Completado":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};


  // Extract unique companies for the filter
  const uniqueCompanies = Array.from(new Set(projects.map(p => p.empresa_nombre))).sort();

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      p.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || p.estado === statusFilter;
    const matchesCompany = companyFilter === "all" || p.empresa_nombre === companyFilter;
    
    return matchesSearch && matchesStatus && matchesCompany;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCompanyFilter("all");
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1E3A8A]">Gestión de Proyectos</h2>
          <p className="text-sm text-[#52627A]">Administra los proyectos de todos los clientes</p>
        </div>
        <Badge variant="outline" className="bg-white py-1 px-3 border-[#E8ECF2]">
          {filteredProjects.length} de {projects.length} proyectos
        </Badge>
      </div>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50 text-red-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>Error: {error}</span>
        </Card>
      )}

      {/* Filters Bar */}
      <Card className="p-4 border border-[#E8ECF2] shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52627A]" />
            <Input
              placeholder="Buscar por nombre, descripción, cliente o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-[#E8ECF2]"
            />
          </div>
          
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#52627A]" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] border-[#E8ECF2]">
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

            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-[180px] border-[#E8ECF2]">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las empresas</SelectItem>
                {uniqueCompanies.map(company => (
                  <SelectItem key={company} value={company}>{company}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchTerm || statusFilter !== "all" || companyFilter !== "all") && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="text-[#52627A] hover:text-[#1E3A8A]"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="p-12 text-center border-none shadow-md">
          <Loader2 className="h-12 w-12 text-[#1E3A8A] animate-spin mx-auto mb-4" />
          <p className="text-[#52627A]">Cargando proyectos...</p>
        </Card>
      ) : filteredProjects.length === 0 ? (
        <Card className="p-12 text-center border-none shadow-md bg-[#F8FAFC]">
          <p className="text-[#52627A]">No se encontraron proyectos con los filtros seleccionados.</p>
          {(searchTerm || statusFilter !== "all" || companyFilter !== "all") && (
            <Button variant="link" onClick={clearFilters} className="mt-2 text-[#1E3A8A]">
              Ver todos los proyectos
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="p-6 border border-[#E8ECF2] hover:border-[#1E3A8A] hover:shadow-md transition-all duration-300">
              <div className="flex flex-col space-y-6">
                {/* Top Section: Title and Status */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="flex-1 w-full">
                    {editingTitleId === project.id ? (
                      <div className="flex gap-2 w-full max-w-md">
                        <Input
                          value={tempTitle}
                          onChange={(e) => setTempTitle(e.target.value)}
                          className="font-bold text-lg text-[#1E3A8A]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTitleUpdate(project.id);
                            if (e.key === 'Escape') setEditingTitleId(null);
                          }}
                        />
                        <Button size="icon" onClick={() => handleTitleUpdate(project.id)} disabled={updatingId === project.id}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditingTitleId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <h3 className="text-xl font-bold text-[#1E3A8A]">{project.nombre}</h3>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => startEditingTitle(project)}
                        >
                          <Edit2 className="h-3.5 w-3.5 text-[#52627A]" />
                        </Button>
                      </div>
                    )}
                    <p className="text-[#52627A] mt-2 text-sm leading-relaxed">
                      {project.descripcion || "Sin descripción."}
                    </p>
                  </div>
                  
                  
                    
                    <Select
                      value={project.estado}
                      onValueChange={(value) => handleStatusChange(project.id, value)}
                      disabled={updatingId === project.id}
                    >
                      <SelectTrigger
  className={`w-[150px] h-9 text-xs border-[#E8ECF2] ${getStatusSelectClass(project.estado)}`}
>
                        <SelectValue placeholder="Cambiar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                        <SelectItem value="Activo">Activo</SelectItem>
                        <SelectItem value="Pausado">Pausado</SelectItem>
                        <SelectItem value="Entregado">Entregado</SelectItem>
                        <SelectItem value="Completado">Completado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Info Grid: Client and Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t border-[#F1F5F9]">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[#64748B]">
                      <User className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Cliente</span>
                    </div>
                    <p className="text-sm font-semibold text-[#1E293B]">{project.cliente_nombre}</p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[#64748B]">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Email</span>
                    </div>
                    <p className="text-sm font-semibold text-[#1E293B] truncate">{project.cliente_email}</p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[#64748B]">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Empresa</span>
                    </div>
                    <p className="text-sm font-semibold text-[#1E293B]">{project.empresa_nombre || "Sin empresa"}</p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[#64748B]">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Periodo</span>
                    </div>
                    <div className="text-xs font-semibold text-[#1E293B]">
                      {new Date(project.fecha_inicio).toLocaleDateString("es-ES")}
                      {project.fecha_fin ? ` - ${new Date(project.fecha_fin).toLocaleDateString("es-ES")}` : " (Sin fin)"}
                    </div>
                  </div>
                </div>
              
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
