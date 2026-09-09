import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Header from "@/components/Header";
import HowWeWork from "@/components/HowWeWork";
import { AIChatBot } from "@/components/AIChatBot";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  
} from "@/components/ui/accordion";
import {
  CheckCircle,
  Zap,
  BarChart3,
  Cog,
  ArrowRight,
  Star,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Wrench,
  Workflow,
  Cloud,
  Database,
  MessageCircle,
  CalendarDays,
  Webhook,
  Network,
  ShieldCheck,
  Target,
  Users,
  Activity,
  Instagram,
  Linkedin,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function IntegrationFlow() {
  const leftIntegrations = [
    {
      name: "Make",
      description: "Automatización visual",
      icon: Workflow,
      color: "#9333EA",
      side: "left",
    },
    {
      name: "n8n",
      description: "Workflows avanzados",
      icon: Network,
      color: "#F43F5E",
      side: "left",
    },
    {
      name: "APIs & Webhooks",
      description: "Conecta servicios externos",
      icon: Webhook,
      color: "#2563EB",
      side: "left",
    },
  ];

  const rightIntegrations = [
    {
      name: "Google Workspace",
      description: "Docs, Sheets, Gmail y más",
      icon: Cloud,
      color: "#4285F4",
      side: "right",
    },
    {
      name: "Airtable",
      description: "Bases de datos flexibles",
      icon: Database,
      color: "#F59E0B",
      side: "right",
    },
    {
      name: "WhatsApp Business",
      description: "Mensajería y atención",
      icon: MessageCircle,
      color: "#22C55E",
      side: "right",
    },
  ];

  const benefits = [
    {
      icon: TrendingUp,
      title: "Más eficiencia",
      description: "Automatiza tareas repetitivas",
    },
    {
      icon: Target,
      title: "Mayor precisión",
      description: "Reduce errores manuales",
    },
    {
      icon: Users,
      title: "Mejor colaboración",
      description: "Conecta equipos y herramientas",
    },
    {
      icon: Activity,
      title: "Información en tiempo real",
      description: "Datos siempre actualizados",
    },
    {
      icon: ShieldCheck,
      title: "Seguro y escalable",
      description: "Preparado para crecer contigo",
    },
  ];

  return (
    <section className="relative mt-16 overflow-hidden rounded-3xl border border-[#E8ECF2] bg-gradient-to-br from-[#F8FAFF] via-white to-[#F4F7FC] px-5 py-14 md:px-8 md:py-16">

      {/* Background decorative elements */}
      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-[#173B8F]/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-10 h-72 w-72 rounded-full bg-[#2854B8]/5 blur-3xl" />

      {/* Header */}
      <div className="relative z-10 mx-auto mb-14 max-w-3xl text-center">
        <h3 className="scroll-reveal-item text-3xl font-bold tracking-tight text-[#102A66] md:text-4xl">
          Sistemas conectados. Procesos automatizados.
          <br className="hidden md:block" />
          <span className="text-[#173B8F]"> Un negocio que trabaja mejor.</span>
        </h3>

        <p className="scroll-reveal-item mt-4 text-base text-[#52627A] md:text-lg">
          Todas tus herramientas trabajando juntas de forma inteligente
        </p>
      </div>

      {/* Main integration diagram */}
<div className="relative z-10 mx-auto max-w-6xl">

  {/* DESKTOP */}
  <div className="relative hidden h-[430px] md:block">

    {/* ========================= */}
    {/* CONEXIONES */}
    {/* ========================= */}

    <svg
      className="pointer-events-none absolute left-0 top-0 z-0 h-full w-full"
      viewBox="0 0 1200 430"
      preserveAspectRatio="none"
      fill="none"
    >

      {/* Make → Modira */}
      <path
        d="M300 70 C400 70 445 120 505 155"
        stroke="#2563EB"
        strokeWidth="2"
        strokeDasharray="7 7"
        strokeLinecap="round"
      />

      {/* n8n → Modira */}
      <path
        d="M300 215 C390 215 440 215 505 215"
        stroke="#2563EB"
        strokeWidth="2"
        strokeDasharray="7 7"
        strokeLinecap="round"
      />

      {/* APIs → Modira */}
      <path
        d="M300 360 C400 360 445 310 505 275"
        stroke="#2563EB"
        strokeWidth="2"
        strokeDasharray="7 7"
        strokeLinecap="round"
      />

      {/* Modira → Google */}
      <path
        d="M695 155 C755 120 800 70 900 70"
        stroke="#2563EB"
        strokeWidth="2"
        strokeDasharray="7 7"
        strokeLinecap="round"
      />

      {/* Modira → Airtable */}
      <path
        d="M695 215 C760 215 810 215 900 215"
        stroke="#2563EB"
        strokeWidth="2"
        strokeDasharray="7 7"
        strokeLinecap="round"
      />

      {/* Modira → WhatsApp */}
      <path
        d="M695 275 C755 310 800 360 900 360"
        stroke="#2563EB"
        strokeWidth="2"
        strokeDasharray="7 7"
        strokeLinecap="round"
      />
    </svg>


    {/* ========================= */}
    {/* COLUMNA IZQUIERDA */}
    {/* ========================= */}

    <div className="absolute left-0 top-[15px] w-[300px]">
      <div className="scroll-reveal-item flex h-[110px] items-center rounded-2xl border border-[#E8ECF2] bg-white px-6 shadow-sm">
        <div className="mr-4 flex h-14 w-14 items-center justify-center rounded-xl bg-purple-50">
          <Workflow className="h-7 w-7 text-purple-600" />
        </div>

        <div>
          <h4 className="text-lg font-bold text-[#102A66]">
            Make
          </h4>
          <p className="text-sm text-[#52627A]">
            Automatización visual
          </p>
        </div>
      </div>
    </div>


    <div className="absolute left-0 top-[160px] w-[300px]">
      <div className="scroll-reveal-item flex h-[110px] items-center rounded-2xl border border-[#E8ECF2] bg-white px-6 shadow-sm">
        <div className="mr-4 flex h-14 w-14 items-center justify-center rounded-xl bg-rose-50">
          <Network className="h-7 w-7 text-rose-500" />
        </div>

        <div>
          <h4 className="text-lg font-bold text-[#102A66]">
            n8n
          </h4>
          <p className="text-sm text-[#52627A]">
            Workflows avanzados
          </p>
        </div>
      </div>
    </div>


    <div className="absolute left-0 top-[305px] w-[300px]">
      <div className="scroll-reveal-item flex h-[110px] items-center rounded-2xl border border-[#E8ECF2] bg-white px-6 shadow-sm">
        <div className="mr-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50">
          <Webhook className="h-7 w-7 text-blue-600" />
        </div>

        <div>
          <h4 className="text-lg font-bold text-[#102A66]">
            APIs & Webhooks
          </h4>
          <p className="text-sm text-[#52627A]">
            Conecta servicios externos
          </p>
        </div>
      </div>
    </div>


    {/* ========================= */}
    {/* COLUMNA DERECHA */}
    {/* ========================= */}

    <div className="absolute right-0 top-[15px] w-[300px]">
      <div className="scroll-reveal-item flex h-[110px] items-center rounded-2xl border border-[#E8ECF2] bg-white px-6 shadow-sm">
        <div className="mr-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50">
          <Cloud className="h-7 w-7 text-blue-500" />
        </div>

        <div>
          <h4 className="text-lg font-bold text-[#102A66]">
            Google Workspace
          </h4>
          <p className="text-sm text-[#52627A]">
            Docs, Sheets, Gmail y más
          </p>
        </div>
      </div>
    </div>


    <div className="absolute right-0 top-[160px] w-[300px]">
      <div className="scroll-reveal-item flex h-[110px] items-center rounded-2xl border border-[#E8ECF2] bg-white px-6 shadow-sm">
        <div className="mr-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50">
          <Database className="h-7 w-7 text-orange-500" />
        </div>

        <div>
          <h4 className="text-lg font-bold text-[#102A66]">
            Airtable
          </h4>
          <p className="text-sm text-[#52627A]">
            Bases de datos flexibles
          </p>
        </div>
      </div>
    </div>


    <div className="absolute right-0 top-[305px] w-[300px]">
      <div className="scroll-reveal-item flex h-[110px] items-center rounded-2xl border border-[#E8ECF2] bg-white px-6 shadow-sm">
        <div className="mr-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green-50">
          <MessageCircle className="h-7 w-7 text-green-500" />
        </div>

        <div>
          <h4 className="text-lg font-bold text-[#102A66]">
            WhatsApp Business
          </h4>
          <p className="text-sm text-[#52627A]">
            Mensajería y atención
          </p>
        </div>
      </div>
    </div>


    {/* ========================= */}
    {/* CENTRAL AUTOMATION HUB */}
    {/* ========================= */}

    <div className="absolute left-1/2 top-0 -translate-x-1/2">
      <div className="scroll-reveal-item rounded-2xl border border-[#D9E2F5] bg-white px-8 py-4 text-center shadow-md">
        <h4 className="text-lg font-bold text-[#173B8F]">
          Central Automation Hub
        </h4>

        <p className="mt-1 text-sm text-[#52627A]">
          Conecta • Automatiza • Integra
        </p>
      </div>
    </div>


    {/* ========================= */}
    {/* MODIRA */}
    {/* ========================= */}

    <div className="absolute left-1/2 top-[120px] -translate-x-1/2">

      <div className="scroll-reveal-item relative flex h-[150px] w-[150px] items-center justify-center rounded-full border-[10px] border-white bg-[#173B8F] shadow-xl">

        <div className="absolute inset-[10px] rounded-full border border-white/20" />

        <div className="relative text-center text-white">
          <Zap className="mx-auto mb-1 h-12 w-12 fill-white" />

          <p className="text-base font-bold tracking-[0.25em]">
            MODIRA
          </p>
        </div>

      </div>

    </div>


    {/* ========================= */}
    {/* DATA FLOW */}
    {/* ========================= */}

    <div className="absolute left-1/2 top-[295px] -translate-x-1/2">
      <div className="scroll-reveal-item flex w-[300px] items-center justify-between rounded-2xl border border-[#E8ECF2] bg-white px-6 py-4 shadow-sm">

        <ArrowRight className="h-5 w-5 rotate-180 text-[#173B8F]" />

        <div className="text-center">
          <p className="font-bold text-[#173B8F]">
            Data Flow
          </p>

          <p className="text-xs text-[#52627A]">
            Seguro • Fiable • Tiempo real
          </p>
        </div>

        <ArrowRight className="h-5 w-5 text-[#173B8F]" />

      </div>
    </div>

  </div>


  {/* ========================= */}
  {/* MOBILE */}
  {/* ========================= */}

  <div className="space-y-4 md:hidden">

    <div className="scroll-reveal-item rounded-2xl border border-[#E8ECF2] bg-white p-5 shadow-sm">
      <p className="font-bold text-[#102A66]">Make</p>
      <p className="text-sm text-[#52627A]">
        Automatización visual
      </p>
    </div>

    <div className="scroll-reveal-item rounded-2xl border border-[#E8ECF2] bg-white p-5 shadow-sm">
      <p className="font-bold text-[#102A66]">n8n</p>
      <p className="text-sm text-[#52627A]">
        Workflows avanzados
      </p>
    </div>

    <div className="scroll-reveal-item rounded-2xl border border-[#E8ECF2] bg-white p-5 shadow-sm">
      <p className="font-bold text-[#102A66]">
        APIs & Webhooks
      </p>
      <p className="text-sm text-[#52627A]">
        Conecta servicios externos
      </p>
    </div>

    <div className="scroll-reveal-item rounded-2xl border border-[#E8ECF2] bg-[#173B8F] p-8 text-center text-white">
      <Zap className="mx-auto mb-2 h-12 w-12" />

      <p className="font-bold tracking-[0.25em]">
        MODIRA
      </p>
    </div>

    <div className="scroll-reveal-item rounded-2xl border border-[#E8ECF2] bg-white p-5 shadow-sm">
      <p className="font-bold text-[#102A66]">
        Google Workspace
      </p>
      <p className="text-sm text-[#52627A]">
        Docs, Sheets, Gmail y más
      </p>
    </div>

    <div className="scroll-reveal-item rounded-2xl border border-[#E8ECF2] bg-white p-5 shadow-sm">
      <p className="font-bold text-[#102A66]">
        Airtable
      </p>
      <p className="text-sm text-[#52627A]">
        Bases de datos flexibles
      </p>
    </div>

    <div className="scroll-reveal-item rounded-2xl border border-[#E8ECF2] bg-white p-5 shadow-sm">
      <p className="font-bold text-[#102A66]">
        WhatsApp Business
      </p>
      <p className="text-sm text-[#52627A]">
        Mensajería y atención
      </p>
    </div>

  </div>

</div>
        {/* Benefits */}
        <div className="relative z-10 mt-14 grid gap-4 border-t border-dashed border-[#BFCBE0] pt-8 sm:grid-cols-2 lg:grid-cols-5">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <div
                key={benefit.title}
                className="group rounded-xl border border-[#E8ECF2] bg-white/80 p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md"
              >
                <Icon className="mx-auto mb-3 h-8 w-8 text-[#173B8F] transition-transform duration-300 group-hover:scale-110" />

                <h4 className="scroll-reveal-item text-sm font-bold text-[#102A66]">
                  {benefit.title}
                </h4>

                <p className="scroll-reveal-item mt-1 text-xs text-[#52627A]">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      

      {/* Mobile explanation */}
      <div className="relative z-10 mt-8 text-center md:hidden">
        <p className="text-sm text-[#52627A]">
          Modira conecta tus herramientas y automatiza el flujo de información
          entre ellas.
        </p>
      </div>
    </section>
  );
}

function useScrollRevealElements() {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(
      ".scroll-reveal-item"
    );

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);
}

export default function Home() {
  useScrollRevealElements();

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    empresa: "",
    empleados: "",
    proceso: "",
  });

  const [savingsData, setSavingsData] = useState({
    employees: 5,
    hoursPerWeek: 10,
    hourlyRate: 25,
  });

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

const handleFormSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    // AUDITORÍA V-10:
    //
    // El INSERT directo anónimo en audit_requests se ha retirado
    // (migración 028). La solicitud pasa por la RPC
    // submit_audit_request, que valida los datos y aplica un límite
    // de 3 solicitudes por identidad y hora en el backend.
    const { error } = await supabase.rpc("submit_audit_request", {
      p_nombre: formData.nombre,
      p_email: formData.email,
      p_empresa: formData.empresa,
      p_empleados: formData.empleados,
      p_proceso: formData.proceso,
    });

    if (error) {
      // No se exponen detalles internos de la base de datos al
      // usuario; el detalle técnico queda solo en consola.
      console.error("Error enviando la solicitud:", error.message);

      alert(
        error.message.includes("Demasiadas solicitudes")
          ? "Has enviado demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde."
          : "No se ha podido enviar la solicitud. Revisa los datos e inténtalo de nuevo."
      );

      return;
    }

    alert("Gracias por tu solicitud. Te contactaremos pronto.");

    setFormData({
      nombre: "",
      email: "",
      empresa: "",
      empleados: "",
      proceso: "",
    });
  } catch (error) {
    console.error("Error inesperado:", error);
    alert("Ha ocurrido un error inesperado.");
  }
};
  const handleSavingsChange = (field: string, value: number) => {
    setSavingsData({
      ...savingsData,
      [field]: value,
    });
  };

  const weeklySavings = savingsData.employees * savingsData.hoursPerWeek;
  const monthlySavings = weeklySavings * 4;
  const yearlySavings = monthlySavings * 12;
  const monthlyCost = weeklySavings * savingsData.hourlyRate * 4;


  return (
    <div className="min-h-screen bg-white">
      <style>{`
  .scroll-reveal-item {
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 700ms ease-out, transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform, opacity;
  }

  .scroll-reveal-item.is-visible {
    opacity: 1;
    transform: translateY(0);
  }

  @media (prefers-reduced-motion: reduce) {
    .scroll-reveal-item {
      opacity: 1 !important;
      transform: none !important;
      filter: none !important;
      transition: none !important;
    }
  }
`}</style>

     <Header />

{/* Hero Section - Premium Dark Blue Gradient */}
<section className="pt-42 pb-20 md:pb-26 bg-gradient-to-br from-[#102A66] via-[#173B8F] to-[#2854B8] relative overflow-hidden">
  {/* Background decorative elements */}
  <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-48 -mt-48"></div>
  <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -ml-48 -mb-48"></div>

  <div className="container mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 xl:px-16 relative z-10">
    <div className="grid md:grid-cols-2 gap-12 items-center">
      
      <div className="space-y-7">
        
        <h1 className="text-[40px] md:text-[44px] lg:text-[47px] font-bold text-white leading-[1.25] tracking-[0em]">
          Automatiza tu empresa,
          <br />
          libera tu equipo
        </h1>

        {/* Subtítulo */}
        <p className="max-w-[620px] text-[17px] md:text-[18px] text-white/85 leading-[1.5]">
          Menos trabajo manual. Más tiempo para hacer crecer tu negocio.
        </p>

        {/* Flujo de beneficios */}
        <div className="flex flex-nowrap items-center text-[15px] md:text-[16px] font-medium text-white/90">

          {/* Elimina tareas */}
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 border border-white/10 text-[11px]">
              ✓
            </span>
            Elimina tareas
          </span>

          {/* Conector */}
          <span className="mx-3 md:mx-4 text-[22px] font-light text-white/35">
            ›
          </span>

          {/* Conecta herramientas */}
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 border border-white/10 text-[11px]">
              ✓
            </span>
            Conecta herramientas
          </span>

          {/* Conector */}
          <span className="mx-3 md:mx-4 text-[22px] font-light text-white/35">
            ›
          </span>

          {/* Gana tiempo */}
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 border border-white/10 text-[11px]">
              ✓
            </span>
            Gana tiempo
          </span>

        </div>

        <div className="flex flex-col sm:flex-row gap-8 pt-4">
          <Button
            size="lg"
            className="bg-white text-[#102A66] hover:bg-[#F4F6F9] text-base font-semibold px-8 shadow-lg hover:shadow-xl transition-all"
            onClick={() =>
              document
                .getElementById("auditoria")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Solicita tu auditoría gratuita
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="text-white border-white/30 hover:bg-white/10 text-base font-semibold px-8"
            onClick={() =>
              document
                .getElementById("casos-exito")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Ver casos de éxito
          </Button>
        </div>

      </div>

      <div className="relative hidden md:block">
        <video
          src="/Images/modira_video_loop.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="rounded-2xl shadow-2xl w-full h-auto"
        />
      </div>

    </div>
  </div>
</section>    {/* <div className="h-6 bg-gradient-to-b from-[#2854B8] to-[#F4F6F9]" /> para difuminar el final del azul*/}

    {/* Statistics Section - Premium Cards */}
<section className="py-10 md:py-14 bg-[#F4F6F9]">
  <div className="container mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">

    <div className="relative overflow-hidden">

      {/* Carrusel infinito */}
      <div className="stats-scroll flex w-max gap-6">

        {/* PRIMER GRUPO */}
        <div className="flex gap-6">
          {[
            {
              label: "Hasta",
              value: "80%",
              description: "Reducción de trabajo manual",
              icon: TrendingUp,
            },
            {
              label: "Potencial",
              value: "10-30 h",
              description: "Ahorro semanal por proceso",
              icon: Clock,
            },
            {
              label: "Experiencia",
              value: "75+",
              description: "Procesos automatizados",
              icon: CheckCircle,
            },
            {
              label: "Disponibilidad",
              value: "24/7",
              description: "Automatizaciones funcionando",
              icon: Zap,
            },
          ].map((stat, idx) => (
            <Card
              key={`group-1-${idx}`}
              className="scroll-reveal-item w-[280px] md:w-[270px] lg:w-[280px] xl:w-[290px] shrink-0 p-4 md:p-5 border border-[#E8ECF2] bg-white hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-[#52627A] mb-1">
                    {stat.label}
                  </p>

                  <p className="text-3xl md:text-4xl font-bold text-[#173B8F] mt-3">
                    {stat.value}
                  </p>
                </div>

                <stat.icon className="h-6 w-6 text-[#173B8F] opacity-60" />
              </div>

              <p className="text-sm text-[#52627A]">
                {stat.description}
              </p>
            </Card>
          ))}
        </div>

        {/* SEGUNDO GRUPO - DUPLICADO PARA EL LOOP INFINITO */}
        <div className="flex gap-6">
          {[
            {
              label: "Hasta",
              value: "80%",
              description: "Reducción de trabajo manual",
              icon: TrendingUp,
            },
            {
              label: "Potencial",
              value: "10-30 h",
              description: "Ahorro semanal por proceso",
              icon: Clock,
            },
            {
              label: "Experiencia",
              value: "75+",
              description: "Procesos automatizados",
              icon: CheckCircle,
            },
            {
              label: "Disponibilidad",
              value: "24/7",
              description: "Automatizaciones funcionando",
              icon: Zap,
            },
          ].map((stat, idx) => (
            <Card
              key={`group-2-${idx}`}
              className="scroll-reveal-item w-[280px] md:w-[270px] lg:w-[280px] xl:w-[290px] shrink-0 p-4 md:p-5 border border-[#E8ECF2] bg-white hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-[#52627A] mb-1">
                    {stat.label}
                  </p>

                  <p className="text-3xl md:text-4xl font-bold text-[#173B8F] mt-3">
                    {stat.value}
                  </p>
                </div>

                <stat.icon className="h-6 w-6 text-[#173B8F] opacity-60" />
              </div>

              <p className="text-sm text-[#52627A]">
                {stat.description}
              </p>
            </Card>
          ))}
        </div>

      </div>

      {/* Difuminado lateral izquierdo */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 md:w-14 bg-gradient-to-r from-[#F4F6F9] to-transparent" />

      {/* Difuminado lateral derecho */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 md:w-14 bg-gradient-to-l from-[#F4F6F9] to-transparent" />

    </div>

  </div>
</section>

      {/* Problema Section - Enhanced */}
      <section className="relative py-16 md:py-24 bg-white before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-[#F4F6F9] before:to-white">
        <div className="relative z-10 container mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative order-2 md:order-1">
              <img
                src="/Images/manual-processes.png"
                alt="Procesos manuales"
                className="scroll-reveal-item rounded-2xl shadow-lg w-full h-auto"
              />
            </div>
            <div className="space-y-6 order-1 md:order-2">
              <h2 className="scroll-reveal-item text-3xl md:text-4xl font-bold text-[#102A66] leading-tight">
                El problema que enfrentas
              </h2>
              <p className="scroll-reveal-item text-lg text-[#52627A]">
                Tu equipo pierde horas valiosas en tareas que podrían automatizarse:
              </p>
              <ul className="scroll-reveal-item space-y-4">
                {[
                  "Introducir datos manualmente en múltiples herramientas",
                  "Procesos administrativos repetitivos sin conexión entre sistemas",
                  "Errores humanos que generan retrasos y costos",
                  "Respuestas lentas a clientes por falta de automatización",
                  "Oportunidades comerciales perdidas por falta de tiempo",
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      </div>
                    </div>
                    <span className="text-[#182230]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>


      {/* Solución Section - Enhanced */}
        {/* <section className="pt-16 md:pt-24 pb-4 md:pb-8 bg-[#F4F6F9]"> */}
       


          <section className="relative py-16 md:py-24 bg-[#F4F6F9] before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-white before:to-[#F4F6F9]">
          <div className="relative z-10 container mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">

          <div className="text-center mb-12">
            <h2 className="scroll-reveal-item text-3xl md:text-4xl font-bold text-[#102A66] mb-4 leading-tight">
              La solución: Automatización inteligente
            </h2>
            <p className="scroll-reveal-item text-lg text-[#52627A] max-w-2xl mx-auto">
              Modira diseña flujos personalizados que conectan tus herramientas
              existentes y automatizan tus procesos sin cambiar tu infraestructura.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              {
                icon: Zap,
                title: "Gana tiempo",
                description:
                  "Automatiza tareas repetitivas y libera a tu equipo para trabajo de mayor valor.",
              },
              {
                icon: BarChart3,
                title: "Mejora la productividad",
                description:
                  "Reduce errores, acelera procesos y centraliza la información en tiempo real.",
              },
              {
                icon: Cog,
                title: "Escala sin costos",
                description:
                  "Crece sin aumentar plantilla. Tus sistemas trabajan 24/7 por ti.",
              },
            ].map((item, idx) => (
              <Card
                key={idx}
                className="scroll-reveal-item p-8 border border-[#E8ECF2] bg-white hover:border-[#173B8F] hover:shadow-lg transition-all duration-300"
              >
                <item.icon className="h-12 w-12 text-[#173B8F] mb-4" />
                <h3 className="text-xl font-bold text-[#102A66] mb-3">
                  {item.title}
                </h3>
                <p className="text-[#52627A]">{item.description}</p>
              </Card>
            ))}
          </div>

          {/* Integration Ecosystem */}
</div>
</section>

      {/* ROI Calculator Section */}
      <section className="pt-4 md:pt-8 pb-16 md:pb-24 bg-[#F4F6F9]">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
          <div className="text-center mb-12">
            <h2 className="scroll-reveal-item text-3xl md:text-4xl font-bold text-[#102A66] mb-4">
              ¿Cuánto podrías ahorrar?
            </h2>
            <p className="scroll-reveal-item text-lg text-[#52627A]">
              Calculadora orientativa de ahorro potencial
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="scroll-reveal-item p-8 md:p-12 border border-[#E8ECF2]">
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                {/* Employees */}
                <div>
                  <label className="block text-sm font-semibold text-[#182230] mb-3">
                    Número de empleados
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={savingsData.employees}
                    onChange={(e) =>
                      handleSavingsChange("employees", parseInt(e.target.value))
                    }
                    className="w-full h-2 bg-[#E8ECF2] rounded-lg appearance-none cursor-pointer accent-[#173B8F]"
                  />
                  <p className="text-2xl font-bold text-[#173B8F] mt-2">
                    {savingsData.employees}
                  </p>
                </div>

                {/* Hours per week */}
                <div>
                  <label className="block text-sm font-semibold text-[#182230] mb-3">
                    Horas/semana en tareas repetitivas
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    value={savingsData.hoursPerWeek}
                    onChange={(e) =>
                      handleSavingsChange("hoursPerWeek", parseInt(e.target.value))
                    }
                    className="w-full h-2 bg-[#E8ECF2] rounded-lg appearance-none cursor-pointer accent-[#173B8F]"
                  />
                  <p className="text-2xl font-bold text-[#173B8F] mt-2">
                    {savingsData.hoursPerWeek}h
                  </p>
                </div>

                {/* Hourly rate */}
                <div>
                  <label className="block text-sm font-semibold text-[#182230] mb-3">
                    Coste/hora (€)
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={savingsData.hourlyRate}
                    onChange={(e) =>
                      handleSavingsChange("hourlyRate", parseInt(e.target.value))
                    }
                    className="w-full h-2 bg-[#E8ECF2] rounded-lg appearance-none cursor-pointer accent-[#173B8F]"
                  />
                  <p className="text-2xl font-bold text-[#173B8F] mt-2">
                    €{savingsData.hourlyRate}
                  </p>
                </div>
              </div>

              <div className="border-t border-[#E8ECF2] pt-8">
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-[#52627A] mb-2">Ahorro semanal</p>
                    <p className="text-3xl font-bold text-[#173B8F]">
                      {weeklySavings}h
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-[#52627A] mb-2">Ahorro mensual</p>
                    <p className="text-3xl font-bold text-[#173B8F]">
                      {monthlySavings}h
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-[#52627A] mb-2">Ahorro anual</p>
                    <p className="text-3xl font-bold text-[#173B8F]">
                      {yearlySavings}h
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-[#52627A] mb-2">Valor mensual</p>
                    <p className="text-3xl font-bold text-green-600">
                      €{monthlyCost.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#52627A] text-center mt-6">
                Esta es una estimación orientativa. Los resultados reales pueden variar según tu negocio específico.
              </p>
            </Card>
          </div>
        </div>
      </section>


      {/* Cómo trabajamos Section */}
      <div className="-mt-12 md:-mt-16">
  <HowWeWork />
</div>


      <IntegrationFlow />


      {/* Before/After Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
          <div className="text-center mb-12">
            <h2 className="scroll-reveal-item text-3xl md:text-4xl font-bold text-[#102A66] mb-4">
              De procesos manuales a sistemas que trabajan por ti
            </h2>
            <p className="scroll-reveal-item text-lg text-[#52627A] max-w-2xl mx-auto">
              Visualiza la transformación que Modira proporciona a tu empresa
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Before */}
            <Card className="scroll-reveal-item p-8 border-2 border-red-200 bg-red-50">
              <h3 className="text-2xl font-bold text-red-700 mb-6 flex items-center gap-2">
                <AlertCircle className="h-6 w-6" />
                Antes
              </h3>
              <ul className="space-y-3">
                {[
                  "Introducir datos manualmente",
                  "Copiar información entre herramientas",
                  "Enviar emails manualmente",
                  "Revisar tareas repetitivas",
                  "Errores humanos frecuentes",
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <span className="text-red-600 font-bold">✕</span>
                    <span className="text-red-900">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* After */}
            <Card className="scroll-reveal-item p-8 border-2 border-green-200 bg-green-50">
              <h3 className="text-2xl font-bold text-green-700 mb-6 flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6" />
                Después
              </h3>
              <ul className="space-y-3">
                {[
                  "Datos sincronizados automáticamente",
                  "Herramientas conectadas",
                  "Respuestas automáticas",
                  "Flujos funcionando 24/7",
                  "Menos errores",
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-green-900">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>


      {/* Casos de Éxito Section */}
      {/* <section id="casos-exito" className="py-16 md:py-24 bg-white"> */}
        <section
  id="casos-exito"
  className="relative py-16 md:py-24 bg-[#F4F6F9] before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-white before:to-[#F4F6F9]"
>
        {/* <div className="container mx-auto px-6 sm:px-8 lg:px-12 xl:px-16"> */}
          <div className="relative z-10 container mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
        <h2 className="scroll-reveal-item text-3xl md:text-4xl font-bold text-[#102A66] mb-4 text-center">
              Ejemplos de transformación
          </h2>
          <p className="scroll-reveal-item text-lg text-[#52627A] max-w-2xl mx-auto text-center mb-12">
            Casos de uso reales que muestran el potencial de la automatización
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Automatización comercial",
                role: "Ejemplo: Empresa de servicios",
                quote:
                  "Captación → CRM → seguimiento → email. Un flujo completo que convierte leads en clientes sin intervención manual.",
                metrics: "25h/semana ahorradas",
              },
              {
                name: "Automatización administrativa",
                role: "Ejemplo: Consultoría",
                quote:
                  "Formulario → datos → documento → notificación. Los procesos administrativos se resuelven automáticamente.",
                metrics: "95% menos errores",
              },
              {
                name: "Atención al cliente",
                role: "Ejemplo: E-commerce",
                quote:
                  "Cliente → WhatsApp → IA → respuesta. Respuestas automáticas inteligentes 24/7.",
                metrics: "0 contrataciones",
              },
            ].map((example, idx) => (
              <Card key={idx} className="scroll-reveal-item p-8 border-[#E8ECF2] hover:shadow-lg transition-all">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-[#182230] mb-6 italic">\"{example.quote}\"</p>
                <div className="border-t border-[#E8ECF2] pt-4">
                  <p className="font-bold text-[#102A66]">{example.name}</p>
                  <p className="text-sm text-[#52627A]">{example.role}</p>
                  <p className="text-sm font-semibold text-[#173B8F] mt-2">
                    {example.metrics}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>



      {/* Los planes de mantenimiento se muestran en /servicios. */}


 {/* Por qué elegir Modira Section */}
      {/* <section className="py-16 md:py-24 bg-white"> */}
      <section className="relative py-16 md:py-24 bg-white before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-[#F4F6F9] before:to-white">
        {/* <div className="container mx-auto px-6 sm:px-8 lg:px-12 xl:px-16"> */}
        <div className="relative z-10 container mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
          <h2 className="scroll-reveal-item text-3xl md:text-4xl font-bold text-[#102A66] mb-12 text-center">
            Por qué elegir Modira
          </h2>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {[
                {
                  title: "100% personalizadas",
                  description: "Cada solución se adapta a tu negocio específico, no usamos templates genéricos.",
                },
                {
                  title: "Soporte cercano",
                  description: "Equipo dedicado que entiende tu negocio y está disponible cuando lo necesitas.",
                },
                {
                  title: "Formación incluida",
                  description: "Tu equipo aprende a mantener y mejorar los sistemas sin depender de nosotros.",
                },
                {
                  title: "Orientados a resultados",
                  description: "No vendemos horas, vendemos resultados medibles y mejoras en tu negocio.",
                },
              ].map((item, idx) => (
                <div key={idx} className="scroll-reveal-item flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-[#173B8F]/10">
                      <CheckCircle2 className="h-6 w-6 text-[#173B8F]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#102A66] mb-2">
                      {item.title}
                    </h3>
                    <p className="text-[#52627A]">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="relative">
              <img
                src="/Images/team-collaboration_a30b2170.png"
                alt="Colaboración del equipo"
                className="scroll-reveal-item rounded-2xl shadow-lg w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>




      {/* FAQ Section */}
      {/* <section id="faq" className="py-16 md:py-24 bg-[#F4F6F9]"> */}
      <section
  id="faq"
  className="relative py-16 md:py-24 bg-[#F4F6F9] before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-white before:to-[#F4F6F9]"
>
        {/* <div className="container mx-auto px-6 sm:px-8 lg:px-12 xl:px-16"> */}
        <div className="relative z-10 container mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
          <h2 className="scroll-reveal-item text-3xl md:text-4xl font-bold text-[#102A66] mb-12 text-center">
            Preguntas frecuentes
          </h2>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {[
                {
                  q: "¿Necesito cambiar mis herramientas?",
                  a: "No. Modira se integra con las herramientas que ya usas. Conectamos Make, n8n, Google Workspace, Airtable y muchas más.",
                },
                {
                  q: "¿Funciona con mi tipo de empresa?",
                  a: "Sí. Trabajamos con pymes de todos los sectores: servicios, e-commerce, consultoría, manufactura, etc.",
                },
                {
                  q: "¿Cuánto tarda la implantación?",
                  a: "Depende de la complejidad. Un proceso simple toma 2-3 semanas. Sistemas avanzados pueden tomar 4-8 semanas.",
                },
                {
                  q: "¿Es seguro?",
                  a: "Sí. Usamos encriptación de extremo a extremo y cumplimos con RGPD. Tus datos están protegidos.",
                },
                {
                  q: "¿Qué pasa si falla una automatización?",
                  a: "Nuestro equipo monitorea tus sistemas 24/7. Cualquier problema se resuelve inmediatamente.",
                },
                {
                  q: "¿Necesito conocimientos técnicos?",
                  a: "No. Incluimos formación para tu equipo. Cualquiera puede mantener los sistemas.",
                },
                {
                  q: "¿Puedo modificar la automatización después?",
                  a: "Claro. Con nuestros planes de mantenimiento, hacemos ajustes y mejoras continuas.",
                },
                {
                  q: "¿Qué ahorro puedo esperar?",
                  a: "Típicamente, entre 10 y 30 horas semanales por proceso automatizado, más reducción de errores.",
                },
              ].map((item, idx) => (
                <AccordionItem
                  key={idx}
                  value={`item-${idx}`}
                  className="scroll-reveal-item border border-[#E8ECF2] rounded-lg px-6 py-4 bg-white"
                >
                  <AccordionTrigger className="text-lg font-semibold text-[#102A66] hover:text-[#173B8F]">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[#52627A] pt-4">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>


      {/* Auditoría CTA Section */}
      <section id="auditoria" className="py-16 md:py-24 bg-gradient-to-br from-[#102A66] to-[#173B8F]">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
          <div className="max-w-2xl mx-auto">
            <h2 className="scroll-reveal-item text-4xl md:text-5xl font-bold text-white mb-6 text-center">
              Auditoría gratuita de automatización
            </h2>
            <p className="scroll-reveal-item text-lg text-white/90 mb-12 text-center">
              Completa este formulario y nuestro equipo analizará tu empresa para
              detectar oportunidades de automatización. Sin compromiso.
            </p>

            <form onSubmit={handleFormSubmit} className="scroll-reveal-item space-y-6 bg-white p-8 rounded-2xl shadow-xl">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#182230] mb-2">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 border border-[#E8ECF2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#173B8F] bg-white"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#182230] mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 border border-[#E8ECF2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#173B8F] bg-white"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#182230] mb-2">
                    Empresa
                  </label>
                  <input
                    type="text"
                    name="empresa"
                    value={formData.empresa}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 border border-[#E8ECF2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#173B8F] bg-white"
                    placeholder="Nombre de tu empresa"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#182230] mb-2">
                    Número de empleados
                  </label>
                  <select
                    name="empleados"
                    value={formData.empleados}
                    onChange={handleFormChange as any}
                    required
                    className="w-full px-4 py-3 border border-[#E8ECF2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#173B8F] bg-white"
                  >
                    <option value="">Selecciona un rango</option>
                    <option value="1-10">1-10</option>
                    <option value="10-25">10-25</option>
                    <option value="25-50">25-50</option>
                    <option value="50-100">50-100</option>
                    <option value="100+">100+</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#182230] mb-2">
                  ¿Qué proceso te gustaría automatizar?
                </label>
                <textarea
                  name="proceso"
                  value={formData.proceso}
                  onChange={handleFormChange}
                  required
                  rows={4}
                  className="w-full px-4 py-3 border border-[#E8ECF2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#173B8F] bg-white"
                  placeholder="Describe brevemente los procesos que consumen más tiempo en tu empresa..."
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#173B8F] hover:bg-[#102A66] text-white text-lg py-6 font-semibold"
              >
                Solicitar auditoría gratuita
              </Button>

              <p className="text-sm text-[#52627A] text-center">
                Nos pondremos en contacto en 24 horas. Sin spam, sin compromiso.
              </p>
            </form>
          </div>
        </div>
      </section>

      


    {/* Footer */}
<footer className="bg-[#102A66] text-white py-12">
  <div className="container-lg mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
    <div className="grid md:grid-cols-4 gap-8 mb-8">

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-white/10 p-1.5 rounded-lg">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold">Modira</span>
        </div>

        <p className="text-white/70 text-sm mb-5">
          Automatización inteligente para empresas.
        </p>

        {/* Redes sociales */}
        <div className="flex items-center gap-3">
          {/* Instagram */}
          <a
            href="https://www.instagram.com/modira.es/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram de Modira"
            className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition"
          >
            <Instagram className="h-5 w-5" />
          </a>

          {/* LinkedIn */}
          <a
            href="https://www.linkedin.com/company/modira/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn de Modira"
            className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition"
          >
            <Linkedin className="h-5 w-5" />
          </a>

          {/* WhatsApp */}
          <button
            type="button"
            aria-label="WhatsApp de Modira"
            className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div>
        <h4 className="font-bold mb-4">Producto</h4>
        <ul className="space-y-2 text-white/70 text-sm">
          <li>
            <a
              href="/servicios"
              className="hover:text-white transition"
            >
              Servicios
            </a>
          </li>

          <li>
            <a
              href="#faq"
              className="hover:text-white transition"
            >
              FAQ
            </a>
          </li>
        </ul>
      </div>

      <div>
        <h4 className="font-bold mb-4">Empresa</h4>
        <ul className="space-y-2 text-white/70 text-sm">
          <li>
            <a
              href="/area-cliente"
              className="hover:text-white transition"
            >
              Área de Clientes
            </a>
          </li>

          <li>
            <a
              href="/empleados/login"
              className="hover:text-white transition"
            >
              Área de Empleados
            </a>
          </li>

          <li>
            <a
              href="mailto:info@modira.es?subject=Consulta%20sobre%20Modira"
              className="hover:text-white transition"
            >
              Contacto
            </a>
          </li>
        </ul>
      </div>

      <div>
        <h4 className="font-bold mb-4">Legal</h4>
        <ul className="space-y-2 text-white/70 text-sm">
          <li>
            <a
              href="/politica-privacidad"
              className="hover:text-white transition"
            >
              Política de Privacidad
            </a>
          </li>

          <li>
            <a
              href="/terminos"
              className="hover:text-white transition"
            >
              Términos y Condiciones
            </a>
          </li>

          <li>
            <a
              href="/politica-cookies"
              className="hover:text-white transition"
            >
              Política de Cookies
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div className="border-t border-white/10 pt-8">
      <div className="grid md:grid-cols-2 gap-8 mb-4">
        <div className="text-white/70 text-xs">
          <p>
            <strong>Modira</strong>
          </p>
          <p>Servicios de automatización empresarial</p>
          <p className="mt-2">
            Email: info@modira.es
          </p>
        </div>

        <div className="text-white/70 text-xs text-right md:text-left">
          <p>
            © {new Date().getFullYear()} Modira. Todos los derechos reservados.
          </p>

          <p className="mt-2">
            Cumplimos con RGPD, LOPDGDD y LSSI-CE
          </p>
        </div>
      </div>
    </div>
  </div>
</footer>
{/* Chatbot flotante */}
<AIChatBot />
    </div>
  );
}