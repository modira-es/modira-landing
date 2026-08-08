import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LogOut, User, Mail, Building2, Calendar, Zap, FileText, 
  CreditCard, AlertCircle, Edit2, Shield, Info 
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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

interface CompanyInfo {
  id: string;
  company_name: string;
  subscription_plan: string | null;
  subscription_status: string | null;
}

export default function ClientArea() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre: "",
    empresa: "",
    telefono: "",
  });

  const fetchProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (fetchError && fetchError.code === "PGRST116") {
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

        if (createError) throw createError;
        data = newData;
      } else if (fetchError) {
        throw fetchError;
      }

      setProfile(data);
      setEditForm({
        nombre: data.nombre || "",
        empresa: data.empresa || "",
        telefono: data.telefono || "",
      });

      if (data.company_id) {
        const { data: companyData } = await supabase
          .from("companies")
          .select("id, company_name, subscription_plan, subscription_status")
          .eq("id", data.company_id)
          .single();
        
        if (companyData) {
          setCompany(companyData);
        }
      }

      setError(null);
    } catch (err: any) {
      console.error("[ClientArea] Error:", err);
      setError(`Error al cargar el perfil: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user || !profile) return;

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          nombre: editForm.nombre,
          empresa: editForm.empresa,
          telefono: editForm.telefono,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("Perfil actualizado correctamente");
      setIsEditDialogOpen(false);
      fetchProfile();
    } catch (err: any) {
      toast.error(`Error al actualizar el perfil: ${err.message}`);
    }
  };

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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#F5F7FA] to-white">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#1E3A8A]">Área de Clientes</h1>
            <p className="text-gray-600 mt-1">
              Bienvenido, {profile?.nombre || user.email}
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="flex gap-2 items-center">
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {error && (
          <Card className="p-6 border-2 border-red-200 bg-red-50 mb-8 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="md:col-span-2 p-8 border-2 border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#1E3A8A]">Mi Perfil</h2>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex gap-2">
                    <Edit2 className="h-4 w-4" />
                    Editar Perfil
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Perfil</DialogTitle>
                    <DialogDescription>Actualiza tu información personal y de contacto.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nombre</Label>
                      <Input id="name" value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="company">Empresa</Label>
                      <Input id="company" value={editForm.empresa} onChange={(e) => setEditForm({ ...editForm, empresa: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input id="phone" value={editForm.telefono} onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                    <Button className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white" onClick={handleUpdateProfile}>Guardar Cambios</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {profile ? (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1"><User className="inline h-4 w-4 mr-2" />Nombre completo</label>
                    <p className="text-lg text-gray-900 font-medium">{profile.nombre}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1"><Mail className="inline h-4 w-4 mr-2" />Correo electrónico</label>
                    <p className="text-lg text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1"><Shield className="inline h-4 w-4 mr-2" />Rol</label>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">{profile.rol === "admin" ? "Administrador" : "Usuario Cliente"}</Badge>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1"><Building2 className="inline h-4 w-4 mr-2" />Empresa</label>
                    <p className="text-lg text-gray-900">{profile.empresa || "No especificada"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Teléfono</label>
                    <p className="text-lg text-gray-900">{profile.telefono || "No especificado"}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">Cargando perfil...</p>
            )}
          </Card>

          <Card className="p-8 border-2 border-gray-200 bg-gray-50/50">
            <h3 className="text-xl font-bold text-[#1E3A8A] mb-6 flex items-center gap-2"><Info className="h-5 w-5" />Información</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Empresa Asociada</label>
                <p className="text-sm font-bold text-gray-900">{company?.company_name || profile?.empresa || "Sin empresa"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Plan</label>
                <Badge variant="outline" className="text-xs">{company?.subscription_plan || "Plan Demo"}</Badge>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Estado</label>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${company?.subscription_status === 'active' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <span className="text-sm font-medium text-gray-700 capitalize">{company?.subscription_status || "Activa"}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-2">
                <div className="flex justify-between"><span>Registro:</span><span>{profile?.fecha_registro ? new Date(profile.fecha_registro).toLocaleDateString("es-ES") : "-"}</span></div>
                <div className="flex justify-between"><span>Último acceso:</span><span>{profile?.fecha_ultimo_login ? new Date(profile.fecha_ultimo_login).toLocaleDateString("es-ES") : "-"}</span></div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-8 border-2 border-gray-100 hover:border-[#1E3A8A] transition-all group">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-[#1E3A8A]">Mis Proyectos</h3>
              <div className="bg-blue-50 p-2 rounded-lg text-[#1E3A8A] group-hover:bg-[#1E3A8A] group-hover:text-white transition-colors"><Zap className="w-5 h-5" /></div>
            </div>
            <p className="text-gray-600 mb-6">Gestiona y revisa el estado de tus automatizaciones activas.</p>
            <Button variant="outline" className="w-full border-[#1E3A8A] text-[#1E3A8A] hover:bg-blue-50" onClick={() => setLocation("/area-cliente/proyectos")}>Ver Proyectos</Button>
          </Card>

          <Card className="p-8 border-2 border-gray-100 hover:border-[#1E3A8A] transition-all group">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-[#1E3A8A]">Presupuestos</h3>
              <div className="bg-blue-50 p-2 rounded-lg text-[#1E3A8A] group-hover:bg-[#1E3A8A] group-hover:text-white transition-colors"><FileText className="w-5 h-5" /></div>
            </div>
            <p className="text-gray-600 mb-6">Revisa y acepta tus propuestas comerciales personalizadas.</p>
            <Button className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white" onClick={() => setLocation("/area-cliente/presupuestos")}>Ver Presupuestos</Button>
          </Card>

          <Card className="p-8 border-2 border-gray-100 hover:border-[#1E3A8A] transition-all group">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-[#1E3A8A]">Facturación</h3>
              <div className="bg-blue-50 p-2 rounded-lg text-[#1E3A8A] group-hover:bg-[#1E3A8A] group-hover:text-white transition-colors"><CreditCard className="w-5 h-5" /></div>
            </div>
            <p className="text-gray-600 mb-6">Descarga tus facturas y gestiona tus métodos de pago.</p>
            <Button variant="outline" className="w-full border-[#1E3A8A] text-[#1E3A8A] hover:bg-blue-50" onClick={() => setLocation("/area-cliente/facturacion")}>Ir a Facturación</Button>
          </Card>

          <Card className="p-8 border-2 border-gray-100 hover:border-[#1E3A8A] transition-all group">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-[#1E3A8A]">Soporte Técnico</h3>
              <div className="bg-blue-50 p-2 rounded-lg text-[#1E3A8A] group-hover:bg-[#1E3A8A] group-hover:text-white transition-colors"><AlertCircle className="w-5 h-5" /></div>
            </div>
            <p className="text-gray-600 mb-6">¿Tienes algún problema? Abre un ticket y te ayudaremos pronto.</p>
            <Button variant="outline" className="w-full border-[#1E3A8A] text-[#1E3A8A] hover:bg-blue-50" onClick={() => setLocation("/area-cliente/soporte")}>Abrir Ticket</Button>
          </Card>
        </div>
      </main>
    </div>
  );
}
