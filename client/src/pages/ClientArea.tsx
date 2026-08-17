import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  User,
  Mail,
  Building2,
  Calendar,
  Phone,
  Zap,
  FileText,
  CreditCard,
  LifeBuoy,
  AlertCircle,
  Edit2,
  ArrowRight,
  Loader2,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  fecha_registro: string;
}

interface CompanyInfo {
  id: string;
  company_name: string;
  subscription_plan: string | null;
  subscription_status: string | null;
}

const SectionCard = ({
  icon: Icon,
  title,
  description,
  items,
  buttonLabel,
  onClick,
}: {
  icon: any;
  title: string;
  description: string;
  items: string[];
  buttonLabel: string;
  onClick: () => void;
}) => (
  <Card className="border border-[#E8ECF2] bg-white p-8 md:p-10">
    <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
      <div className="flex-1">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F]">
          <Icon className="h-6 w-6" />
        </div>

        <h3 className="mb-2 text-2xl font-bold text-[#102A66]">{title}</h3>

        <p className="mb-5 text-lg text-[#52627A]">{description}</p>

        <ul className="space-y-2 text-[#52627A]">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="font-bold text-[#173B8F]">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button
        type="button"
        onClick={onClick}
        className="shrink-0 bg-[#173B8F] font-semibold text-white hover:bg-[#102A66]"
      >
        {buttonLabel}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  </Card>
);

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
      setLoading(true);
      setError(null);

      let { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (fetchError?.code === "PGRST116") {
        const { data: newData, error: createError } = await supabase
          .from("profiles")
          .insert([
            {
              id: user.id,
              nombre:
                user.user_metadata?.nombre ||
                user.email?.split("@")[0] ||
                "Usuario",
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

      if (!data) {
        throw new Error("No se encontró el perfil del usuario.");
      }

      setProfile(data as UserProfile);

      setEditForm({
        nombre: data.nombre || "",
        empresa: data.empresa || "",
        telefono: data.telefono || "",
      });

      if (data.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("id, company_name, subscription_plan, subscription_status")
          .eq("id", data.company_id)
          .single();

        if (companyError) {
          console.warn("[ClientArea] No se pudo cargar la empresa:", companyError);
        } else if (companyData) {
          setCompany(companyData as CompanyInfo);
        }
      }
    } catch (err: any) {
      console.error("[ClientArea] Error:", err);
      setError(`Error al cargar el perfil: ${err?.message || "Error desconocido"}`);
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
      await fetchProfile();
    } catch (err: any) {
      toast.error(`Error al actualizar el perfil: ${err?.message || "Error desconocido"}`);
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

        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-[#173B8F]" />
            <p className="text-[#52627A]">Cargando tu área de clientes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER GLOBAL DEL ÁREA DE CLIENTE */}
      <ClientAreaHeader
        userName={profile?.nombre || user.email || "Usuario"}
        onLogout={handleLogout}
      />

      <main className="container mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 xl:px-16 pt-[120px] pb-14">
        {error && (
          <Card className="mb-10 flex items-center gap-3 border-2 border-red-200 bg-red-50 p-5">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <p className="text-red-700">{error}</p>
          </Card>
        )}

        {/* CABECERA DEL DASHBOARD */}
        <section className="mb-14">
          <div className="mb-7">
  <h2 className="text-3xl font-bold text-[#102A66]">
    Área de Cliente
  </h2>

  <p className="mt-2 text-[#52627A]">
    Gestiona desde aquí tus proyectos, presupuestos, facturas y soporte técnico.
  </p>
</div>
        </section>

        {/* RESUMEN GLOBAL */}
        <section className="mb-16 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => setLocation("/area-cliente/proyectos")}
            className="rounded-2xl border border-[#E8ECF2] bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#173B8F] hover:shadow-md"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F]">
              <Zap className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-[#102A66]">Mis proyectos</h2>
            <p className="mt-2 text-sm text-[#52627A]">
              Consulta y revisa tus automatizaciones.
            </p>
            <span className="mt-5 inline-flex items-center font-semibold text-[#173B8F]">
              Ver proyectos <ArrowRight className="ml-2 h-4 w-4" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => setLocation("/area-cliente/presupuestos")}
            className="rounded-2xl border border-[#E8ECF2] bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#173B8F] hover:shadow-md"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F]">
              <FileText className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-[#102A66]">Presupuestos</h2>
            <p className="mt-2 text-sm text-[#52627A]">
              Revisa tus propuestas comerciales.
            </p>
            <span className="mt-5 inline-flex items-center font-semibold text-[#173B8F]">
              Ver presupuestos <ArrowRight className="ml-2 h-4 w-4" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => setLocation("/area-cliente/facturacion")}
            className="rounded-2xl border border-[#E8ECF2] bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#173B8F] hover:shadow-md"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F]">
              <CreditCard className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-[#102A66]">Facturación</h2>
            <p className="mt-2 text-sm text-[#52627A]">
              Consulta tus facturas y sus documentos.
            </p>
            <span className="mt-5 inline-flex items-center font-semibold text-[#173B8F]">
              Ver facturación <ArrowRight className="ml-2 h-4 w-4" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => setLocation("/area-cliente/soporte")}
            className="rounded-2xl border border-[#E8ECF2] bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#173B8F] hover:shadow-md"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F]">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-[#102A66]">Soporte técnico</h2>
            <p className="mt-2 text-sm text-[#52627A]">
              Abre y consulta tus tickets de soporte.
            </p>
            <span className="mt-5 inline-flex items-center font-semibold text-[#173B8F]">
              Ir a soporte <ArrowRight className="ml-2 h-4 w-4" />
            </span>
          </button>
        </section>

        {/* MI PERFIL */}
<section id="perfil" className="mb-16">
  <div className="mb-7 flex items-end justify-between gap-6">
    <div>
      <h2 className="text-3xl font-bold text-[#102A66]">
        Mi Perfil
      </h2>

      <p className="mt-2 text-[#52627A]">
        Información personal y configuración de tu cuenta.
      </p>
    </div>

    {/* FECHA DE REGISTRO */}
    {profile && (
      <div className="hidden md:flex items-center gap-2 pb-1">
        <Calendar className="h-4 w-4 text-[#173B8F]" />

        <div>
          <span className="text-sm font-semibold text-[#52627A]">
            Fecha de registro
          </span>

          <span className="ml-2 text-sm font-semibold text-[#182230]">
            {profile.fecha_registro
              ? new Date(profile.fecha_registro).toLocaleDateString("es-ES")
              : "-"}
          </span>
        </div>
      </div>
    )}
  </div>

  {/* FECHA DE REGISTRO EN MÓVIL */}
  {profile && (
    <div className="mb-5 flex items-center gap-2 md:hidden">
      <Calendar className="h-4 w-4 text-[#173B8F]" />

      <span className="text-sm font-semibold text-[#52627A]">
        Fecha de registro:
      </span>

      <span className="text-sm font-semibold text-[#182230]">
        {profile.fecha_registro
          ? new Date(profile.fecha_registro).toLocaleDateString("es-ES")
          : "-"}
      </span>
    </div>
  )}

  <Card className="border border-[#E8ECF2] bg-white p-8">
    {profile ? (
      <div className="space-y-8">

        {/* NOMBRE + CORREO */}
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-[#173B8F]" />

              <label className="text-sm font-semibold text-[#52627A]">
                Nombre completo
              </label>
            </div>

            <p className="text-lg font-semibold text-[#182230]">
              {profile.nombre}
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#173B8F]" />

              <label className="text-sm font-semibold text-[#52627A]">
                Correo electrónico
              </label>
            </div>

            <p className="text-lg font-semibold text-[#182230]">
              {user.email}
            </p>
          </div>
        </div>

        <div className="border-t border-[#E8ECF2]" />

        {/* EMPRESA + TELÉFONO */}
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#173B8F]" />

              <label className="text-sm font-semibold text-[#52627A]">
                Empresa
              </label>
            </div>

            <p className="text-lg font-semibold text-[#182230]">
  {profile.empresa?.trim()
    ? profile.empresa
    : "Sin definir"}
</p>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#173B8F]" />

              <label className="text-sm font-semibold text-[#52627A]">
                Teléfono
              </label>
            </div>

            <p className="text-lg font-semibold text-[#182230]">
              {profile.telefono?.trim()
                ? profile.telefono
                : "Sin definir"}
            </p>
          </div>
        </div>

        <div className="border-t border-[#E8ECF2]" />

        {/* EDITAR PERFIL */}
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        >
          <DialogTrigger asChild>
            <Button className="bg-[#173B8F] text-white hover:bg-[#102A66]">
              <Edit2 className="mr-2 h-4 w-4" />
              Editar Perfil
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Perfil</DialogTitle>

              <DialogDescription>
                Actualiza tu información personal y de contacto.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">

              <div className="grid gap-2">
                <Label htmlFor="name">
                  Nombre
                </Label>

                <Input
                  id="name"
                  value={editForm.nombre}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      nombre: event.target.value,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="company">
                  Empresa
                </Label>

                <Input
                  id="company"
                  value={editForm.empresa}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      empresa: event.target.value,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">
                  Teléfono
                </Label>

                <Input
                  id="phone"
                  value={editForm.telefono}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      telefono: event.target.value,
                    })
                  }
                />
              </div>

            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                className="bg-[#173B8F] text-white hover:bg-[#102A66]"
                onClick={handleUpdateProfile}
              >
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    ) : (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#173B8F]" />
      </div>
    )}
  </Card>
</section>

        {/* ACCESOS DETALLADOS
        <section className="space-y-10">
          <div>
            <h2 className="text-3xl font-bold text-[#102A66]">
              Gestiona tu cuenta
            </h2>
            <p className="mt-2 text-[#52627A]">
              Accede directamente a cada apartado del área de cliente.
            </p>
          </div>

          <SectionCard
            icon={Zap}
            title="Mis Proyectos"
            description="Gestiona y revisa el estado de tus automatizaciones y proyectos activos."
            items={[
              "Visualiza el estado de cada automatización",
              "Consulta tus proyectos activos y completados",
              "Revisa los detalles de cada proyecto",
            ]}
            buttonLabel="Ver Proyectos"
            onClick={() => setLocation("/area-cliente/proyectos")}
          />

          <SectionCard
            icon={FileText}
            title="Presupuestos"
            description="Revisa tus propuestas comerciales personalizadas y consulta sus detalles."
            items={[
              "Consulta tus presupuestos",
              "Revisa servicios e importes",
              "Accede al detalle de cada propuesta",
            ]}
            buttonLabel="Ver Presupuestos"
            onClick={() => setLocation("/area-cliente/presupuestos")}
          />

          <SectionCard
            icon={CreditCard}
            title="Facturación"
            description="Consulta el estado general de tu facturación y revisa tus facturas."
            items={[
              "Consulta todas tus facturas",
              "Comprueba si tienes facturas pendientes",
              "Visualiza o descarga el PDF cuando esté disponible",
            ]}
            buttonLabel="Ir a Facturación"
            onClick={() => setLocation("/area-cliente/facturacion")}
          />

          <SectionCard
            icon={LifeBuoy}
            title="Soporte Técnico"
            description="Consulta tus tickets y contacta con nuestro equipo cuando necesites ayuda."
            items={[
              "Crea nuevos tickets de soporte",
              "Consulta el estado de tus solicitudes",
              "Realiza seguimiento de tus incidencias",
            ]}
            buttonLabel="Ir a Soporte"
            onClick={() => setLocation("/area-cliente/soporte")}
          />
        </section> */}

        {/* CONTACTO */}
        <section 
        id="ayuda"
        className="mt-16 rounded-2xl bg-gradient-to-r from-[#102A66] to-[#173B8F] px-6 py-14 text-center text-white md:px-10">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            ¿Necesitas ayuda adicional?
          </h2>

          <p className="mx-auto mb-8 max-w-2xl text-white/80">
            Si tienes preguntas que no encuentras en el área de clientes, no dudes
            en contactar con nosotros. Nuestro equipo está aquí para ayudarte.
          </p>

          <Button
            type="button"
            className="bg-white font-semibold text-[#102A66] hover:bg-white/90"
            onClick={() => {
              window.location.href = "mailto:modira.information@gmail.com";
            }}
          >
            Contactar a Modira
          </Button>
        </section>
      </main>

      <footer className="mt-20 bg-[#102A66] py-8 text-white">
        <div className="container mx-auto px-4 text-center text-sm text-white/70">
          <p>© {new Date().getFullYear()} Modira. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}