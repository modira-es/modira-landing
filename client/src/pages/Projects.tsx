import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, Search, Filter } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

interface Project {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: "activo" | "pausado" | "completado";
  fecha_inicio: string;
  created_at: string;
}

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;

      try {
        setLoading(true);
        // First get the user's company_id from their profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        const companyId = profileData?.company_id;

        let query = supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (companyId) {
          query = query.eq("company_id", companyId);
        } else {
          query = query.eq("user_id", user.id);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        setProjects(data || []);
      } catch (err: any) {
        console.error("Error fetching projects:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  const getStatusBadge = (estado: Project["estado"]) => {
    switch (estado) {
      case "activo":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Activo</Badge>;
      case "pausado":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none">Pausado</Badge>;
      case "completado":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Completado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1E3A8A]">Mis Proyectos</h1>
            <p className="text-gray-600 mt-1">
              Gestiona y revisa el estado de tus automatizaciones y proyectos activos.
            </p>
          </div>
          <Button className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white flex gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Proyecto
          </Button>
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
              placeholder="Buscar proyectos..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
            />
          </div>
          <Button variant="outline" className="flex gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 h-48 animate-pulse bg-gray-50" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-gray-200">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Zap className="h-8 w-8 text-[#1E3A8A]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No hay proyectos aún</h3>
            <p className="text-gray-600 mt-2 max-w-sm mx-auto">
              Comienza creando tu primer proyecto de automatización para optimizar tu negocio.
            </p>
            <Button className="mt-6 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white">
              Crear mi primer proyecto
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="p-6 hover:shadow-md transition-shadow border-2 border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-50 p-2 rounded-lg text-[#1E3A8A]">
                    <Zap className="w-5 h-5" />
                  </div>
                  {getStatusBadge(project.estado)}
                </div>
                <h3 className="text-xl font-bold text-[#1E3A8A] mb-2">{project.nombre}</h3>
                <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                  {project.descripcion || "Sin descripción disponible."}
                </p>
                <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                  <span>Iniciado: {new Date(project.fecha_inicio).toLocaleDateString("es-ES")}</span>
                  <Button variant="ghost" size="sm" className="text-[#1E3A8A] p-0 h-auto hover:bg-transparent font-semibold">
                    Ver detalles
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
