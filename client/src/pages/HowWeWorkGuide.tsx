import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Lightbulb,
  Rocket,
  Settings,
  ShieldCheck,
  LifeBuoy,
  CreditCard,
  Zap,
  Eye,
  TrendingUp,
  Menu,
  X,
  MessageSquare,
  FileCheck,
  PlayCircle,
  Receipt,
  Search,
  Settings2,
  Workflow,
  RefreshCw
} from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

export default function HowWeWorkGuide() {
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
   * TRANSICIONES INDIVIDUALES
   *
   * La animación se aplica únicamente a los elementos que
   * llevan la clase .scroll-reveal-item.
   *
   * No se anima ninguna sección completa.
   * ============================================================
   */
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

    elements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  /*
   * ============================================================
   * PROCESO DE TRABAJO
   *
   * Se mantienen las 4 etapas principales utilizadas en el
   * Área Principal, pero ahora cada etapa explica los pasos
   * concretos que ocurren dentro de ella.
   * ============================================================
   */

  const processSteps = [
    {
      number: "01",
      title: "Auditoría gratuita",
      subtitle: "Entendemos tu necesidad y definimos el proyecto",
      icon: ClipboardCheck,
      description:
        "El primer paso es conocer qué necesitas y cómo podemos ayudarte. El proyecto puede comenzar de dos formas: solicitando una auditoría gratuita o creando directamente un proyecto desde el Área de Cliente. En ambos casos, el equipo técnico analiza la necesidad y concreta contigo el alcance del proyecto.",
      points: [
        "Analizamos tus procesos actuales y necesidades para detectar oportunidades de mejora.",
        "El alcance del proyecto se concreta contigo antes de avanzar.",
        "Contestamos a tu auditoría o propuesta de proyecto en menos de 24 horas.",
        "Te acompañamos durante todo el proceso.",
        
      ],
    },

    {
      number: "02",
      title: "Diseño de la solución",
      subtitle: "Convertimos la necesidad en una propuesta concreta",
      icon: Lightbulb,
      description:
        "Una vez definido el proyecto, concretamos qué se va a realizar y cómo se llevará a cabo. Sobre esta base elaboramos el presupuesto correspondiente, que podrás consultar desde el apartado de Presupuestos de tu Área de Cliente, donde encontrarás detalladas las características del servicio, el importe y las condiciones de la propuesta. Además, podrás visualizar el documento en PDF y descargarlo para consultarlo cuando lo necesites antes de aprobarlo.",
      points: [
        "El presupuesto parte del proyecto y de las necesidades acordadas.",
        "Puedes consultar todas las características e importes.",
        "Dispones de vista previa y puedes visualizar y descargar el documento PDF.",
        "La ejecución comienza una vez aceptada la propuesta.",
      ],
    },

    {
      number: "03",
      title: "Desarrollo e implantación",
      subtitle: "Construimos, probamos y ponemos en marcha la solución",
      icon: Rocket,
      description:
        "Con el presupuesto aceptado, el equipo técnico comienza a trabajar en la solución acordada. Dependiendo del servicio, esto puede implicar diseñar una automatización, desarrollar una funcionalidad, configurar integraciones o implementar una herramienta. Durante esta fase trabajamos sobre el alcance definido y realizamos las comprobaciones necesarias antes de poner el resultado en funcionamiento.",
      points: [
        "Diseñamos y desarrollamos la solución acordada.",
        "Configuramos las herramientas e integraciones necesarias.",
        "Realizamos pruebas antes de la puesta en funcionamiento.",
        "Mantenemos la comunicación contigo durante el desarrollo.",
      ],
    },

    {
      number: "04",
      title: "Seguimiento y mejora",
      subtitle: "Finalizamos, demostramos y entregamos el resultado",
      icon: TrendingUp,
      description:
        "Cuando el trabajo técnico está terminado, el proyecto pasa a estado Completado. Te comunicamos que la solución está lista y realizamos una demostración para que puedas comprobar su funcionamiento. Posteriormente se emite la factura correspondiente y puedes gestionarla y realizar el pago desde el Área de Cliente.",
      points: [
        "Recibes una notificación cuando la solución está preparada.",
        "Realizamos una demostración del servicio o herramienta implementada.",
        "Puedes visualizar, consultar y descargar el PDF de la factura desde el Área de Cliente.",
        "Realiza el pago de forma segura directamente desde el Área de Cliente.",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white">

      <style>{`
        .scroll-reveal-item {
          opacity: 0;
          transform: translateY(24px);
          transition:
            opacity 700ms ease-out,
            transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
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
              {/* Nuestro proceso */}
              <button
                type="button"
                onClick={() => {
                  document.getElementById("proceso")?.scrollIntoView({
                    behavior: "smooth",
                  });
                }}
                className={`text-[14px] font-medium transition-colors duration-300 ${
                  isScrolled
                    ? "text-[#102A66]/80 hover:text-[#102A66]"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Nuestro proceso
              </button>

              {/* Cómo gestionamos tu proyecto */}
              <button
                type="button"
                onClick={() => {
                  document
                    .getElementById("area-cliente-info")
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
                Cómo gestionamos tu proyecto
              </button>
            </nav>

            {/* Área principal */}
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
            {/* Nuestro proceso */}
            <button
              type="button"
              onClick={() => {
                document.getElementById("proceso")?.scrollIntoView({
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
              Nuestro proceso
            </button>

            {/* Cómo gestionamos tu proyecto */}
            <button
              type="button"
              onClick={() => {
                document
                  .getElementById("area-cliente-info")
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
              Cómo gestionamos tu proyecto
            </button>

            {/* Área principal */}
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
          TÍTULO / HERO — CÓMO TRABAJAMOS
          ======================================================== */}
      <section className="bg-[#102A66] pt-[70px] overflow-hidden">

        <div className="container mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 xl:px-16 py-8 md:py-10">

          <div className="flex items-center justify-between gap-10">

            {/* ==================================================
                TEXTO
                ================================================== */}
            <div className="min-w-0">

              <h1 className="text-[40px] md:text-[44px] lg:text-[47px] font-bold text-white leading-[1.25] tracking-[0em]">
                Cómo trabajamos
              </h1>

              <p className="mt-7 text-[17px] md:text-[18px] text-white/85 leading-[1.5] max-w-[620px]">
                Conoce cómo transformamos procesos manuales en sistemas que
                trabajan por ti.
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
                <circle r="1.7" fill="rgba(255,255,255,0.88)">
                  <animateMotion
                    dur="3.4s"
                    begin="0.8s"
                    repeatCount="indefinite"
                    path="M145 87 C170 70 195 55 224 52"
                  />
                </circle>

                {/* Derecha inferior */}
                <circle r="1.7" fill="rgba(255,255,255,0.88)">
                  <animateMotion
                    dur="3.1s"
                    begin="1.2s"
                    repeatCount="indefinite"
                    path="M145 103 C170 120 195 135 224 138"
                  />
                </circle>

                {/* Izquierda superior */}
                <circle r="1.7" fill="rgba(255,255,255,0.82)">
                  <animateMotion
                    dur="3.5s"
                    begin="0.4s"
                    repeatCount="indefinite"
                    path="M115 87 C90 70 65 55 36 52"
                  />
                </circle>

                {/* Izquierda inferior */}
                <circle r="1.7" fill="rgba(255,255,255,0.82)">
                  <animateMotion
                    dur="3.2s"
                    begin="1.5s"
                    repeatCount="indefinite"
                    path="M115 103 C90 120 65 135 36 138"
                  />
                </circle>

                {/* Inferior */}
                <circle r="1.7" fill="rgba(255,255,255,0.88)">
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
                  NODO 1 — ANALIZAMOS
                  ================================================== */}

              <div className="absolute top-[8px] left-1/2 -translate-x-1/2">

                <div className="w-[34px] h-[34px] rounded-full border border-white/20 bg-white/[0.09] backdrop-blur-sm flex items-center justify-center">

                  <Search
                    className="w-[16px] h-[16px] text-white/85"
                    strokeWidth={1.5}
                  />

                </div>

              </div>


              {/* ==================================================
                  NODO 2 — IDENTIFICAMOS
                  ================================================== */}

              <div className="absolute right-[7px] top-[35px]">

                <div className="w-[34px] h-[34px] rounded-full border border-white/20 bg-white/[0.09] backdrop-blur-sm flex items-center justify-center">

                  <Lightbulb
                    className="w-[17px] h-[17px] text-white/85"
                    strokeWidth={1.5}
                  />

                </div>

              </div>


              {/* ==================================================
                  NODO 3 — DISEÑAMOS
                  ================================================== */}

              <div className="absolute right-[7px] bottom-[35px]">

                <div className="w-[34px] h-[34px] rounded-full border border-white/20 bg-white/[0.09] backdrop-blur-sm flex items-center justify-center">

                  <Settings2
                    className="w-[16px] h-[16px] text-white/85"
                    strokeWidth={1.5}
                  />

                </div>

              </div>


              {/* ==================================================
                  NODO 4 — CONECTAMOS
                  ================================================== */}

              <div className="absolute left-[7px] top-[35px]">

                <div className="w-[34px] h-[34px] rounded-full border border-white/20 bg-white/[0.09] backdrop-blur-sm flex items-center justify-center">

                  <Workflow
                    className="w-[16px] h-[16px] text-white/85"
                    strokeWidth={1.5}
                  />

                </div>

              </div>


              {/* ==================================================
                  NODO 5 — PONEMOS EN MARCHA
                  ================================================== */}

              <div className="absolute left-[7px] bottom-[35px]">

                <div className="w-[34px] h-[34px] rounded-full border border-white/20 bg-white/[0.09] backdrop-blur-sm flex items-center justify-center">

                  <Rocket
                    className="w-[16px] h-[16px] text-white/85"
                    strokeWidth={1.5}
                  />

                </div>

              </div>


              {/* ==================================================
                  NODO 6 — MEJORAMOS
                  ================================================== */}

              <div className="absolute bottom-[4px] left-1/2 -translate-x-1/2">

                <div className="w-[34px] h-[34px] rounded-full border border-white/20 bg-white/[0.09] backdrop-blur-sm flex items-center justify-center">

                  <RefreshCw
                    className="w-[16px] h-[16px] text-white/85"
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
              <p className="scroll-reveal-item text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                Un proceso pensado para tu empresa
              </p>

              <h2 className="scroll-reveal-item mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                Automatizar no es simplemente conectar herramientas
              </h2>

              <p className="scroll-reveal-item mt-5 text-base leading-relaxed text-[#52627A] md:text-lg">
                Cada empresa tiene procesos, herramientas y necesidades
                diferentes. Por eso nuestro trabajo empieza mucho antes de
                construir una automatización. Primero entendemos el problema,
                después diseñamos la solución y finalmente la implantamos y
                optimizamos.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: Eye,
                  title: "Entendemos",
                  text: "Analizamos cómo funciona actualmente tu empresa y dónde se pierde tiempo.",
                },
                {
                  icon: Settings,
                  title: "Construimos",
                  text: "Diseñamos e implantamos una solución adaptada a tus procesos reales.",
                },
                {
                  icon: TrendingUp,
                  title: "Mejoramos",
                  text: "Seguimos optimizando el sistema para que continúe aportando valor.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="scroll-reveal-item rounded-2xl border border-[#E8ECF2] bg-[#F8FAFC] p-7"
                >
                  <div className="scroll-reveal-item mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F]">
                    <item.icon className="h-6 w-6" />
                  </div>

                  <h3 className="scroll-reveal-item text-xl font-bold text-[#102A66]">
                    {item.title}
                  </h3>

                  <p className="scroll-reveal-item mt-2 leading-relaxed text-[#52627A]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================
            PROCESO UNIFICADO
            ======================================================== */}
        <section
          id="proceso"
          className="scroll-reveal-section proceso-reveal relative bg-[#F4F6F9] py-16 md:py-24 before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-white before:to-[#F4F6F9]"
        >
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <p className="scroll-reveal-item text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                Nuestro proceso
              </p>

              <h2 className="scroll-reveal-item mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                Cuatro etapas para transformar tu proceso
              </h2>

              <p className="scroll-reveal-item mt-4 text-[#52627A] md:text-lg">
                Desde la primera conversación hasta la entrega final,
                trabajamos de forma progresiva para que conozcas qué ocurre
                en cada momento y tengas toda la información de tu proyecto
                disponible desde el Área de Cliente.
              </p>
            </div>

            <div className="mx-auto max-w-5xl space-y-8">
              {processSteps.map((step) => (
                <div
                  key={step.number}
                  className="scroll-reveal-item overflow-hidden rounded-3xl border border-[#E1E7EF] bg-white shadow-sm"
                >
                  {/* CABECERA DE LA ETAPA */}
                  <div className="p-7 md:p-10">
                    <div className="flex flex-col gap-7 md:flex-row">
                      <div className="flex-shrink-0">
                        <div className="scroll-reveal-item flex h-16 w-16 items-center justify-center rounded-2xl bg-[#173B8F] text-white shadow-md">
                          <step.icon className="h-8 w-8" />
                        </div>

                        <p className="scroll-reveal-item mt-3 text-center text-sm font-bold text-[#173B8F]">
                          {step.number}
                        </p>
                      </div>

                      <div className="flex-1">
                        <p className="scroll-reveal-item text-sm font-semibold text-[#173B8F]">
                          {step.subtitle}
                        </p>

                        <h3 className="scroll-reveal-item mt-1 text-2xl font-bold text-[#102A66] md:text-3xl">
                          {step.title}
                        </h3>

                        <p className="scroll-reveal-item mt-4 leading-relaxed text-[#52627A]">
                          {step.description}
                        </p>

                        {/* PUNTOS RESUMEN */}
                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                          {step.points.map((point) => (
                            <div
                              key={point}
                              className="scroll-reveal-item flex items-start gap-3"
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
                </div>
              ))}
            </div>

            {/* LÍNEA FINAL DEL PROCESO */}
            <div className="mx-auto mt-10 max-w-5xl">
              <div className="scroll-reveal-item rounded-2xl border border-[#D8E1EF] bg-white p-6 md:p-7">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="scroll-reveal-item flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F]">
                    <ShieldCheck className="h-6 w-6" />
                  </div>

                  <div>
                    <h3 className="scroll-reveal-item font-bold text-[#102A66]">
                      Todo el proceso queda centralizado en tu Área de Cliente
                    </h3>

                    <p className="scroll-reveal-item mt-1 text-sm leading-relaxed text-[#52627A]">
                      Desde la creación del proyecto hasta el presupuesto, la
                      factura y su estado de pago, dispones de un único espacio
                      para consultar la información y evolución de tu relación
                      con Modira.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            ÁREA DE CLIENTE
            ======================================================== */}
        <section
          id="area-cliente-info"
          className="scroll-reveal-section relative bg-white py-16 md:py-24 before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-[#F4F6F9] before:to-white"
        >
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <p className="scroll-reveal-item text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                Área de Cliente
              </p>

              <h2 className="scroll-reveal-item mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                Todo lo que necesitas, en un mismo lugar
              </h2>

              <p className="scroll-reveal-item mt-4 text-[#52627A] md:text-lg">
                Puedes gestionar desde tu Área de Cliente los principales
                aspectos de tu relación con Modira.
              </p>

              <button
                type="button"
                onClick={() => setLocation("/auth")}
                className="scroll-reveal-item mt-7 inline-flex items-center gap-2 rounded-lg bg-[#173B8F] px-7 py-3.5 font-semibold text-white shadow-sm transition hover:bg-[#102A66]"
              >
                Acceder al Área de Cliente
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Zap,
                  title: "Proyectos",
                  text: "Consulta tus proyectos y sigue su evolución mediante sus diferentes estados.",
                },
                {
                  icon: FileText,
                  title: "Presupuestos",
                  text: "Consulta tus propuestas comerciales, servicios e importes desde tu cuenta.",
                },
                {
                  icon: CreditCard,
                  title: "Facturación",
                  text: "Consulta tus facturas, revisa su estado, accede a ellas y realiza el pago desde la plataforma.",
                },
                {
                  icon: LifeBuoy,
                  title: "Soporte",
                  text: "Abre tickets de soporte y realiza el seguimiento de tus solicitudes.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="scroll-reveal-item rounded-2xl border border-[#E1E7EF] bg-[#F4F6F9] p-6"
                >
                  <div className="scroll-reveal-item mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F]">
                    <item.icon className="h-5 w-5" />
                  </div>

                  <h3 className="scroll-reveal-item text-xl font-bold text-[#102A66]">
                    {item.title}
                  </h3>

                  <p className="scroll-reveal-item mt-3 text-sm leading-relaxed text-[#52627A]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="mx-auto mt-8 flex max-w-4xl items-start gap-4">
              <div className="scroll-reveal-item flex w-full items-start gap-4 rounded-2xl border border-[#DCE4EF] bg-[#F4F6F9] p-6">
                <ShieldCheck className="scroll-reveal-item mt-0.5 h-6 w-6 flex-shrink-0 text-[#173B8F]" />

                <div>
                  <h3 className="scroll-reveal-item font-bold text-[#102A66]">
                    Información protegida y separada por cliente
                  </h3>

                  <p className="scroll-reveal-item mt-1 text-sm leading-relaxed text-[#52627A]">
                    El Área de Cliente está diseñada para que cada usuario
                    acceda únicamente a la información que corresponde a su
                    cuenta, empresa y proyectos.
                  </p>
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
            <div className="scroll-reveal-item mx-auto max-w-5xl rounded-3xl bg-gradient-to-r from-[#102A66] to-[#173B8F] px-7 py-12 text-white md:px-14 md:py-16">
              <div className="mx-auto max-w-3xl text-center">
                <p className="scroll-reveal-item text-sm font-bold uppercase tracking-[0.16em] text-white/60">
                  El objetivo
                </p>

                <h2 className="scroll-reveal-item mt-3 text-3xl font-bold md:text-4xl">
                  Que tu empresa deje de perder tiempo en tareas que una
                  máquina puede hacer por ti
                </h2>

                <p className="scroll-reveal-item mt-5 text-base leading-relaxed text-white/80 md:text-lg">
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
                      className="scroll-reveal-item flex items-center gap-2 rounded-xl bg-white/10 p-4"
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
              <div className="scroll-reveal-item mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#173B8F]/10 text-[#173B8F]">
                <ClipboardCheck className="h-7 w-7" />
              </div>

              <h2 className="scroll-reveal-item mt-5 text-3xl font-bold text-[#102A66] md:text-4xl">
                ¿Dónde puede ayudarte la automatización?
              </h2>

              <p className="scroll-reveal-item mx-auto mt-4 max-w-2xl text-[#52627A] md:text-lg">
                Cuéntanos qué procesos te hacen perder más tiempo y
                analizaremos dónde puede aportar valor la automatización en tu
                empresa.
              </p>

              <button
                type="button"
                onClick={() => {
                  setLocation("/");

                  setTimeout(() => {
                    document
                      .getElementById("auditoria")
                      ?.scrollIntoView({
                        behavior: "smooth",
                      });
                  }, 100);
                }}
                className="scroll-reveal-item mt-8 inline-flex items-center gap-2 rounded-lg bg-[#173B8F] px-7 py-3.5 font-semibold text-white shadow-sm transition hover:bg-[#102A66]"
              >
                Solicitar auditoría gratuita
                <ArrowRight className="h-4 w-4" />
              </button>

              <p className="scroll-reveal-item mt-4 text-sm text-[#8793A5]">
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