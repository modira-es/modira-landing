import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, Search, Filter, ArrowLeft, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

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
  const [, setLocation] = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;

      try {
        setLoading(true);
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

  const filteredProjects = projects.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#102A66] to-[#173B8F] text-white py-8">
        <div className="container mx-auto px-4">
          <Button
            onClick={() => setLocation("/area-cliente")}
            variant="ghost"
            className="text-white hover:bg-white/10 mb-4 flex gap-2 items-center"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Área de Clientes
          </Button>
          <h1 className="text-4xl font-bold">Mis Proyectos</h1>
          <p className="text-white/80 mt-2">Gestiona y revisa el estado de tus automatizaciones y proyectos activos</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {error && (
          <Card className="p-4 border-red-200 bg-red-50 text-red-700 mb-8">
            Error: {error}
          </Card>
        )}

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52627A]" />
            <input
              type="text"
              placeholder="Buscar proyectos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-[#E8ECF2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#173B8F] bg-white"
            />
          </div>
          <Button variant="outline" className="flex gap-2 border-[#E8ECF2] text-[#173B8F]">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-[#173B8F] animate-spin mx-auto mb-4" />
              <p className="text-[#52627A]">Cargando tus proyectos...</p>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-[#E8ECF2] bg-[#F4F6F9]">
            <div className="mx-auto w-16 h-16 bg-[#173B8F]/10 rounded-full flex items-center justify-center mb-4">
              <Zap className="h-8 w-8 text-[#173B8F]" />
            </div>
            <h3 className="text-lg font-bold text-[#102A66]">No hay proyectos aún</h3>
            <p className="text-[#52627A] mt-2 max-w-sm mx-auto">
              Comienza creando tu primer proyecto de automatización para optimizar tu negocio.
            </p>
            <Button className="mt-6 bg-[#173B8F] hover:bg-[#102A66] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Crear mi primer proyecto
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="p-6 border border-[#E8ECF2] hover:border-[#173B8F] hover:shadow-lg transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-[#173B8F]/10 p-3 rounded-lg text-[#173B8F]">
                    <Zap className="w-5 h-5" />
                  </div>
                  {getStatusBadge(project.estado)}
                </div>
                <h3 className="text-xl font-bold text-[#102A66] mb-2">{project.nombre}</h3>
                <p className="text-[#52627A] text-sm line-clamp-2 mb-4">
                  {project.descripcion || "Sin descripción disponible."}
                </p>
                <div className="pt-4 border-t border-[#E8ECF2] flex justify-between items-center text-xs text-[#52627A]">
                  <span>Iniciado: {new Date(project.fecha_inicio).toLocaleDateString("es-ES")}</span>
                  <Button variant="ghost" size="sm" className="text-[#173B8F] p-0 h-auto hover:bg-transparent font-semibold">
                    Ver detalles →
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#102A66] text-white py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-white/70 text-sm">
          <p>© 2024 Modira. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
