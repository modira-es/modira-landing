import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Settings,
  Workflow,
  Globe,
  Database,
  MessageSquare,
  Users,
  Building2,
  Headphones,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Zap,
  Layers3,
  GitBranch,
  CircleDollarSign,
  Menu,
  X,
  Sparkles,
  Wrench,
  Gauge,
  BriefcaseBusiness,
  Monitor,
  Bot,
  FileText,
  Mail,
  Brain
} from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

export default function ServicesPage() {
  const [, setLocation] = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /*
   * ============================================================
   * SERVICIOS DE IMPLEMENTACIÓN
   *
   * IMPORTANTE:
   * Estos servicios NO son paquetes cerrados.
   * Los precios mostrados son precios base.
   * ============================================================
   */

  const implementationServices = [
    {
      number: "01",
      title: "Automatización de procesos",
      subtitle: "Desde 490 €",
      icon: Workflow,
      description:
        "Convertimos procesos manuales y repetitivos en flujos automáticos que trabajan por ti. Analizamos el proceso, diseñamos el flujo, conectamos las herramientas necesarias, lo implementamos, lo probamos y entregamos la solución funcionando.",
      points: [
        "Análisis del proceso actual.",
        "Diseño del flujo de automatización.",
        "Integración de las herramientas necesarias.",
        "Configuración e implementación.",
        "Pruebas y puesta en marcha.",
        "Documentación y formación inicial.",
      ],
      includes: [
        {
          icon: ClipboardCheck,
          title: "Análisis del proceso",
          text: "Identificamos tareas manuales, repetitivas, errores, cuellos de botella y puntos donde la automatización puede aportar valor.",
        },
        {
          icon: GitBranch,
          title: "Diseño del flujo",
          text: "Definimos los pasos, condiciones, acciones y conexiones necesarias para transformar el proceso manual en un flujo automatizado.",
        },
        {
          icon: Settings,
          title: "Integración e implementación",
          text: "Configuramos las herramientas, automatizaciones, condiciones, acciones y notificaciones necesarias para que el sistema funcione.",
        },
        {
          icon: CheckCircle2,
          title: "Pruebas y entrega",
          text: "Comprobamos el funcionamiento completo, corregimos posibles errores y entregamos la solución funcionando junto con una explicación inicial.",
        },
      ],
      examples: [
        "Formulario → datos → CRM → email → notificación",
        "Nuevo cliente → registro → documentación → aviso al equipo",
        "Pedido → actualización → factura → email",
        "Email → extracción de información → registro → notificación",
      ],
      price: "Desde 490 €",
      priceDescription:
        "Precio base. El coste final depende de la complejidad y alcance de la automatización.",
      factors: [
        "Número de procesos",
        "Complejidad",
        "Número de herramientas",
        "Integraciones",
        "APIs y webhooks",
        "IA",
        "Volumen de datos",
        "Número de escenarios",
      ],
    },

    {
      number: "02",
      title: "Sistemas de automatización avanzados",
      subtitle: "Desde 1.390 €",
      icon: Layers3,
      description:
        "Diseñamos sistemas de automatización que conectan diferentes herramientas, procesos y áreas de una empresa. Es una solución pensada para proyectos donde ya no se trata de automatizar una única tarea, sino de construir un ecosistema conectado.",
      points: [
        "Análisis profundo de procesos y herramientas.",
        "Diseño de la arquitectura de automatización.",
        "Integraciones múltiples.",
        "IA aplicada a procesos.",
        "Automatizaciones multietapa.",
        "Documentación y formación.",
      ],
      includes: [
        {
          icon: ClipboardCheck,
          title: "Auditoría y análisis",
          text: "Partimos de la auditoría gratuita y, cuando el proyecto lo requiere, analizamos procesos, herramientas, dependencias y flujos de información con mayor profundidad.",
        },
        {
          icon: Layers3,
          title: "Diseño de arquitectura",
          text: "No diseñamos solamente un flujo. Diseñamos la arquitectura que permite conectar diferentes procesos, herramientas y áreas de la empresa.",
        },
        {
          icon: GitBranch,
          title: "Integraciones múltiples",
          text: "Conectamos CRM, bases de datos, herramientas de trabajo, sistemas internos, APIs, webhooks y otras plataformas compatibles.",
        },
        {
          icon: Bot,
          title: "IA aplicada a procesos",
          text: "Cuando aporta valor, incorporamos IA para clasificar información, extraer datos, procesar documentos, generar respuestas o asistir en determinadas decisiones.",
        },
        {
          icon: RefreshCw,
          title: "Automatizaciones avanzadas",
          text: "Construimos flujos multietapa con condiciones, ramificaciones, validaciones, reintentos, gestión de errores y sincronización de datos.",
        },
        {
          icon: FileText,
          title: "Documentación y formación",
          text: "Documentamos la solución, explicamos su arquitectura y proporcionamos una formación inicial para facilitar su uso.",
        },
      ],
      examples: [
        "Lead → CRM → IA → clasificación → seguimiento → email → comercial",
        "WhatsApp → IA → clasificación → respuesta → CRM → seguimiento",
        "Documento → IA → extracción → validación → base de datos → notificación",
      ],
      price: "Desde 1.390 €",
      priceDescription:
        "Precio base. El presupuesto final depende del alcance, número de sistemas, integraciones y complejidad del proyecto.",
      factors: [
        "Número de sistemas",
        "Complejidad de las integraciones",
        "APIs",
        "IA",
        "Bases de datos",
        "Número de procesos",
        "Automatizaciones interdependientes",
        "Volumen de información",
      ],
    },

    {
      number: "03",
      title: "Presencia digital automatizada",
      subtitle: "Desde 1.640 €",
      icon: Globe,
      description:
        "Creamos una presencia digital profesional que además trabaja para tu empresa. No se trata simplemente de crear una página web, sino de construir una experiencia digital conectada con la captación, organización y seguimiento de tus clientes.",
      points: [
        "Diseño web profesional y responsive.",
        "Estructura orientada a conversión.",
        "Captación de clientes.",
        "Automatización de leads.",
        "Integración con herramientas.",
        "Automatizaciones iniciales.",
      ],
      includes: [
        {
          icon: Globe,
          title: "Diseño web profesional",
          text: "Diseñamos una presencia digital personalizada, responsive y orientada a la conversión, adaptada a las necesidades del negocio.",
        },
        {
          icon: Users,
          title: "Captación de clientes",
          text: "Creamos formularios y sistemas de captación que permiten recoger la información de los potenciales clientes de forma estructurada.",
        },
        {
          icon: Zap,
          title: "Automatización de leads",
          text: "Conectamos la web con los procesos posteriores para que un lead no se quede simplemente en un formulario enviado.",
        },
        {
          icon: Database,
          title: "Integración con herramientas",
          text: "Podemos conectar la web con CRM, Google Workspace, Airtable, email, WhatsApp Business, APIs y otras herramientas.",
        },
        {
          icon: Mail,
          title: "Automatizaciones iniciales",
          text: "Configuramos confirmaciones, altas de leads, notificaciones internas, organización de contactos y emails automáticos.",
        },
      ],
      examples: [
        "Visitante → formulario → lead → CRM → clasificación → email → aviso comercial",
        "Formulario → registro → notificación → seguimiento",
        "Nuevo lead → CRM → email automático → equipo comercial",
      ],
      price: "Desde 1.640 €",
      priceDescription:
        "Precio base. El precio final depende del alcance de la web, funcionalidades, integraciones y automatizaciones necesarias.",
      factors: [
        "Número de páginas",
        "Complejidad del diseño",
        "Formularios",
        "Integraciones",
        "CRM",
        "Automatizaciones",
        "IA",
        "Funcionalidades especiales",
      ],
    },
  ];

  /*
   * ============================================================
   * PLANES DE MANTENIMIENTO
   *
   * Estos sí son planes cerrados.
   * ============================================================
   */

  const maintenancePlans = [
    {
      number: "01",
      title: "Essential",
      price: "149 €/mes",
      subtitle: "Hasta 3 automatizaciones",
      icon: Wrench,
      description:
        "Para empresas que tienen pocas automatizaciones y quieren mantenerlas funcionando correctamente sin preocuparse de la parte técnica.",
      popular: false,
      features: [
        "Supervisión de automatizaciones",
        "Comprobación del funcionamiento",
        "Detección de errores",
        "Soporte básico",
        "Resolución de incidencias",
        "Revisión mensual",
        "Correcciones",
        "Pequeños ajustes",
        "Actualizaciones necesarias",
      ],
    },
    {
      number: "02",
      title: "Growth",
      price: "299 €/mes",
      subtitle: "Hasta 10 automatizaciones",
      icon: Gauge,
      description:
        "Para empresas en crecimiento que dependen cada vez más de sus automatizaciones y necesitan optimizarlas continuamente.",
      popular: true,
      features: [
        "Todo lo incluido en Essential",
        "Optimización de flujos",
        "Ajustes de lógica",
        "Mejoras de rendimiento",
        "Adaptación a cambios del proceso",
        "Revisión quincenal",
        "Soporte prioritario",
        "Pequeñas ampliaciones",
      ],
    },
    {
      number: "03",
      title: "Business",
      price: "499 €/mes",
      subtitle: "Automatizaciones ilimitadas",
      icon: BriefcaseBusiness,
      description:
        "Para empresas que dependen de la automatización en procesos importantes y necesitan un nivel superior de supervisión, soporte y optimización.",
      popular: false,
      features: [
        "Todo lo incluido en Growth",
        "Automatizaciones críticas",
        "Optimización continua",
        "Soporte avanzado",
        "Supervisión avanzada",
        "Mayor seguimiento del ecosistema",
      ],
    },
  ];

  const automationAreas = [
    {
      icon: Users,
      title: "Comercial",
      items: [
        "Captación de leads",
        "CRM",
        "Seguimiento",
        "Emails",
        "Presupuestos",
        "Notificaciones",
      ],
    },
    {
      icon: FileText,
      title: "Administración",
      items: [
        "Formularios",
        "Documentos",
        "Facturación",
        "Gestión de datos",
        "Organización de información",
        "Notificaciones internas",
      ],
    },
    {
      icon: Headphones,
      title: "Atención al cliente",
      items: [
        "WhatsApp",
        "Emails",
        "IA",
        "Clasificación",
        "Respuestas automáticas",
        "Seguimiento",
      ],
    },
    {
      icon: Settings,
      title: "Operaciones",
      items: [
        "Sincronización de herramientas",
        "Bases de datos",
        "Procesos internos",
        "Informes",
        "Alertas",
        "Flujos entre departamentos",
      ],
    },
  ];

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(
      "main h1, main h2, main h3, main h4, main p, main img, main button, main li, main .rounded-2xl, main .rounded-3xl"
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

    elements.forEach((element) => {
      element.classList.add("scroll-reveal-item");
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const goToAudit = () => {
    setLocation("/");

    setTimeout(() => {
      document.getElementById("auditoria")?.scrollIntoView({
        behavior: "smooth",
      });
    }, 100);
  };

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
      {/* ========================================================
          HEADER
          ======================================================== */}
      <header
        className={`fixed top-0 left-0 z-50 h-[80px] w-full transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-[#102A66]/10"
            : "bg-gradient-to-r from-[#102A66] to-[#173B8F] shadow-lg"
        }`}
      >
        <nav className="container mx-auto h-[80px] pl-10 pr-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 h-full">
            <img
              src={
                isScrolled
                  ? import.meta.env.VITE_APP_LOGO_DARK
                  : import.meta.env.VITE_APP_LOGO
              }
              alt="Modira"
              className="h-8 w-auto object-contain transition-all duration-300"
            />

            <span
              className={`modira-font text-xl leading-none flex items-center translate-y-[2px] transition-colors duration-300 ${
                isScrolled ? "text-[#102A66]" : "text-white"
              }`}
            >
              MODIRA
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => {
                  document
                    .getElementById("implementacion")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    });
                }}
                className={`text-[14px] font-medium transition-colors duration-300 ${
                  isScrolled
                    ? "text-[#102A66]/80 hover:text-[#102A66]"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Servicios
              </button>

              <button
                type="button"
                onClick={() => {
                  document
                    .getElementById("mantenimiento")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    });
                }}
                className={`text-[14px] font-medium transition-colors duration-300 ${
                  isScrolled
                    ? "text-[#102A66]/80 hover:text-[#102A66]"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Mantenimiento
              </button>
            </nav>

            <button
              type="button"
              onClick={() => setLocation("/")}
              className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-md transition-all duration-300 ${
                isScrolled
                  ? "bg-[#102A66] text-white hover:bg-[#173B8F]"
                  : "bg-white text-[#102A66] hover:bg-white/90"
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              Área principal
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className={`md:hidden transition-colors duration-300 ${
              isScrolled ? "text-[#102A66]" : "text-white"
            }`}
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Abrir menú"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {/* Mobile Navigation */}
        {isOpen && (
          <div
            className={`md:hidden absolute top-[80px] left-0 w-full border-b px-4 py-4 space-y-3 shadow-lg transition-colors duration-300 ${
              isScrolled
                ? "bg-white border-[#102A66]/10"
                : "bg-[#102A66] border-white/20"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                document
                  .getElementById("implementacion")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });
                setIsOpen(false);
              }}
              className={`block w-full text-left py-2 text-[15px] font-medium transition-colors ${
                isScrolled
                  ? "text-[#102A66]/80 hover:text-[#102A66]"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Servicios
            </button>

            <button
              type="button"
              onClick={() => {
                document
                  .getElementById("mantenimiento")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });
                setIsOpen(false);
              }}
              className={`block w-full text-left py-2 text-[15px] font-medium transition-colors ${
                isScrolled
                  ? "text-[#102A66]/80 hover:text-[#102A66]"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Mantenimiento
            </button>

            <button
              type="button"
              onClick={() => {
                setLocation("/");
                setIsOpen(false);
              }}
              className={`w-full text-[15px] font-semibold mt-2 rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 transition-all duration-300 ${
                isScrolled
                  ? "bg-[#102A66] text-white hover:bg-[#173B8F]"
                  : "bg-white text-[#102A66] hover:bg-white/90"
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              Área principal
            </button>
          </div>
        )}
      </header>

    
 {/* ========================================================
    TÍTULO
    ======================================================== */}
<section className="bg-[#102A66] pt-[70px] overflow-hidden">

  <div className="container mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 xl:px-16 py-8 md:py-10">

    <div className="flex items-center justify-between gap-10">

      {/* ==================================================
          TEXTO
          ================================================== */}
      <div className="min-w-0">

        <h1 className="text-[40px] md:text-[44px] lg:text-[47px] font-bold text-white leading-[1.25] tracking-[0em]">
          Servicios de Modira
        </h1>

        <p className="mt-7 text-[17px] md:text-[18px] text-white/85 leading-[1.5] max-w-[620px]">
          Soluciones diseñadas para automatizar, conectar y mejorar la forma
          en la que trabaja tu empresa.
        </p>

      </div>


      {/* ==================================================
          VISUAL DE FLUJO
          ================================================== */}
      <div className="hidden md:flex relative w-[260px] h-[190px] shrink-0 items-center justify-center mr-12 lg:mr-18">

        {/* ==================================================
            ANILLOS DECORATIVOS
            ================================================== */}

        <div className="absolute w-[118px] h-[118px] rounded-full border border-white/[0.12]" />

        <div className="absolute w-[155px] h-[155px] rounded-full border border-white/[0.08]" />

        {/* Anillo giratorio */}
        <div className="absolute w-[155px] h-[155px] rounded-full border border-dashed border-white/[0.14] animate-[rotateFlow_18s_linear_infinite]" />


        {/* ==================================================
            CONEXIONES + PARTÍCULAS
            ================================================== */}

        <svg
          className="absolute inset-0 w-full h-full overflow-visible"
          viewBox="0 0 260 190"
          fill="none"
        >

          {/* Conexión superior */}
          <path
            d="M130 95 C130 70 130 50 130 24"
            stroke="rgba(255,255,255,0.32)"
strokeWidth="1.4"
          />

          {/* Conexión derecha superior */}
          <path
            d="M145 87 C170 70 195 55 224 52"
            stroke="rgba(255,255,255,0.32)"
strokeWidth="1.4"
          />

          {/* Conexión derecha inferior */}
          <path
            d="M145 103 C170 120 195 135 224 138"
            stroke="rgba(255,255,255,0.32)"
strokeWidth="1.4"
          />

          {/* Conexión izquierda superior */}
          <path
            d="M115 87 C90 70 65 55 36 52"
            stroke="rgba(255,255,255,0.32)"
strokeWidth="1.4"
          />

          {/* Conexión izquierda inferior */}
          <path
            d="M115 103 C90 120 65 135 36 138"
            stroke="rgba(255,255,255,0.32)"
strokeWidth="1.4"
          />

          {/* Conexión inferior */}
          <path
            d="M130 110 C130 135 130 150 130 166"
            stroke="rgba(255,255,255,0.32)"
strokeWidth="1.4"
          />


          {/* ==================================================
              PARTÍCULAS EN MOVIMIENTO
              ================================================== */}

          {/* Superior */}
          <circle r="2" fill="rgba(255,255,255,0.95)">
            <animateMotion
              dur="2.8s"
              repeatCount="indefinite"
              path="M130 95 C130 70 130 50 130 24"
            />
          </circle>

          {/* Derecha superior */}
          <circle r="1.7" fill="rgba(255,255,255,0.78)">
            <animateMotion
              dur="3.4s"
              begin="0.8s"
              repeatCount="indefinite"
              path="M145 87 C170 70 195 55 224 52"
            />
          </circle>

          {/* Derecha inferior */}
          <circle r="1.7" fill="rgba(255,255,255,0.78)">
            <animateMotion
              dur="3.1s"
              begin="1.2s"
              repeatCount="indefinite"
              path="M145 103 C170 120 195 135 224 138"
            />
          </circle>

          {/* Izquierda superior */}
          <circle r="1.7" fill="rgba(255,255,255,0.70)">
            <animateMotion
              dur="3.5s"
              begin="0.4s"
              repeatCount="indefinite"
              path="M115 87 C90 70 65 55 36 52"
            />
          </circle>

          {/* Izquierda inferior */}
          <circle r="1.7" fill="rgba(255,255,255,0.70)">
            <animateMotion
              dur="3.2s"
              begin="1.5s"
              repeatCount="indefinite"
              path="M115 103 C90 120 65 135 36 138"
            />
          </circle>

          {/* Inferior */}
          <circle r="1.7" fill="rgba(255,255,255,0.78)">
            <animateMotion
              dur="3.3s"
              begin="0.6s"
              repeatCount="indefinite"
              path="M130 110 C130 135 130 150 130 166"
            />
          </circle>

        </svg>


        {/* ==================================================
            NÚCLEO CENTRAL — MODIRA
            ================================================== */}

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">

          {/* Halo */}
          <div className="absolute w-[82px] h-[82px] rounded-full border border-white/[0.12] animate-[corePulse_3s_ease-in-out_infinite]" />

          {/* Núcleo */}
          <div className="relative w-[58px] h-[58px] rounded-full border border-white/25 bg-[#21489A]/75 backdrop-blur-md flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.10)]">

            <div className="text-[10px] font-semibold tracking-[0.12em] text-white">
              MODIRA
            </div>

          </div>

        </div>


        {/* ==================================================
            NODO 1 — SISTEMAS
            ================================================== */}

        <div className="absolute top-[8px] left-1/2 -translate-x-1/2">

          <div className="w-[34px] h-[34px] rounded-full border border-white/20 bg-white/[0.09] backdrop-blur-sm flex items-center justify-center">

            <Monitor
              className="w-[16px] h-[16px] text-white/85"
              strokeWidth={1.5}
            />

          </div>

        </div>


        {/* ==================================================
            NODO 2 — IA
            ================================================== */}

        <div className="absolute right-[7px] top-[35px]">

          <div className="w-[34px] h-[34px] rounded-full border border-white/20 bg-white/[0.09] backdrop-blur-sm flex items-center justify-center">

            <Bot
              className="w-[17px] h-[17px] text-white/85"
              strokeWidth={1.5}
            />

          </div>

        </div>


        {/* ==================================================
            NODO 3 — DOCUMENTOS
            ================================================== */}

        <div className="absolute right-[7px] bottom-[35px]">

          <div className="w-[34px] h-[34px] rounded-full border border-white/20 bg-white/[0.09] backdrop-blur-sm flex items-center justify-center">

            <FileText
              className="w-[16px] h-[16px] text-white/85"
              strokeWidth={1.5}
            />

          </div>

        </div>


        {/* ==================================================
            NODO 4 — COMUNICACIÓN
            ================================================== */}

        <div className="absolute left-[7px] top-[35px]">

          <div className="w-[34px] h-[34px] rounded-full border border-white/20 bg-white/[0.09] backdrop-blur-sm flex items-center justify-center">

            <Mail
              className="w-[16px] h-[16px] text-white/85"
              strokeWidth={1.5}
            />

          </div>

        </div>


        {/* ==================================================
            NODO 5 — INTELIGENCIA
            ================================================== */}

        <div className="absolute left-[7px] bottom-[35px]">

          <div className="w-[34px] h-[34px] rounded-full border border-white/20 bg-white/[0.09] backdrop-blur-sm flex items-center justify-center">

            <Brain
              className="w-[16px] h-[16px] text-white/85"
              strokeWidth={1.5}
            />

          </div>

        </div>


        {/* ==================================================
            NODO 6 — FLUJOS / AUTOMATIZACIÓN
            ================================================== */}

        <div className="absolute bottom-[4px] left-1/2 -translate-x-1/2">

          <div className="w-[34px] h-[34px] rounded-full border border-white/20 bg-white/[0.09] backdrop-blur-sm flex items-center justify-center">

            <Workflow
              className="w-[17px] h-[17px] text-white/85"
              strokeWidth={1.5}
            />

          </div>

        </div>

      </div>

    </div>

  </div>


  {/* ======================================================
      ANIMACIONES
      ====================================================== */}

  <style>{`

    @keyframes rotateFlow {

      from {
        transform: rotate(0deg);
      }

      to {
        transform: rotate(360deg);
      }

    }

    @keyframes corePulse {

      0%, 100% {
        transform: scale(1);
        opacity: 0.35;
      }

      50% {
        transform: scale(1.12);
        opacity: 0.7;
      }

    }

  `}</style>

</section>
<main>

        {/* ========================================================
            INTRO
            ======================================================== */}
        <section className="relative bg-white py-14 md:py-20 before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-[#F4F6F9] before:to-white">
          <div className="container mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                Una solución adaptada a tu empresa
              </p>

              <h2 className="mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                No todas las empresas necesitan lo mismo
              </h2>

              <p className="mt-5 text-base leading-relaxed text-[#52627A] md:text-lg">
                Cada empresa tiene procesos, herramientas y necesidades
                diferentes. Por eso en Modira no trabajamos con paquetes
                genéricos. Analizamos tu situación, identificamos dónde puede
                aportar valor la automatización y diseñamos una solución
                adaptada a tu caso.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: EyeIcon,
                  title: "Analizamos",
                  text: "Entendemos cómo funciona actualmente tu empresa y detectamos oportunidades de mejora.",
                },
                {
                  icon: Settings,
                  title: "Implementamos",
                  text: "Diseñamos y construimos la solución adaptada a los procesos y herramientas que utilizas.",
                },
                {
                  icon: TrendingUp,
                  title: "Mantenemos",
                  text: "Seguimos supervisando y mejorando tus automatizaciones después de su implantación.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[#E8ECF2] bg-[#F8FAFC] p-7"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F]">
                    <item.icon className="h-6 w-6" />
                  </div>

                  <h3 className="text-xl font-bold text-[#102A66]">
                    {item.title}
                  </h3>

                  <p className="mt-2 leading-relaxed text-[#52627A]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================
            AUDITORÍA GRATUITA
            ======================================================== */}
        <section className="relative bg-[#F4F6F9] py-16 md:py-20 before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-white before:to-[#F4F6F9]">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl rounded-3xl border border-[#D8E1EF] bg-white p-7 shadow-sm md:p-10">
              <div className="flex flex-col gap-7 md:flex-row md:items-start">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-[#173B8F] text-white shadow-md">
                  <ClipboardCheck className="h-8 w-8" />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#173B8F]">
                    El primer paso
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-[#102A66] md:text-3xl">
                    Auditoría inicial gratuita
                  </h2>

                  <p className="mt-4 leading-relaxed text-[#52627A]">
                    Antes de decidir qué necesitas, analizamos cómo funciona
                    actualmente tu empresa. La auditoría nos permite entender
                    tus procesos, detectar tareas repetitivas y encontrar
                    oportunidades donde la automatización puede aportar valor.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {[
                      "Comprendemos cómo trabaja actualmente tu empresa.",
                      "Detectamos tareas repetitivas y procesos manuales.",
                      "Analizamos las herramientas que utilizas.",
                      "Identificamos oportunidades de automatización.",
                      "Detectamos puntos de mejora.",
                      "Definimos qué tipo de solución puede tener más sentido.",
                    ].map((point) => (
                      <div
                        key={point}
                        className="flex items-start gap-3"
                      >
                        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#173B8F]" />

                        <span className="text-sm leading-relaxed text-[#52627A]">
                          {point}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-7 rounded-2xl border border-[#DCE4EF] bg-[#F8FAFC] p-5">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#173B8F]" />

                      <div>
                        <h3 className="font-bold text-[#102A66]">
                          Gratuita y sin compromiso
                        </h3>

                        <p className="mt-1 text-sm leading-relaxed text-[#52627A]">
                          La auditoría inicial es siempre gratuita. No forma
                          parte del precio de ninguno de los servicios y no te
                          obliga a contratar ninguna solución.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            SERVICIOS DE IMPLEMENTACIÓN
            ======================================================== */}
        <section
          id="implementacion"
          className="relative bg-white py-16 md:py-24 before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-[#F4F6F9] before:to-white"
        >
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                Servicios de implementación
              </p>

              <h2 className="mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                Creamos e implantamos la solución
              </h2>

              <p className="mt-4 text-[#52627A] md:text-lg">
                Nuestros servicios de implementación parten de un precio base.
                El proyecto se adapta a las necesidades reales de cada empresa
                y el presupuesto final se define según su alcance.
              </p>
            </div>

            <div className="mx-auto max-w-5xl space-y-8">
              {implementationServices.map((service) => (
                <div
                  key={service.number}
                  className="overflow-hidden rounded-3xl border border-[#E1E7EF] bg-white shadow-sm"
                >
                  {/* CABECERA */}
                  <div className="p-7 md:p-10">
                    <div className="flex flex-col gap-7 md:flex-row">
                      <div className="flex-shrink-0">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#173B8F] text-white shadow-md">
                          <service.icon className="h-8 w-8" />
                        </div>

                        <p className="mt-3 text-center text-sm font-bold text-[#173B8F]">
                          {service.number}
                        </p>
                      </div>

                      <div className="flex-1">
                        {/* TÍTULO + PRECIO */}
<div className="relative">
  <div className="min-w-0 pr-36 md:pr-44">
    <h3 className="text-2xl font-bold text-[#102A66] md:text-3xl">
      {service.title}
    </h3>
  </div>

  {/* ETIQUETA DE PRECIO */}
  <div className="absolute -right-4 -top-4">
    <div className="inline-flex items-center rounded-full border border-[#D8E1EF] bg-[#F8FAFC] px-5 py-3 shadow-sm">
      <span className="text-sm font-semibold uppercase tracking-[0.12em] text-[#173B8F]">
        Desde&nbsp;
      </span>

      <span className="text-sm font-bold text-[#102A66]">
        {service.price.replace("Desde ", "")}
      </span>
    </div>
  </div>
</div>

                        <p className="mt-4 leading-relaxed text-[#52627A]">
                          {service.description}
                        </p>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                          {service.points.map((point) => (
                            <div
                              key={point}
                              className="flex items-start gap-3"
                            >
                              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#173B8F]" />

                              <span className="text-sm leading-relaxed text-[#52627A]">
                                {point}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DETALLE */}
                  <div className="border-t border-[#E8ECF2] bg-[#F8FAFC] px-7 py-8 md:px-10">
                    <p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                      Qué puede incluir
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                      {service.includes.map((item) => (
                        <div
                          key={item.title}
                          className="relative rounded-2xl border border-[#E1E7EF] bg-white p-6"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F]">
                              <item.icon className="h-5 w-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="text-lg font-bold text-[#102A66]">
                                {item.title}
                              </h4>

                              <p className="mt-2 text-sm leading-relaxed text-[#52627A]">
                                {item.text}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* EJEMPLOS */}
                    <div className="mt-8">
                      <p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                        Ejemplos
                      </p>

                      <div className="grid gap-3 md:grid-cols-2">
                        {service.examples.map((example) => (
                          <div
                            key={example}
                            className="rounded-xl border border-[#DCE4EF] bg-white p-4"
                          >
                            <div className="flex items-center gap-3">
                              <Zap className="h-5 w-5 flex-shrink-0 text-[#173B8F]" />

                              <span className="text-sm font-medium leading-relaxed text-[#52627A]">
                                {example}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* PRECIO */}
                    <div className="mt-8 rounded-2xl border border-[#D8E1EF] bg-white p-6">
                      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                            Precio base
                          </p>

                          <p className="mt-1 text-2xl font-bold text-[#102A66]">
                            {service.price}
                          </p>

                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#52627A]">
                            {service.priceDescription}
                          </p>
                        </div>

                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F]">
                          <CircleDollarSign className="h-6 w-6" />
                        </div>
                      </div>

                      <div className="mt-6 border-t border-[#E8ECF2] pt-5">
                        <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                          Factores que pueden modificar el precio
                        </p>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {service.factors.map((factor) => (
                            <div
                              key={factor}
                              className="flex items-center gap-2"
                            >
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#173B8F]" />

                              <span className="text-sm text-[#52627A]">
                                {factor}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================
    COMPARATIVA DE SERVICIOS
    ======================================================== */}
<section className="relative bg-white py-16 md:py-24 before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-[#F4F6F9] before:to-white">
  <div className="container mx-auto px-4">
    <div className="mx-auto mb-12 max-w-3xl text-center">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
        Comparativa
      </p>

      <h2 className="mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
        Compara nuestros servicios
      </h2>

      <p className="mt-4 text-[#52627A] md:text-lg">
        Cada servicio está diseñado para cubrir diferentes necesidades de
        automatización, integración y presencia digital.
      </p>
    </div>

    <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-[#E1E7EF] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="bg-[#F4F6F9]">
              {/* CARACTERÍSTICA */}
              <th className="w-[25%] p-5 text-left text-sm font-bold text-[#102A66]">
                Característica
              </th>

              {/* AUTOMATIZACIÓN DE PROCESOS */}
              <th className="w-[25%] p-5 text-center text-sm font-bold text-[#102A66]">
                <div>
                  Automatización de procesos
                </div>
                <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#173B8F]" />
              </th>

              {/* SISTEMAS AVANZADOS */}
              <th className="relative w-[25%] bg-[#173B8F]/[0.04] p-5 text-center text-sm font-bold text-[#102A66]">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#102A66] to-[#173B8F]" />

                <div>
                  Sistemas de automatización avanzados
                </div>

                <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#173B8F]" />
              </th>

              {/* PRESENCIA DIGITAL */}
              <th className="w-[25%] p-5 text-center text-sm font-bold text-[#102A66]">
                <div>
                  Presencia digital automatizada
                </div>
                <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#173B8F]" />
              </th>
            </tr>
          </thead>

          <tbody>
            {/* TIPO DE SOLUCIÓN */}
            <tr className="border-t border-[#E8ECF2]">
              <td className="p-5 text-sm font-semibold text-[#102A66]">
                Tipo de solución
              </td>

              <td className="p-5 text-center text-sm text-[#52627A]">
                Proceso automatizado
              </td>

              <td className="bg-[#173B8F]/[0.03] p-5 text-center text-sm font-medium text-[#52627A]">
                Sistema conectado
              </td>

              <td className="p-5 text-center text-sm text-[#52627A]">
                Presencia digital + automatización
              </td>
            </tr>

            {/* ANÁLISIS DEL PROCESO */}
            <tr className="border-t border-[#E8ECF2]">
              <td className="p-5 text-sm font-semibold text-[#102A66]">
                Análisis del proceso
              </td>

              <td className="p-5 text-center text-lg font-bold text-[#173B8F]">
                ✓
              </td>

              <td className="bg-[#173B8F]/[0.03] p-5 text-center text-lg font-bold text-[#173B8F]">
                ✓
              </td>

              <td className="p-5 text-center text-lg font-bold text-[#173B8F]">
                ✓
              </td>
            </tr>

            {/* DISEÑO DE AUTOMATIZACIÓN */}
            <tr className="border-t border-[#E8ECF2]">
              <td className="p-5 text-sm font-semibold text-[#102A66]">
                Diseño de automatización
              </td>

              <td className="p-5 text-center text-lg font-bold text-[#173B8F]">
                ✓
              </td>

              <td className="bg-[#173B8F]/[0.03] p-5 text-center text-lg font-bold text-[#173B8F]">
                ✓
              </td>

              <td className="p-5 text-center text-lg font-bold text-[#173B8F]">
                ✓
              </td>
            </tr>

            {/* INTEGRACIONES */}
            <tr className="border-t border-[#E8ECF2]">
              <td className="p-5 text-sm font-semibold text-[#102A66]">
                Integraciones
              </td>

              <td className="p-5 text-center text-sm text-[#52627A]">
                Según proyecto
              </td>

              <td className="bg-[#173B8F]/[0.03] p-5 text-center text-sm text-[#52627A]">
                Múltiples
              </td>

              <td className="p-5 text-center text-sm text-[#52627A]">
                Según proyecto
              </td>
            </tr>

            {/* IA */}
            <tr className="border-t border-[#E8ECF2]">
              <td className="p-5 text-sm font-semibold text-[#102A66]">
                IA aplicada a procesos
              </td>

              <td className="p-5 text-center text-sm text-[#52627A]">
                Según proyecto
              </td>

              <td className="bg-[#173B8F]/[0.03] p-5 text-center text-lg font-bold text-[#173B8F]">
                ✓
              </td>

              <td className="p-5 text-center text-sm text-[#52627A]">
                Según proyecto
              </td>
            </tr>

            {/* MULTIETAPA */}
            <tr className="border-t border-[#E8ECF2]">
              <td className="p-5 text-sm font-semibold text-[#102A66]">
                Automatizaciones multietapa
              </td>

              <td className="p-5 text-center text-sm text-[#52627A]">
                Según proyecto
              </td>

              <td className="bg-[#173B8F]/[0.03] p-5 text-center text-lg font-bold text-[#173B8F]">
                ✓
              </td>

              <td className="p-5 text-center text-sm text-[#52627A]">
                Según proyecto
              </td>
            </tr>

            {/* CRM */}
            <tr className="border-t border-[#E8ECF2]">
              <td className="p-5 text-sm font-semibold text-[#102A66]">
                CRM y herramientas externas
              </td>

              <td className="p-5 text-center text-sm text-[#52627A]">
                Según proyecto
              </td>

              <td className="bg-[#173B8F]/[0.03] p-5 text-center text-lg font-bold text-[#173B8F]">
                ✓
              </td>

              <td className="p-5 text-center text-sm text-[#52627A]">
                Según proyecto
              </td>
            </tr>

            {/* CAPTACIÓN */}
            <tr className="border-t border-[#E8ECF2]">
              <td className="p-5 text-sm font-semibold text-[#102A66]">
                Captación de clientes
              </td>

              <td className="p-5 text-center text-sm text-[#52627A]">
                —
              </td>

              <td className="bg-[#173B8F]/[0.03] p-5 text-center text-sm text-[#52627A]">
                Según proyecto
              </td>

              <td className="p-5 text-center text-lg font-bold text-[#173B8F]">
                ✓
              </td>
            </tr>

            {/* DISEÑO WEB */}
            <tr className="border-t border-[#E8ECF2]">
              <td className="p-5 text-sm font-semibold text-[#102A66]">
                Diseño web
              </td>

              <td className="p-5 text-center text-sm text-[#52627A]">
                —
              </td>

              <td className="bg-[#173B8F]/[0.03] p-5 text-center text-sm text-[#52627A]">
                —
              </td>

              <td className="p-5 text-center text-lg font-bold text-[#173B8F]">
                ✓
              </td>
            </tr>

            {/* AUTOMATIZACIONES INICIALES */}
            <tr className="border-t border-[#E8ECF2]">
              <td className="p-5 text-sm font-semibold text-[#102A66]">
                Automatizaciones iniciales
              </td>

              <td className="p-5 text-center text-sm text-[#52627A]">
                Según proyecto
              </td>

              <td className="bg-[#173B8F]/[0.03] p-5 text-center text-lg font-bold text-[#173B8F]">
                ✓
              </td>

              <td className="p-5 text-center text-lg font-bold text-[#173B8F]">
                ✓
              </td>
            </tr>

            {/* DOCUMENTACIÓN */}
            <tr className="border-t border-[#E8ECF2]">
              <td className="p-5 text-sm font-semibold text-[#102A66]">
                Documentación y formación
              </td>

              <td className="p-5 text-center text-lg font-bold text-[#173B8F]">
                ✓
              </td>

              <td className="bg-[#173B8F]/[0.03] p-5 text-center text-lg font-bold text-[#173B8F]">
                ✓
              </td>

              <td className="p-5 text-center text-lg font-bold text-[#173B8F]">
                ✓
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</section>
        {/* ========================================================
            PRECIO DESDE
            ======================================================== */}
        <section className="relative bg-[#F4F6F9] py-16 md:py-20 before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-white before:to-[#F4F6F9]">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl">
              <div className="rounded-3xl border border-[#D8E1EF] bg-white p-7 md:p-10">
                <div className="flex flex-col gap-6 md:flex-row md:items-start">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[#173B8F]/10 text-[#173B8F]">
                    <CircleDollarSign className="h-7 w-7" />
                  </div>

                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                      Cómo funcionan nuestros precios
                    </p>

                    <h2 className="mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                      ¿Por qué nuestros servicios tienen un precio "desde"?
                    </h2>

                    <p className="mt-5 leading-relaxed text-[#52627A]">
                      Los servicios de Modira no son paquetes cerrados. Cada
                      empresa tiene procesos, herramientas y necesidades
                      diferentes. Por eso mostramos un precio base para cada
                      servicio, pero el presupuesto final se adapta al alcance
                      real del proyecto.
                    </p>

                    <p className="mt-4 leading-relaxed text-[#52627A]">
                      Antes de empezar, analizamos tu caso y definimos
                      exactamente qué necesita tu empresa.
                    </p>

                    <div className="mt-6 rounded-2xl border border-[#DCE4EF] bg-[#F8FAFC] p-5">
                      <div className="flex items-start gap-3">
                        <ClipboardCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#173B8F]" />

                        <div>
                          <h3 className="font-bold text-[#102A66]">
                            La auditoría inicial es gratuita
                          </h3>

                          <p className="mt-1 text-sm leading-relaxed text-[#52627A]">
                            La auditoría es siempre gratuita y no implica
                            ningún compromiso. Sirve para determinar qué
                            solución tiene sentido para cada empresa.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            QUÉ PODEMOS AUTOMATIZAR
            ======================================================== */}
        <section className="relative bg-white py-16 md:py-24 before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-[#F4F6F9] before:to-white">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                Posibilidades
              </p>

              <h2 className="mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                ¿Qué podemos automatizar?
              </h2>

              <p className="mt-4 text-[#52627A] md:text-lg">
                La automatización puede aplicarse a diferentes áreas de una
                empresa. El objetivo es detectar dónde puede ahorrar tiempo,
                reducir tareas manuales y mejorar tus procesos.
              </p>
            </div>

            <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-4">
              {automationAreas.map((area) => (
                <div
                  key={area.title}
                  className="rounded-2xl border border-[#E1E7EF] bg-[#F4F6F9] p-6"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F]">
                    <area.icon className="h-5 w-5" />
                  </div>

                  <h3 className="text-xl font-bold text-[#102A66]">
                    {area.title}
                  </h3>

                  <div className="mt-4 space-y-3">
                    {area.items.map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-2"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#173B8F]" />

                        <span className="text-sm leading-relaxed text-[#52627A]">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================
            MANTENIMIENTO
            ======================================================== */}
        <section
          id="mantenimiento"
          className="relative bg-[#F4F6F9] py-16 md:py-24 before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-white before:to-[#F4F6F9]"
        >
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                Planes de mantenimiento
              </p>

              <h2 className="mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                Tu automatización no termina cuando se pone en marcha
              </h2>

              <p className="mt-4 text-[#52627A] md:text-lg">
                Tus herramientas cambian. Tus procesos evolucionan. Tu empresa
                crece. Por eso ofrecemos planes de mantenimiento para
                supervisar, mantener y mejorar tus automatizaciones después de
                su implantación.
              </p>

              <p className="mt-4 text-[#52627A] md:text-lg">
                A diferencia de los servicios de implementación,{" "}
                <strong className="text-[#102A66]">
                  los planes de mantenimiento sí son planes cerrados.
                </strong>
              </p>
            </div>

            <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
              {maintenancePlans.map((plan) => (
                <div
                  key={plan.number}
                  className={`relative overflow-hidden rounded-3xl border bg-white shadow-sm ${
                    plan.popular
                      ? "border-[#173B8F] shadow-md"
                      : "border-[#E1E7EF]"
                  }`}
                >
                  {/* MÁS POPULAR - ETIQUETA DIAGONAL */}
                  {plan.popular && (
                    <div
                      className="absolute right-[-45px] top-[24px] z-10 w-[175px] rotate-45 bg-gradient-to-r from-[#102A66] to-[#173B8F] py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-md"
                    >
                      Más popular
                    </div>
                  )}

                  <div className="p-7 md:p-8">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-[#173B8F]">
                          {plan.number}
                        </p>

                        <h3 className="mt-1 text-2xl font-bold text-[#102A66]">
                          {plan.title}
                        </h3>
                      </div>

                      <div
                        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
                          plan.popular
                            ? "bg-[#173B8F] text-white"
                            : "bg-[#173B8F]/10 text-[#173B8F]"
                        }`}
                      >
                        <plan.icon className="h-6 w-6" />
                      </div>
                    </div>

                    <p className="mt-5 text-3xl font-bold text-[#102A66]">
                      {plan.price}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-[#173B8F]">
                      {plan.subtitle}
                    </p>

                    <p className="mt-4 text-sm leading-relaxed text-[#52627A]">
                      {plan.description}
                    </p>

                    <div className="mt-7 border-t border-[#E8ECF2] pt-6">
                      <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                        Incluye
                      </p>

                      <div className="space-y-3">
                        {plan.features.map((feature, index) => (
                          <div
                            key={feature}
                            className="flex items-start gap-3"
                          >
                            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#173B8F]" />

                            <span
                              className={`text-sm leading-relaxed ${
                                index === 0 && plan.title !== "Essential"
                                  ? "font-semibold text-[#102A66]"
                                  : "text-[#52627A]"
                              }`}
                            >
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================
            COMPARATIVA
            ======================================================== */}
        <section className="relative bg-white py-16 md:py-24 before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-[#F4F6F9] before:to-white">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                Comparativa
              </p>

              <h2 className="mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                Elige el nivel de mantenimiento que necesitas
              </h2>

              <p className="mt-4 text-[#52627A] md:text-lg">
                Tres planes cerrados para diferentes niveles de dependencia y
                necesidades de supervisión.
              </p>
            </div>

            <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-[#E1E7EF] bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead>
                    <tr className="bg-[#F4F6F9]">
                      <th className="p-5 text-left text-sm font-bold text-[#102A66]">
                        Característica
                      </th>

                      <th className="p-5 text-center text-sm font-bold text-[#102A66]">
                        Essential
                        <div className="mt-1 text-base text-[#173B8F]">
                          149 €/mes
                        </div>
                      </th>

                      <th className="relative p-5 text-center text-sm font-bold text-[#102A66]">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#102A66] to-[#173B8F]" />
                        Growth
                        <div className="mt-1 text-base text-[#173B8F]">
                          299 €/mes
                        </div>
                        <span className="mt-2 inline-flex rounded-full bg-[#173B8F] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                          Más popular
                        </span>
                      </th>

                      <th className="p-5 text-center text-sm font-bold text-[#102A66]">
                        Business
                        <div className="mt-1 text-base text-[#173B8F]">
                          499 €/mes
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {[
                      ["Automatizaciones", "Hasta 3", "Hasta 10", "Ilimitadas"],
                      ["Supervisión", "✓", "✓", "✓"],
                      ["Soporte", "Básico", "Prioritario", "Avanzado"],
                      ["Revisión", "Mensual", "Quincenal", "Continua"],
                      ["Mejoras", "✓", "✓", "✓"],
                      ["Optimización continua", "—", "✓", "✓"],
                      ["Automatizaciones críticas", "—", "—", "✓"],
                      ["Soporte avanzado", "—", "—", "✓"],
                    ].map((row) => (
                      <tr
                        key={row[0]}
                        className="border-t border-[#E8ECF2]"
                      >
                        <td className="p-5 text-sm font-semibold text-[#102A66]">
                          {row[0]}
                        </td>

                        <td className="p-5 text-center text-sm text-[#52627A]">
                          {row[1]}
                        </td>

                        <td className="bg-[#173B8F]/[0.03] p-5 text-center text-sm font-medium text-[#52627A]">
                          {row[2]}
                        </td>

                        <td className="p-5 text-center text-sm text-[#52627A]">
                          {row[3]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            IMPLEMENTACIÓN → MANTENIMIENTO
            ======================================================== */}
        <section className="relative bg-[#F4F6F9] py-16 md:py-24 before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-white before:to-[#F4F6F9]">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                El recorrido con Modira
              </p>

              <h2 className="mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                Primero construimos. Después seguimos contigo.
              </h2>

              <p className="mt-4 text-[#52627A] md:text-lg">
                La relación con Modira no termina cuando la solución está
                implantada.
              </p>
            </div>

            <div className="mx-auto max-w-5xl">
              <div className="grid gap-6 md:grid-cols-2">
                {/* IMPLEMENTACIÓN */}
                <div className="rounded-3xl border border-[#E1E7EF] bg-white p-7 shadow-sm md:p-9">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#173B8F] text-white shadow-md">
                    <RocketIcon className="h-7 w-7" />
                  </div>

                  <p className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                    01 — Implementación
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-[#102A66]">
                    Servicios Modira
                  </h3>

                  <p className="mt-4 leading-relaxed text-[#52627A]">
                    Creamos e implantamos la solución que necesita tu empresa,
                    adaptándonos a sus procesos, herramientas y necesidades.
                  </p>

                  <div className="mt-6 space-y-3">
                    {[
                      "Auditoría gratuita",
                      "Diseño de la solución",
                      "Desarrollo e integración",
                      "Pruebas y puesta en marcha",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3"
                      >
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[#173B8F]" />

                        <span className="text-sm text-[#52627A]">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* MANTENIMIENTO */}
                <div className="rounded-3xl border border-[#E1E7EF] bg-white p-7 shadow-sm md:p-9">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#173B8F] text-white shadow-md">
                    <RefreshCw className="h-7 w-7" />
                  </div>

                  <p className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                    02 — Mantenimiento
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-[#102A66]">
                    Planes Modira
                  </h3>

                  <p className="mt-4 leading-relaxed text-[#52627A]">
                    Mantenemos, supervisamos y mejoramos esa solución a lo
                    largo del tiempo para que siga aportando valor a tu
                    empresa.
                  </p>

                  <div className="mt-6 space-y-3">
                    {[
                      "Supervisión",
                      "Mantenimiento",
                      "Soporte",
                      "Optimización y evolución",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3"
                      >
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[#173B8F]" />

                        <span className="text-sm text-[#52627A]">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* FLUJO */}
              <div className="mt-8 rounded-2xl border border-[#D8E1EF] bg-white p-6 md:p-7">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-center">
                  <div className="flex items-center justify-center gap-3 text-center">
                    <span className="rounded-xl bg-[#173B8F]/10 px-4 py-2 text-sm font-semibold text-[#173B8F]">
                      Auditoría gratuita
                    </span>

                    <ArrowRight className="h-5 w-5 text-[#8793A5]" />

                    <span className="rounded-xl bg-[#173B8F]/10 px-4 py-2 text-sm font-semibold text-[#173B8F]">
                      Servicio
                    </span>

                    <ArrowRight className="h-5 w-5 text-[#8793A5]" />

                    <span className="rounded-xl bg-[#173B8F]/10 px-4 py-2 text-sm font-semibold text-[#173B8F]">
                      Implementación
                    </span>

                    <ArrowRight className="h-5 w-5 text-[#8793A5]" />

                    <span className="rounded-xl bg-[#173B8F]/10 px-4 py-2 text-sm font-semibold text-[#173B8F]">
                      Mantenimiento
                    </span>

                    <ArrowRight className="h-5 w-5 text-[#8793A5]" />

                    <span className="rounded-xl bg-[#173B8F]/10 px-4 py-2 text-sm font-semibold text-[#173B8F]">
                      Evolución
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            RESULTADO
            ======================================================== */}
        <section className="relative bg-white py-16 md:py-24 before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-[#F4F6F9] before:to-white">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-r from-[#102A66] to-[#173B8F] px-7 py-12 text-white md:px-14 md:py-16">
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/60">
                  El objetivo
                </p>

                <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                  Que tu empresa deje de perder tiempo en tareas que una
                  máquina puede hacer por ti
                </h2>

                <p className="mt-5 text-base leading-relaxed text-white/80 md:text-lg">
                  El resultado no es simplemente una automatización. Es un
                  proceso más rápido, conectado y fiable que permite a tu
                  equipo dedicar su tiempo a tareas de mayor valor.
                </p>

                <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
                  {[
                    "Menos trabajo manual",
                    "Menos errores",
                    "Más tiempo para crecer",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 rounded-xl bg-white/10 p-4"
                    >
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0" />

                      <span className="text-sm font-semibold">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            CTA
            ======================================================== */}
        <section
          id="auditoria"
          className="relative bg-[#F4F6F9] py-16 md:py-24 before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-white before:to-[#F4F6F9]"
        >
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#173B8F]/10 text-[#173B8F]">
                <ClipboardCheck className="h-7 w-7" />
              </div>

              <h2 className="mt-5 text-3xl font-bold text-[#102A66] md:text-4xl">
                ¿No sabes qué solución necesita tu empresa?
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-[#52627A] md:text-lg">
                No necesitas decidir qué servicio contratar. Cuéntanos cómo
                funciona actualmente tu empresa y realizaremos una auditoría
                gratuita para detectar dónde puedes ahorrar tiempo, reducir
                tareas manuales y mejorar tus procesos.
              </p>

              <button
                type="button"
                onClick={goToAudit}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#173B8F] px-7 py-3.5 font-semibold text-white shadow-sm transition hover:bg-[#102A66]"
              >
                Solicitar auditoría gratuita
                <ArrowRight className="h-4 w-4" />
              </button>

              <p className="mt-4 text-sm text-[#8793A5]">
                Sin compromiso. Analizamos tu caso y te explicamos las
                posibilidades.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================
          FOOTER
          ======================================================== */}
      <footer className="bg-[#102A66] py-8 text-white">
        <div className="container mx-auto px-4 text-center text-sm text-white/60">
          © 2024 Modira. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}

/*
 * ============================================================
 * ICONOS AUXILIARES
 * ============================================================
 */

function EyeIcon({ className }: { className?: string }) {
  return <Sparkles className={className} />;
}

function RocketIcon({ className }: { className?: string }) {
  return <Zap className={className} />;
}