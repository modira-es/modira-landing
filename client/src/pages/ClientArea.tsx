import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LogOut, User, Mail, Building2, Calendar, Zap, FileText, 
  CreditCard, AlertCircle, Edit2, Shield, Info, ArrowRight,
  Loader2
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
import ClientAreaHeader from "@/components/ClientAreaHeader";

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
      <div className="min-h-screen bg-white">
        <ClientAreaHeader userName="..." onLogout={handleLogout} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-[#173B8F] animate-spin mx-auto mb-4" />
            <p className="text-[#52627A]">Cargando tu área de clientes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white">
      <ClientAreaHeader userName={profile?.nombre || user.email || "Usuario"} onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-16">
        {error && (
          <Card className="p-6 border-2 border-red-200 bg-red-50 mb-12 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </Card>
        )}

        {/* Mi Perfil Section */}
        <section id="perfil" className="mb-20">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-[#102A66] mb-2">Mi Perfil</h2>
            <p className="text-[#52627A]">Información personal y configuración de tu cuenta</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Profile Information */}
            <div className="md:col-span-2">
              <Card className="p-8 border border-[#E8ECF2] bg-white">
                {profile ? (
                  <div className="space-y-8">
                    {/* Row 1 */}
                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-[#173B8F]" />
                          <label className="text-sm font-semibold text-[#52627A]">Nombre Completo</label>
                        </div>
                        <p className="text-lg font-semibold text-[#182230]">{profile.nombre}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="h-4 w-4 text-[#173B8F]" />
                          <label className="text-sm font-semibold text-[#52627A]">Correo Electrónico</label>
                        </div>
                        <p className="text-lg font-semibold text-[#182230]">{user.email}</p>
                      </div>
                    </div>

                    <div className="border-t border-[#E8ECF2]"></div>

                    {/* Row 2 */}
                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-4 w-4 text-[#173B8F]" />
                          <label className="text-sm font-semibold text-[#52627A]">Empresa</label>
                        </div>
                        <p className="text-lg font-semibold text-[#182230]">{profile.empresa || "No especificada"}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-[#173B8F]" />
                          <label className="text-sm font-semibold text-[#52627A]">Rol</label>
                        </div>
                        <Badge className="bg-[#173B8F]/10 text-[#173B8F] border-[#173B8F]/20">
                          {profile.rol === "admin" ? "Administrador" : "Usuario Cliente"}
                        </Badge>
                      </div>
                    </div>

                    <div className="border-t border-[#E8ECF2]"></div>

                    {/* Row 3 */}
                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-[#173B8F]" />
                          <label className="text-sm font-semibold text-[#52627A]">Fecha de Registro</label>
                        </div>
                        <p className="text-lg font-semibold text-[#182230]">
                          {profile.fecha_registro ? new Date(profile.fecha_registro).toLocaleDateString("es-ES") : "-"}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-[#173B8F]" />
                          <label className="text-sm font-semibold text-[#52627A]">Último Acceso</label>
                        </div>
                        <p className="text-lg font-semibold text-[#182230]">
                          {profile.fecha_ultimo_login ? new Date(profile.fecha_ultimo_login).toLocaleDateString("es-ES") : "-"}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-[#E8ECF2]"></div>

                    {/* Edit Button */}
                    <div className="flex gap-3">
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="bg-[#173B8F] hover:bg-[#102A66] text-white flex gap-2">
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
                            <Button className="bg-[#173B8F] hover:bg-[#102A66] text-white" onClick={handleUpdateProfile}>Guardar Cambios</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-[#173B8F] animate-spin" />
                  </div>
                )}
              </Card>
            </div>

            {/* Account Status */}
            <div>
              <Card className="p-8 border border-[#E8ECF2] bg-[#F4F6F9]">
                <h3 className="text-lg font-bold text-[#102A66] mb-6 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Estado de la Cuenta
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-semibold text-[#52627A] uppercase mb-2 block">Empresa Asociada</label>
                    <p className="text-sm font-bold text-[#182230]">{company?.company_name || profile?.empresa || "Sin empresa"}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#52627A] uppercase mb-2 block">Plan</label>
                    <Badge className="bg-[#173B8F]/10 text-[#173B8F] border-[#173B8F]/20 text-xs">
                      {company?.subscription_plan || "Plan Demo"}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#52627A] uppercase mb-2 block">Estado</label>
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${company?.subscription_status === 'active' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                      <span className="text-sm font-medium text-[#182230] capitalize">{company?.subscription_status || "Activa"}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Mis Proyectos Section */}
        <section className="mb-20 py-16 bg-[#F4F6F9] -mx-4 px-4">
          <div className="container mx-auto">
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-[#102A66] mb-2">Mis Proyectos</h2>
              <p className="text-[#52627A]">Gestiona y revisa el estado de tus automatizaciones activas</p>
            </div>

            <Card className="p-8 md:p-12 border border-[#E8ECF2] bg-white">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <p className="text-lg text-[#52627A] mb-4">
                    Accede a todos tus proyectos de automatización, revisa su estado, progreso y realiza cambios cuando sea necesario.
                  </p>
                  <ul className="space-y-2 text-[#52627A]">
                    <li className="flex gap-2 items-start">
                      <span className="text-[#173B8F] font-bold">✓</span>
                      <span>Visualiza el estado de cada automatización</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-[#173B8F] font-bold">✓</span>
                      <span>Accede a documentación y detalles técnicos</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-[#173B8F] font-bold">✓</span>
                      <span>Solicita cambios o mejoras</span>
                    </li>
                  </ul>
                </div>
                <Button
                  onClick={() => setLocation("/area-cliente/proyectos")}
                  className="bg-[#173B8F] hover:bg-[#102A66] text-white font-semibold flex gap-2 items-center whitespace-nowrap"
                >
                  Ver Proyectos
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        </section>

        {/* Presupuestos Section */}
        <section className="mb-20">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-[#102A66] mb-2">Presupuestos</h2>
            <p className="text-[#52627A]">Revisa y acepta tus propuestas comerciales personalizadas</p>
          </div>

          <Card className="p-8 md:p-12 border border-[#E8ECF2] bg-white">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <p className="text-lg text-[#52627A] mb-4">
                  Aquí encontrarás todos los presupuestos personalizados para tu empresa. Revisa los detalles, servicios incluidos y acepta cuando estés listo.
                </p>
                <ul className="space-y-2 text-[#52627A]">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#173B8F] font-bold">✓</span>
                    <span>Propuestas personalizadas según tu necesidad</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#173B8F] font-bold">✓</span>
                    <span>Detalles completos de servicios y precios</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#173B8F] font-bold">✓</span>
                    <span>Acepta y comienza tu proyecto</span>
                  </li>
                </ul>
              </div>
              <Button
                onClick={() => setLocation("/area-cliente/presupuestos")}
                className="bg-[#173B8F] hover:bg-[#102A66] text-white font-semibold flex gap-2 items-center whitespace-nowrap"
              >
                Ver Presupuestos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </section>

        {/* Facturación Section */}
        <section className="mb-20 py-16 bg-[#F4F6F9] -mx-4 px-4">
          <div className="container mx-auto">
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-[#102A66] mb-2">Facturación</h2>
              <p className="text-[#52627A]">Descarga tus facturas y gestiona tus métodos de pago</p>
            </div>

            <Card className="p-8 md:p-12 border border-[#E8ECF2] bg-white">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <p className="text-lg text-[#52627A] mb-4">
                    Accede a tu historial de facturas, descárgalas para tus registros y gestiona tus métodos de pago.
                  </p>
                  <ul className="space-y-2 text-[#52627A]">
                    <li className="flex gap-2 items-start">
                      <span className="text-[#173B8F] font-bold">✓</span>
                      <span>Historial completo de facturas</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-[#173B8F] font-bold">✓</span>
                      <span>Descarga en PDF para tus registros</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-[#173B8F] font-bold">✓</span>
                      <span>Gestión de métodos de pago</span>
                    </li>
                  </ul>
                </div>
                <Button
                  onClick={() => setLocation("/area-cliente/facturacion")}
                  className="bg-[#173B8F] hover:bg-[#102A66] text-white font-semibold flex gap-2 items-center whitespace-nowrap"
                >
                  Ir a Facturación
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        </section>

        {/* Soporte Técnico Section */}
        <section className="mb-20">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-[#102A66] mb-2">Soporte Técnico</h2>
            <p className="text-[#52627A]">¿Necesitas ayuda? Abre un ticket y nuestro equipo te ayudará</p>
          </div>

          <Card className="p-8 md:p-12 border border-[#E8ECF2] bg-white">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <p className="text-lg text-[#52627A] mb-4">
                  Nuestro equipo de soporte está disponible para ayudarte con cualquier pregunta o problema técnico.
                </p>
                <ul className="space-y-2 text-[#52627A]">
                  <li className="flex gap-2 items-start">
                    <span className="text-[#173B8F] font-bold">✓</span>
                    <span>Soporte técnico dedicado</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#173B8F] font-bold">✓</span>
                    <span>Respuestas rápidas a tus consultas</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-[#173B8F] font-bold">✓</span>
                    <span>Seguimiento de tus tickets</span>
                  </li>
                </ul>
              </div>
              <Button
                onClick={() => setLocation("/area-cliente/soporte")}
                className="bg-[#173B8F] hover:bg-[#102A66] text-white font-semibold flex gap-2 items-center whitespace-nowrap"
              >
                Abrir Ticket
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </section>

        {/* Contact Section */}
        <section className="py-16 bg-gradient-to-r from-[#102A66] to-[#173B8F] -mx-4 px-4 rounded-2xl text-white">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Necesitas ayuda adicional?</h2>
            <p className="text-white/80 mb-8 max-w-2xl mx-auto">
              Si tienes preguntas que no encuentras en el área de clientes, no dudes en contactarnos. Nuestro equipo está aquí para ayudarte.
            </p>
            <Button
              className="bg-white text-[#102A66] hover:bg-white/90 font-semibold"
              onClick={() => window.location.href = "mailto:info@modira.es"}
            >
              Contactar a Modira
            </Button>
          </div>
        </section>
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
