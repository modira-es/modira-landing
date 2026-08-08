import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, User, Mail, Building2, Calendar, Zap, FileText, CreditCard, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface UserProfile {
  id: string;
  company_id: string | null;
  nombre: string;
  empresa: string | null;
  telefono: string | null;
  rol: string;
  fecha_registro: string;
  fecha_ultimo_login: string;
}

export default function ClientArea() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        console.log("[ClientArea] No user found, skipping profile fetch");
        setLoading(false);
        return;
      }

      try {
        console.log("[ClientArea] Fetching profile for user:", user.id);
        
        let { data, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (fetchError && fetchError.code === "PGRST116") {
          console.log("[ClientArea] Profile not found, attempting to create one...");
          
          const { data: newData, error: createError } = await supabase
            .from("profiles")
            .insert([
              {
                id: user.id,
                nombre: user.user_metadata?.nombre || user.email?.split("@")[0] || "Usuario",
                rol: "user",
                fecha_registro: new Date().toISOString(),
                fecha_ultimo_login: new Date().toISOString(),
              },
            ])
            .select()
            .single();

          if (createError) {
            console.error("[ClientArea] Error creating profile:", createError);
            setError(`Error al crear el perfil: ${createError.message}`);
            setLoading(false);
            return;
          }

          data = newData;
          console.log("[ClientArea] Profile created successfully:", data);
        } else if (fetchError) {
          console.error("[ClientArea] Error fetching profile:", fetchError);
          setError(`Error al cargar el perfil: ${fetchError.message}`);
          setLoading(false);
          return;
        }

        setProfile(data);
        setError(null);
      } catch (err: any) {
        console.error("[ClientArea] Unexpected error:", err);
        setError(`Error inesperado: ${err.message || "Error desconocido"}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    const result = await signOut();
    if (result.success) {
      setLocation("/");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-[#F5F7FA] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A]"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#F5F7FA] to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#1E3A8A]">Área de Clientes</h1>
            <p className="text-gray-600 mt-1">
              Bienvenido, {profile?.nombre || user.email}
            </p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex gap-2 items-center"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {error && (
          <Card className="p-6 border-2 border-red-200 bg-red-50 mb-8">
            <p className="text-red-700">{error}</p>
          </Card>
        )}

        {/* Profile Card */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="md:col-span-2 p-8 border-2 border-gray-200">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-6">Mi Perfil</h2>

            {profile ? (
              <div className="space-y-6">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    <User className="inline h-4 w-4 mr-2" />
                    Nombre
                  </label>
                  <p className="text-lg text-gray-900">{profile.nombre}</p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    <Mail className="inline h-4 w-4 mr-2" />
                    Correo electrónico
                  </label>
                  <p className="text-lg text-gray-900">{user.email}</p>
                </div>

                {/* Empresa */}
                {profile.empresa && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      <Building2 className="inline h-4 w-4 mr-2" />
                      Empresa
                    </label>
                    <p className="text-lg text-gray-900">{profile.empresa}</p>
                  </div>
                )}

                {/* Teléfono */}
                {profile.telefono && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Teléfono
                    </label>
                    <p className="text-lg text-gray-900">{profile.telefono}</p>
                  </div>
                )}

                {/* Rol */}
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    Rol
                  </label>
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                    {profile.rol === "admin" ? "Administrador" : "Usuario"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">Cargando perfil...</p>
            )}
          </Card>

          {/* Stats Card */}
          <Card className="p-8 border-2 border-gray-200">
            <h3 className="text-xl font-bold text-[#1E3A8A] mb-6">Información</h3>

            {profile ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    <Calendar className="inline h-3 w-3 mr-1" />
                    Registro
                  </label>
                  <p className="text-sm text-gray-900">
                    {profile.fecha_registro
                      ? new Date(profile.fecha_registro).toLocaleDateString("es-ES")
                      : "-"}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Último acceso
                  </label>
                  <p className="text-sm text-gray-900">
                    {profile.fecha_ultimo_login
                      ? new Date(profile.fecha_ultimo_login).toLocaleDateString("es-ES")
                      : "-"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 text-sm">Cargando información...</p>
            )}
          </Card>
        </div>

        {/* Dashboard Sections */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-8 border-2 border-gray-100 hover:border-[#1E3A8A] transition-all group">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-[#1E3A8A]">Mis Proyectos</h3>
              <div className="bg-blue-50 p-2 rounded-lg text-[#1E3A8A] group-hover:bg-[#1E3A8A] group-hover:text-white transition-colors">
                <Zap className="w-5 h-5" />
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Gestiona y revisa el estado de tus automatizaciones activas.
            </p>
            <Button variant="outline" className="w-full border-[#1E3A8A] text-[#1E3A8A] hover:bg-blue-50">
              Ver Proyectos
            </Button>
          </Card>

          <Card className="p-8 border-2 border-gray-100 hover:border-[#1E3A8A] transition-all group">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-[#1E3A8A]">Presupuestos</h3>
              <div className="bg-blue-50 p-2 rounded-lg text-[#1E3A8A] group-hover:bg-[#1E3A8A] group-hover:text-white transition-colors">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Revisa y acepta tus propuestas comerciales personalizadas.
            </p>
            <Button 
              className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white"
              onClick={() => {
                alert("Próximamente: Listado completo de presupuestos. Por ahora accede mediante el enlace directo enviado por el administrador.");
              }}
            >
              Ver Presupuestos
            </Button>
          </Card>

          <Card className="p-8 border-2 border-gray-100 hover:border-[#1E3A8A] transition-all group">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-[#1E3A8A]">Facturación</h3>
              <div className="bg-blue-50 p-2 rounded-lg text-[#1E3A8A] group-hover:bg-[#1E3A8A] group-hover:text-white transition-colors">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Descarga tus facturas y gestiona tus métodos de pago.
            </p>
            <Button variant="outline" className="w-full border-[#1E3A8A] text-[#1E3A8A] hover:bg-blue-50" onClick={() => setLocation("/area-cliente/facturacion")}>
              Ir a Facturación
            </Button>
          </Card>

          <Card className="p-8 border-2 border-gray-100 hover:border-[#1E3A8A] transition-all group">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-[#1E3A8A]">Soporte Técnico</h3>
              <div className="bg-blue-50 p-2 rounded-lg text-[#1E3A8A] group-hover:bg-[#1E3A8A] group-hover:text-white transition-colors">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              ¿Tienes algún problema? Abre un ticket y te ayudaremos pronto.
            </p>
            <Button variant="outline" className="w-full border-[#1E3A8A] text-[#1E3A8A] hover:bg-blue-50">
              Abrir Ticket
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
}
