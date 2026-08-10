import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Project {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: "activo" | "pausado" | "completado";
  fecha_inicio: string;
  fecha_fin: string | null;
  company_id: string;
  user_id: string;
  created_at: string;
}

interface Company {
  id: string;
  company_name: string;
}

export default function EmployeeProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchProjects = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch all projects (trabajador can see all)
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (projectsError) throw projectsError;

      setProjects(projectsData || []);

      // Fetch company names for all projects
      if (projectsData && projectsData.length > 0) {
        const companyIds = [...new Set(projectsData.map(p => p.company_id))];
        const { data: companiesData, error: companiesError } = await supabase
          .from("companies")
          .select("id, company_name")
          .in("id", companyIds);

        if (companiesError) throw companiesError;

        const companiesMap = new Map<string, string>();
        companiesData?.forEach((company: Company) => {
          companiesMap.set(company.id, company.company_name);
        });
        setCompanies(companiesMap);
      }

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

      const { error: updateError } = await supabase
        .from("projects")
        .update({ estado: newStatus })
        .eq("id", projectId);

      if (updateError) throw updateError;

      // Update local state
      setProjects(
        projects.map((p) =>
          p.id === projectId ? { ...p, estado: newStatus as any } : p
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

  const getStatusBadge = (estado: Project["estado"]) => {
    switch (estado) {
      case "activo":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">🟢 Activo</Badge>;
      case "pausado":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none">🟡 Pausado</Badge>;
      case "completado":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">🟢 Completado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#1E3A8A]">Proyectos</h2>
        <Badge variant="outline" className="bg-white">
          {projects.length} proyectos
        </Badge>
      </div>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50 text-red-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>Error: {error}</span>
        </Card>
      )}

      {loading ? (
        <Card className="p-12 text-center border-none shadow-md">
          <Loader2 className="h-12 w-12 text-[#1E3A8A] animate-spin mx-auto mb-4" />
          <p className="text-[#52627A]">Cargando proyectos...</p>
        </Card>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center border-none shadow-md">
          <p className="text-[#52627A]">No hay proyectos disponibles.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <Card key={project.id} className="p-6 border border-[#E8ECF2] hover:border-[#1E3A8A] hover:shadow-md transition-all duration-300">
              <div className="grid md:grid-cols-4 gap-4 items-start">
                {/* Project Info */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-bold text-[#1E3A8A] mb-2">{project.nombre}</h3>
                  <p className="text-sm text-[#52627A] mb-3 line-clamp-2">
                    {project.descripcion || "Sin descripción disponible."}
                  </p>
                  <div className="text-xs text-[#52627A] space-y-1">
                    <div>
                      <span className="font-semibold">Cliente:</span> {companies.get(project.company_id) || "Empresa desconocida"}
                    </div>
                    <div>
                      <span className="font-semibold">Inicio:</span> {new Date(project.fecha_inicio).toLocaleDateString("es-ES")}
                    </div>
                    {project.fecha_fin && (
                      <div>
                        <span className="font-semibold">Finalización:</span> {new Date(project.fecha_fin).toLocaleDateString("es-ES")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Section */}
                <div className="md:col-span-2 flex flex-col md:flex-row gap-4 items-start md:items-center justify-end">
                  <div className="flex-1 md:flex-none">
                    <label className="text-xs font-semibold text-[#52627A] uppercase mb-2 block">
                      Estado Actual
                    </label>
                    {getStatusBadge(project.estado)}
                  </div>

                  <div className="flex-1 md:flex-none">
                    <label className="text-xs font-semibold text-[#52627A] uppercase mb-2 block">
                      Cambiar Estado
                    </label>
                    <Select
                      value={project.estado}
                      onValueChange={(value) => handleStatusChange(project.id, value)}
                      disabled={updatingId === project.id}
                    >
                      <SelectTrigger className="w-full md:w-[140px] border-[#E8ECF2]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="pausado">Pausado</SelectItem>
                        <SelectItem value="completado">Completado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {updatingId === project.id && (
                    <div className="flex items-center gap-2 text-sm text-[#1E3A8A]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Actualizando...</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
