import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  CreditCard,
  FileCheck,
  FileText,
  HelpCircle,
  LifeBuoy,
  Mail,
  Eye,
  Download,
  Check,
  X,
  Clock3,
  CirclePause,
  Rocket,
  PackageCheck,
  CircleCheck,
  ShieldCheck,
  UserRound,
  LayoutDashboard,
  MessageSquare,
  Search,
  Zap,
  Receipt,
  ExternalLink,
  Lock,
  AlertCircle,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function UserGuide() {
  const [, setLocation] = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const [activeProjectStep, setActiveProjectStep] = useState(0);
  const [activeQuotationStep, setActiveQuotationStep] = useState(0);
  const [activeInvoiceStep, setActiveInvoiceStep] = useState(0);

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /*
   * ============================================================
   * REVEAL DE ELEMENTOS
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

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  /*
   * ============================================================
   * DATOS DEL FLUJO DE PROYECTOS
   * ============================================================
   */

  const projectSteps = [
    {
      status: "Pendiente",
      color: "gray",
      icon: Clock3,
      title: "Tu proyecto está en revisión",
      description:
        "El proyecto se encuentra pendiente mientras concretamos el alcance, revisamos tus necesidades y preparamos la propuesta correspondiente.",
      action:
        "En esta fase no tienes que hacer nada más que revisar la información cuando esté disponible.",
    },
    {
      status: "Pendiente",
      color: "gray",
      icon: FileCheck,
      title: "Recibes el presupuesto",
      description:
        "Cuando la solución está definida, el presupuesto aparece en tu Área de Cliente. Desde allí puedes consultar sus detalles, abrir la vista previa y revisar el documento PDF.",
      action:
        "Revisa los servicios, importes, condiciones y documentación antes de decidir.",
    },
    {
      status: "Activo",
      color: "green",
      icon: Rocket,
      title: "El proyecto comienza",
      description:
        "Una vez aceptado el presupuesto y confirmado el alcance, el proyecto pasa a Activo y el equipo técnico comienza la ejecución.",
      action:
        "Puedes consultar la evolución del proyecto desde tu Área de Cliente.",
    },
    {
      status: "Pausado",
      color: "yellow",
      icon: CirclePause,
      title: "El proyecto puede pausarse",
      description:
        "Este estado puede utilizarse cuando existe un imprevisto, necesitamos información adicional, el cliente solicita una pausa o existe alguna circunstancia que impide continuar temporalmente.",
      action:
        "Si necesitamos algo de tu parte, te lo comunicaremos para poder continuar.",
    },
    {
      status: "Entregado",
      color: "blue",
      icon: PackageCheck,
      title: "La solución está preparada",
      description:
        "El trabajo técnico ha terminado y el resultado está preparado para su entrega y demostración.",
      action:
        "Realizamos la demostración correspondiente y ponemos a tu disposición la información necesaria para finalizar el proyecto.",
    },
    {
      status: "Completado",
      color: "purple",
      icon: CircleCheck,
      title: "Proyecto completado",
      description:
        "Una vez finalizada la entrega y gestionado el pago correspondiente, el proyecto pasa a Completado.",
      action:
        "Puedes seguir consultando la información del proyecto desde tu Área de Cliente.",
    },
  ];

  /*
   * ============================================================
   * FLUJO PRESUPUESTOS
   * ============================================================
   */

  const quotationSteps = [
    {
      number: "01",
      title: "Aparece un nuevo presupuesto",
      description:
        "Cuando el presupuesto está preparado, podrás encontrarlo en el apartado Presupuestos de tu Área de Cliente.",
      icon: BellIcon,
    },
    {
      number: "02",
      title: "Revisa la propuesta",
      description:
        "Puedes consultar el proyecto asociado, fecha de emisión, validez, importe y estado del presupuesto.",
      icon: Eye,
    },
    {
      number: "03",
      title: "Abre la vista previa",
      description:
        "Desde las acciones puedes abrir una vista previa con la información principal de la propuesta y acceder al documento PDF.",
      icon: FileText,
    },
    {
      number: "04",
      title: "Decide qué hacer",
      description:
        "Si estás conforme, puedes aceptar el presupuesto. Si no deseas continuar con la propuesta, también puedes rechazarla.",
      icon: CheckCircle2,
    },
  ];

  /*
   * ============================================================
   * FLUJO FACTURACIÓN
   * ============================================================
   */

  const invoiceSteps = [
    {
      number: "01",
      title: "Se genera tu factura",
      description:
        "Cuando corresponde emitir la factura de tu proyecto, esta aparece en el apartado Facturación de tu Área de Cliente.",
      icon: Receipt,
    },
    {
      number: "02",
      title: "Consulta los datos",
      description:
        "Puedes consultar número de factura, proyecto asociado, fecha de emisión, vencimiento, importe y estado.",
      icon: Eye,
    },
    {
      number: "03",
      title: "Consulta o descarga el PDF",
      description:
        "Desde las acciones puedes abrir la factura, visualizar su documentación y descargar el PDF cuando esté disponible.",
      icon: Download,
    },
    {
      number: "04",
      title: "Realiza el pago",
      description:
        "Si la factura está pendiente o vencida, podrás iniciar el pago desde el botón correspondiente y continuar mediante la pasarela de pago segura.",
      icon: CreditCard,
    },
    {
      number: "05",
      title: "La factura pasa a pagada",
      description:
        "Una vez confirmado correctamente el pago, la factura pasa a estado Pagada y deja de estar pendiente de pago.",
      icon: CircleCheck,
    },
  ];

  /*
   * ============================================================
   * FAQ
   * ============================================================
   */

  const faqItems = [
    {
      question: "¿Tengo que crear yo el proyecto?",
      answer:
        "No necesariamente. Puedes crear directamente un proyecto desde tu Área de Cliente o podemos crearlo nosotros después de una auditoría y de haber concretado contigo las necesidades y el alcance del trabajo.",
    },
    {
      question: "¿Qué ocurre después de crear un proyecto?",
      answer:
        "El proyecto queda disponible en tu Área de Cliente. Si lo has creado tú, comienza en estado Pendiente. Nuestro equipo revisará la información y concretará contigo los detalles necesarios antes de preparar el presupuesto.",
    },
    {
      question: "¿Cuándo empieza realmente el proyecto?",
      answer:
        "El proyecto pasa a Activo cuando la solución está definida, el alcance está alineado con tus necesidades y el presupuesto correspondiente ha sido aceptado.",
    },
    {
      question: "¿Qué tengo que hacer cuando recibo un presupuesto?",
      answer:
        "Solo tienes que revisarlo. Puedes consultar sus datos, abrir la vista previa, acceder al PDF y comprobar servicios, importes y condiciones. Si estás conforme, puedes aceptarlo desde el Área de Cliente.",
    },
    {
      question: "¿Puedo rechazar un presupuesto?",
      answer:
        "Sí. Mientras el presupuesto esté pendiente puedes utilizar la opción de rechazarlo desde su vista de detalle.",
    },
    {
      question: "¿Qué ocurre cuando un proyecto pasa a Entregado?",
      answer:
        "Significa que el trabajo técnico está preparado para su entrega. En esta fase podemos realizar la demostración correspondiente y gestionar la parte final del proyecto.",
    },
    {
      question: "¿Cómo puedo pagar una factura?",
      answer:
        "Desde Facturación puedes abrir la factura o utilizar directamente la acción Pagar cuando esté disponible. El pago se realiza mediante la pasarela segura habilitada por Modira.",
    },
    {
      question: "¿Qué hago si tengo un problema con la plataforma?",
      answer:
        "Puedes utilizar el apartado Soporte para abrir un ticket, explicar el problema y realizar posteriormente el seguimiento de la solicitud.",
    },
  ];

  /*
   * ============================================================
   * COLORES ESTADOS
   * ============================================================
   */

  const getStatusClasses = (color: string) => {
    switch (color) {
      case "green":
        return {
          badge: "bg-green-100 text-green-700 border-green-200",
          icon: "bg-green-100 text-green-700",
          line: "bg-green-500",
        };

      case "yellow":
        return {
          badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
          icon: "bg-yellow-100 text-yellow-700",
          line: "bg-yellow-500",
        };

      case "blue":
        return {
          badge: "bg-blue-100 text-blue-700 border-blue-200",
          icon: "bg-blue-100 text-blue-700",
          line: "bg-blue-500",
        };

      case "purple":
        return {
          badge: "bg-purple-100 text-purple-700 border-purple-200",
          icon: "bg-purple-100 text-purple-700",
          line: "bg-purple-500",
        };

      default:
        return {
          badge: "bg-gray-100 text-gray-700 border-gray-200",
          icon: "bg-gray-100 text-gray-700",
          line: "bg-gray-400",
        };
    }
  };

  return (
    <div className="min-h-screen bg-white">

      {/* ========================================================
          ANIMACIONES
          ======================================================== */}

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

        .guide-pulse {
          animation: guidePulse 3s ease-in-out infinite;
        }

        .guide-float {
          animation: guideFloat 4s ease-in-out infinite;
        }

        @keyframes guidePulse {
          0%, 100% {
            transform: scale(1);
            opacity: .45;
          }

          50% {
            transform: scale(1.08);
            opacity: .8;
          }
        }

        @keyframes guideFloat {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-6px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .scroll-reveal-item {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }

          .guide-pulse,
          .guide-float {
            animation: none !important;
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

      {(
        isScrolled
          ? import.meta.env.VITE_APP_LOGO_DARK
          : import.meta.env.VITE_APP_LOGO
      ) &&
      !(
        isScrolled
          ? import.meta.env.VITE_APP_LOGO_DARK
          : import.meta.env.VITE_APP_LOGO
      ).startsWith("%") ? (
        <img
          src={
            isScrolled
              ? import.meta.env.VITE_APP_LOGO_DARK
              : import.meta.env.VITE_APP_LOGO
          }
          alt="Logo"
          className="h-8 w-auto object-contain transition-all duration-300"
        />
      ) : (
        <div
          className={`p-1.5 rounded-lg transition-all duration-300 ${
            isScrolled ? "bg-[#102A66]/10" : "bg-white/20"
          }`}
        >
          <Zap
            className={`h-5 w-5 transition-colors duration-300 ${
              isScrolled ? "text-[#102A66]" : "text-white"
            }`}
          />
        </div>
      )}

      <span
        className={`modira-font text-xl leading-none flex items-center translate-y-[2px] transition-colors duration-300 ${
          isScrolled ? "text-[#102A66]" : "text-white"
        }`}
      >
        MODIRA
      </span>
    </div>

    {/* ====================================================
        DESKTOP NAVIGATION
        ==================================================== */}

    <div className="hidden md:flex items-center gap-6">

      {/* Cómo funciona */}
      <button
        type="button"
        onClick={() =>
          document
            .getElementById("como-funciona")
            ?.scrollIntoView({ behavior: "smooth" })
        }
        className={`text-[14px] font-medium transition-colors duration-300 ${
          isScrolled
            ? "text-[#102A66]/80 hover:text-[#102A66]"
            : "text-white/80 hover:text-white"
        }`}
      >
        Cómo funciona
      </button>

      {/* Proyectos */}
      <button
        type="button"
        onClick={() =>
          document
            .getElementById("proyectos")
            ?.scrollIntoView({ behavior: "smooth" })
        }
        className={`text-[14px] font-medium transition-colors duration-300 ${
          isScrolled
            ? "text-[#102A66]/80 hover:text-[#102A66]"
            : "text-white/80 hover:text-white"
        }`}
      >
        Proyectos
      </button>

      {/* Presupuestos */}
      <button
        type="button"
        onClick={() =>
          document
            .getElementById("presupuestos")
            ?.scrollIntoView({ behavior: "smooth" })
        }
        className={`text-[14px] font-medium transition-colors duration-300 ${
          isScrolled
            ? "text-[#102A66]/80 hover:text-[#102A66]"
            : "text-white/80 hover:text-white"
        }`}
      >
        Presupuestos
      </button>

      {/* Facturación */}
      <button
        type="button"
        onClick={() =>
          document
            .getElementById("facturacion")
            ?.scrollIntoView({ behavior: "smooth" })
        }
        className={`text-[14px] font-medium transition-colors duration-300 ${
          isScrolled
            ? "text-[#102A66]/80 hover:text-[#102A66]"
            : "text-white/80 hover:text-white"
        }`}
      >
        Facturación
      </button>

      {/* Soporte */}
      <button
        type="button"
        onClick={() =>
          document
            .getElementById("soporte")
            ?.scrollIntoView({ behavior: "smooth" })
        }
        className={`text-[14px] font-medium transition-colors duration-300 ${
          isScrolled
            ? "text-[#102A66]/80 hover:text-[#102A66]"
            : "text-white/80 hover:text-white"
        }`}
      >
        Soporte
      </button>
{/* Acceder al Área de Cliente */}
<button
  type="button"
  onClick={() => setLocation("/area-cliente")}
  className={`text-[14px] font-medium transition-colors duration-300 ${
    isScrolled
      ? "text-[#102A66]/80 hover:text-[#102A66]"
      : "text-white/80 hover:text-white"
  }`}
>
  Acceder al Área de Cliente
</button>
      {/* ==================================================
          ÁREA PRINCIPAL
          ================================================== */}

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

    {/* ====================================================
        MOBILE MENU BUTTON
        ==================================================== */}

    <button
      type="button"
      className={`md:hidden transition-colors duration-300 ${
        isScrolled ? "text-[#102A66]" : "text-white"
      }`}
      onClick={() => setIsOpen(!isOpen)}
      aria-label="Abrir menú"
    >
      {isOpen ? (
        <XIcon />
      ) : (
        <MenuIcon />
      )}
    </button>

  </nav>

  {/* ======================================================
      MOBILE NAVIGATION
      ====================================================== */}

  {isOpen && (
    <div
      className={`md:hidden absolute top-[80px] left-0 w-full border-b px-4 py-4 space-y-3 shadow-lg ${
        isScrolled
          ? "bg-white border-[#102A66]/10"
          : "bg-[#102A66] border-white/20"
      }`}
    >

      {[
        ["Cómo funciona", "como-funciona"],
        ["Proyectos", "proyectos"],
        ["Presupuestos", "presupuestos"],
        ["Facturación", "facturacion"],
        ["Soporte", "soporte"],
      ].map(([label, id]) => (
        <button
          key={id}
          type="button"
          onClick={() => {
            document
              .getElementById(id)
              ?.scrollIntoView({ behavior: "smooth" });

            setIsOpen(false);
          }}
          className={`block w-full text-left py-2 text-[15px] font-medium ${
            isScrolled
              ? "text-[#102A66]/80 hover:text-[#102A66]"
              : "text-white/80 hover:text-white"
          }`}
        >
          {label}
        </button>
      ))}

      {/* Área principal */}
      <button
        type="button"
        onClick={() => {
          setLocation("/");
          setIsOpen(false);
        }}
        className={`w-full rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 font-semibold ${
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
          HERO
          ======================================================== */}

      <section className="bg-[#102A66] pt-[70px] overflow-hidden">

        <div className="container mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12 xl:px-16 py-8 md:py-10">

          <div className="flex items-center justify-between gap-10">

            {/* Texto */}
            <div className="min-w-0">

              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/55">
                Guía del Área de Cliente
              </p>

              <h1 className="mt-3 text-[40px] md:text-[44px] lg:text-[47px] font-bold text-white leading-[1.25]">
                Todo lo que ocurre con tu proyecto, en un solo lugar
              </h1>

              <p className="mt-7 text-[17px] md:text-[18px] text-white/85 leading-[1.5] max-w-[650px]">
                Te explicamos qué encontrarás en tu Área de Cliente, cómo
                evolucionan tus proyectos y qué hacer cuando recibes un
                presupuesto, una factura o necesitas contactar con Modira.
              </p>

            </div>

            {/* Visual dinámico */}
            <div className="hidden md:flex relative w-[280px] h-[190px] shrink-0 items-center justify-center mr-10 lg:mr-16">

              {/* Anillos */}
              <div className="absolute w-[150px] h-[150px] rounded-full border border-white/[0.10]" />

              <div className="absolute w-[115px] h-[115px] rounded-full border border-white/[0.13]" />

              <div className="absolute w-[180px] h-[180px] rounded-full border border-dashed border-white/[0.10] animate-[rotateGuide_20s_linear_infinite]" />

              {/* Conexiones */}
              <svg
                className="absolute inset-0 h-full w-full overflow-visible"
                viewBox="0 0 280 190"
                fill="none"
              >

                <path
                  d="M140 95 C140 65 140 43 140 20"
                  stroke="rgba(255,255,255,0.30)"
                  strokeWidth="1.3"
                />

                <path
                  d="M154 84 C177 67 201 53 238 52"
                  stroke="rgba(255,255,255,0.30)"
                  strokeWidth="1.3"
                />

                <path
                  d="M154 106 C178 123 202 137 238 138"
                  stroke="rgba(255,255,255,0.30)"
                  strokeWidth="1.3"
                />

                <path
                  d="M126 84 C102 67 78 53 42 52"
                  stroke="rgba(255,255,255,0.30)"
                  strokeWidth="1.3"
                />

                <path
                  d="M126 106 C102 123 78 137 42 138"
                  stroke="rgba(255,255,255,0.30)"
                  strokeWidth="1.3"
                />

                <circle r="2" fill="rgba(255,255,255,0.9)">
                  <animateMotion
                    dur="2.8s"
                    repeatCount="indefinite"
                    path="M140 95 C140 65 140 43 140 20"
                  />
                </circle>

                <circle r="1.7" fill="rgba(255,255,255,0.85)">
                  <animateMotion
                    dur="3.2s"
                    begin="0.8s"
                    repeatCount="indefinite"
                    path="M154 84 C177 67 201 53 238 52"
                  />
                </circle>

                <circle r="1.7" fill="rgba(255,255,255,0.85)">
                  <animateMotion
                    dur="3.4s"
                    begin="1.2s"
                    repeatCount="indefinite"
                    path="M154 106 C178 123 202 137 238 138"
                  />
                </circle>

                <circle r="1.7" fill="rgba(255,255,255,0.85)">
                  <animateMotion
                    dur="3.3s"
                    begin="0.4s"
                    repeatCount="indefinite"
                    path="M126 84 C102 67 78 53 42 52"
                  />
                </circle>

                <circle r="1.7" fill="rgba(255,255,255,0.85)">
                  <animateMotion
                    dur="3.5s"
                    begin="1.4s"
                    repeatCount="indefinite"
                    path="M126 106 C102 123 78 137 42 138"
                  />
                </circle>

              </svg>

              {/* Núcleo */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">

                <div className="absolute -inset-4 rounded-full border border-white/[0.10] guide-pulse" />

                <div className="relative flex h-[62px] w-[62px] items-center justify-center rounded-full border border-white/25 bg-[#21489A]/80 backdrop-blur-md shadow-[0_0_30px_rgba(255,255,255,0.10)]">

                  <LayoutDashboard className="h-6 w-6 text-white/90" />

                </div>

              </div>

              {/* Nodo superior */}
              <div className="absolute top-[4px] left-1/2 -translate-x-1/2">
                <FlowNode icon={FileText} />
              </div>

              {/* Nodo derecha */}
              <div className="absolute right-[7px] top-[35px]">
                <FlowNode icon={CreditCard} />
              </div>

              {/* Nodo derecha inferior */}
              <div className="absolute right-[7px] bottom-[35px]">
                <FlowNode icon={LifeBuoy} />
              </div>

              {/* Nodo izquierda */}
              <div className="absolute left-[7px] top-[35px]">
                <FlowNode icon={ClipboardList} />
              </div>

              {/* Nodo izquierda inferior */}
              <div className="absolute left-[7px] bottom-[35px]">
                <FlowNode icon={ShieldCheck} />
              </div>

            </div>
          </div>
        </div>

        <style>{`
          @keyframes rotateGuide {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }
        `}</style>

      </section>

      <main>

        {/* ========================================================
            INTRO
            ======================================================== */}

        <section
          id="como-funciona"
          className="relative bg-white py-14 md:py-20 before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-[#F4F6F9] before:to-white"
        >
          <div className="container mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">

            <div className="mx-auto max-w-4xl text-center">

              <p className="scroll-reveal-item text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                Una guía sencilla
              </p>

              <h2 className="scroll-reveal-item mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                ¿Qué encontrarás en tu Área de Cliente?
              </h2>

              <p className="scroll-reveal-item mt-5 text-base leading-relaxed text-[#52627A] md:text-lg">
                Tu Área de Cliente reúne en un único espacio la información
                relacionada con tus proyectos, presupuestos, facturas y
                solicitudes de soporte. De esta forma puedes consultar qué
                está ocurriendo y qué acción necesitas realizar en cada
                momento.
              </p>

            </div>

            <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-4">

              {[
                {
                  icon: Zap,
                  title: "Proyectos",
                  text: "Consulta tus proyectos y sigue su evolución mediante sus diferentes estados.",
                  id: "proyectos",
                },
                {
                  icon: FileText,
                  title: "Presupuestos",
                  text: "Consulta tus propuestas comerciales, revisa sus detalles y decide si aceptarlas.",
                  id: "presupuestos",
                },
                {
                  icon: CreditCard,
                  title: "Facturación",
                  text: "Consulta tus facturas, revisa su estado, accede a sus documentos y realiza el pago.",
                  id: "facturacion",
                },
                {
                  icon: LifeBuoy,
                  title: "Soporte",
                  text: "Abre tickets y realiza el seguimiento de las incidencias o consultas.",
                  id: "soporte",
                },
              ].map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() =>
                    document
                      .getElementById(item.id)
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="scroll-reveal-item group rounded-2xl border border-[#E8ECF2] bg-[#F8FAFC] p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#173B8F]/30 hover:shadow-md"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F] transition group-hover:bg-[#173B8F] group-hover:text-white">
                    <item.icon className="h-6 w-6" />
                  </div>

                  <h3 className="text-xl font-bold text-[#102A66]">
                    {item.title}
                  </h3>

                  <p className="mt-2 leading-relaxed text-[#52627A]">
                    {item.text}
                  </p>

                  <span className="mt-5 inline-flex items-center text-sm font-semibold text-[#173B8F]">
                    Saber más
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>
              ))}

            </div>

          </div>
        </section>

        {/* ========================================================
            PROYECTOS
            ======================================================== */}

        <section
          id="proyectos"
          className="relative bg-[#F4F6F9] py-16 md:py-24 before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-white before:to-[#F4F6F9]"
        >
          <div className="container mx-auto px-4">

            <div className="mx-auto max-w-4xl text-center">

              <p className="scroll-reveal-item text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                Mis proyectos
              </p>

              <h2 className="scroll-reveal-item mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                Sigue tu proyecto desde que nace hasta que termina
              </h2>

              <p className="scroll-reveal-item mt-4 text-[#52627A] md:text-lg">
                El estado del proyecto te permite saber en qué punto se
                encuentra el trabajo y qué está ocurriendo en cada etapa.
              </p>

            </div>

            {/* FLUJO */}
            <div className="scroll-reveal-item mx-auto mt-14 max-w-6xl rounded-3xl border border-[#E1E7EF] bg-white p-6 shadow-sm md:p-10">

              {/* Línea de estados */}
              <div className="relative">

                <div className="absolute left-0 right-0 top-[21px] hidden h-0.5 bg-[#E1E7EF] md:block" />

                <div
                  className="absolute left-0 top-[21px] hidden h-0.5 bg-[#173B8F] transition-all duration-500 md:block"
                  style={{
                    width: `${(activeProjectStep / (projectSteps.length - 1)) * 100}%`,
                  }}
                />

                <div className="relative grid gap-5 md:grid-cols-6">

                  {projectSteps.map((step, index) => {
                    const classes = getStatusClasses(step.color);

                    const Icon = step.icon;

                    return (
                      <button
                        key={step.status + index}
                        type="button"
                        onClick={() => setActiveProjectStep(index)}
                        className="group flex flex-col items-center text-center"
                      >
                        <div
                          className={`relative z-10 flex h-[44px] w-[44px] items-center justify-center rounded-full border-4 border-white shadow-sm transition-all duration-300 ${
                            index <= activeProjectStep
                              ? "bg-[#173B8F] text-white"
                              : `${classes.icon}`
                          } ${
                            index === activeProjectStep
                              ? "scale-110 shadow-md"
                              : ""
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <span
                          className={`mt-3 text-xs font-semibold transition-colors ${
                            index === activeProjectStep
                              ? "text-[#102A66]"
                              : "text-[#8793A5]"
                          }`}
                        >
                          {step.status}
                        </span>
                      </button>
                    );
                  })}

                </div>
              </div>

              {/* Detalle */}
              <div className="mt-10 grid gap-8 md:grid-cols-[180px_1fr]">

                <div className="flex justify-center md:justify-start">

                  <div
                    className={`flex h-32 w-32 flex-col items-center justify-center rounded-3xl ${
                      getStatusClasses(projectSteps[activeProjectStep].color)
                        .icon
                    }`}
                  >
                    {(() => {
                      const Icon = projectSteps[activeProjectStep].icon;

                      return <Icon className="h-9 w-9" />;
                    })()}

                    <span className="mt-2 text-sm font-bold">
                      {projectSteps[activeProjectStep].status}
                    </span>
                  </div>

                </div>

                <div>

                  <p className="text-sm font-semibold text-[#173B8F]">
                    Estado {activeProjectStep + 1} de {projectSteps.length}
                  </p>

                  <h3 className="mt-1 text-2xl font-bold text-[#102A66] md:text-3xl">
                    {projectSteps[activeProjectStep].title}
                  </h3>

                  <p className="mt-4 leading-relaxed text-[#52627A]">
                    {projectSteps[activeProjectStep].description}
                  </p>

                  <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#E1E7EF] bg-[#F8FAFC] p-4">

                    <HelpCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#173B8F]" />

                    <p className="text-sm leading-relaxed text-[#52627A]">
                      <strong className="text-[#102A66]">
                        ¿Qué tienes que hacer?
                      </strong>{" "}
                      {projectSteps[activeProjectStep].action}
                    </p>

                  </div>

                </div>

              </div>

              {/* Navegación */}
              <div className="mt-8 flex items-center justify-between border-t border-[#E8ECF2] pt-6">

                <button
                  type="button"
                  disabled={activeProjectStep === 0}
                  onClick={() =>
                    setActiveProjectStep((current) =>
                      Math.max(current - 1, 0)
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E1E7EF] px-4 py-2.5 text-sm font-semibold text-[#52627A] transition hover:bg-[#F4F6F9] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </button>

                <span className="text-xs font-medium text-[#8793A5]">
                  Pulsa cada estado para conocerlo
                </span>

                <button
                  type="button"
                  disabled={activeProjectStep === projectSteps.length - 1}
                  onClick={() =>
                    setActiveProjectStep((current) =>
                      Math.min(current + 1, projectSteps.length - 1)
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-[#173B8F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#102A66] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </button>

              </div>

            </div>

            {/* Explicación creación */}
            <div className="mx-auto mt-8 grid max-w-6xl gap-6 md:grid-cols-2">

              <div className="scroll-reveal-item rounded-2xl border border-[#DCE4EF] bg-white p-7">

                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F]">
                  <UserRound className="h-5 w-5" />
                </div>

                <h3 className="text-xl font-bold text-[#102A66]">
                  Si tú creas el proyecto
                </h3>

                <p className="mt-3 leading-relaxed text-[#52627A]">
                  Puedes crear un proyecto desde tu Área de Cliente
                  proporcionando una descripción detallada de lo que
                  necesitas. Nuestro equipo revisará la información y podrá
                  concretar o mejorar la descripción para reflejar mejor el
                  alcance acordado.
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#173B8F]">
                  Crear proyecto
                  <ArrowRight className="h-4 w-4" />
                  Revisión
                  <ArrowRight className="h-4 w-4" />
                  Presupuesto
                </div>

              </div>

              <div className="scroll-reveal-item rounded-2xl border border-[#DCE4EF] bg-white p-7">

                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F]">
                  <ClipboardList className="h-5 w-5" />
                </div>

                <h3 className="text-xl font-bold text-[#102A66]">
                  Si empezamos con una auditoría
                </h3>

                <p className="mt-3 leading-relaxed text-[#52627A]">
                  Primero analizamos contigo tus necesidades y procesos.
                  Cuando el alcance está suficientemente definido, nuestro
                  equipo crea el proyecto en el Área de Cliente para que
                  puedas consultarlo y seguir su evolución.
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#173B8F]">
                  Auditoría
                  <ArrowRight className="h-4 w-4" />
                  Análisis
                  <ArrowRight className="h-4 w-4" />
                  Proyecto
                </div>

              </div>

            </div>
            {/* DETALLE DEL PROYECTO */}
            <div className="scroll-reveal-item mx-auto mt-8 max-w-6xl rounded-3xl border border-[#DCE4EF] bg-white p-7 shadow-sm md:p-9">

              <div className="flex flex-col gap-7 md:flex-row">

                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[#173B8F]/10 text-[#173B8F]">
                  <Eye className="h-7 w-7" />
                </div>

                <div className="flex-1">

                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                    Vista del proyecto
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-[#102A66]">
                    Al entrar en un proyecto, tienes toda su información a mano
                  </h3>

                  <p className="mt-3 max-w-4xl leading-relaxed text-[#52627A]">
                    Desde <em className="text-[#102A66]">Mis Proyectos</em>, verás toda la información básica de tus proyectos. 
                    Puedes abrir cualquier proyecto mediante el botón<em className="text-[#102A66]"> Ver</em>, ahí encontrarás la información necesaria para
                    consultar su evolución y mantenerte al día durante todo el trabajo:
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                    <div className="rounded-xl border border-[#E1E7EF] bg-[#F8FAFC] p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#102A66]">
                        <FileText className="h-4 w-4 text-[#173B8F]" />
                        Información
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[#52627A]">
                        Consulta la descripción, estado y fechas de inicio y finalización.
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#E1E7EF] bg-[#F8FAFC] p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#102A66]">
                        <Download className="h-4 w-4 text-[#173B8F]" />
                        Documentos
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[#52627A]">
                        Accede a los documentos PDF asociados al proyecto y descárgalos cuando estén disponibles.
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#E1E7EF] bg-[#F8FAFC] p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#102A66]">
                        <ClipboardList className="h-4 w-4 text-[#173B8F]" />
                        Solicitudes de cambio
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[#52627A]">
                        Realiza solicitudes de cambio y consulta si tienes solicitudes abiertas y revisa su estado.
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#E1E7EF] bg-[#F8FAFC] p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#102A66]">
                        <MessageSquare className="h-4 w-4 text-[#173B8F]" />
                        Observaciones
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[#52627A]">
                        Consulta las observaciones que el trabajador haya añadido sobre tus solicitudes.
                      </p>
                    </div>

                  </div>

                  {/* <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#DCE4EF] bg-white p-4">

                    <HelpCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#173B8F]" />

                    <p className="text-sm leading-relaxed text-[#52627A]">
                      <strong className="text-[#102A66]">
                        Consejo:
                      </strong>{" "}
                      entra en la vista de detalle del proyecto cuando quieras
                      consultar su información, revisar documentación o comprobar
                      si existe alguna actualización o solicitud relacionada.
                    </p>

                  </div> */}

                </div>

              </div>

            </div>
          </div>
        </section>

        {/* ========================================================
            PRESUPUESTOS
            ======================================================== */}

        <section
          id="presupuestos"
          className="relative bg-white py-16 md:py-24 before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-[#F4F6F9] before:to-white"
        >
          <div className="container mx-auto px-4">

            <div className="mx-auto max-w-4xl text-center">

              <p className="scroll-reveal-item text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                Presupuestos
              </p>

              <h2 className="scroll-reveal-item mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                Cuando recibas un presupuesto, todo estará preparado para que puedas revisarlo
              </h2>

              <p className="scroll-reveal-item mt-4 text-[#52627A] md:text-lg">
                El apartado de Presupuestos te permite saber qué propuestas
                están pendientes y cuáles ya han sido aceptadas.
              </p>

            </div>

            {/* Tarjetas resumen */}
            <div className="scroll-reveal-item mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">

              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6">

                <div className="flex items-center gap-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
                    <Clock3 className="h-6 w-6" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-yellow-700">
                      Pendientes
                    </p>

                    <p className="text-2xl font-bold text-[#102A66]">
                      Presupuestos por revisar
                    </p>
                  </div>

                </div>

              </div>

              <div className="rounded-2xl border border-green-200 bg-green-50 p-6">

                <div className="flex items-center gap-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-700">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-green-700">
                      Aceptados
                    </p>

                    <p className="text-2xl font-bold text-[#102A66]">
                      Propuestas aprobadas
                    </p>
                  </div>

                </div>

              </div>

            </div>

            {/* Simulación tabla */}
            <div className="scroll-reveal-item mx-auto mt-8 max-w-6xl overflow-hidden rounded-3xl border border-[#E1E7EF] bg-white shadow-sm">

              <div className="border-b border-[#E8ECF2] bg-[#F8FAFC] px-6 py-5">

                <div className="flex items-center justify-between">

                  <div>
                    <h3 className="font-bold text-[#102A66]">
                      Tus presupuestos
                    </h3>

                    <p className="mt-1 text-sm text-[#8793A5]">
                      Ejemplo de la información que encontrarás
                    </p>
                  </div>

                  <FileText className="h-6 w-6 text-[#173B8F]" />

                </div>

              </div>

              <div className="hidden overflow-x-auto md:block">

                <table className="w-full text-left text-sm">

                  <thead className="border-b border-[#E8ECF2] bg-white">

                    <tr>
                      <th className="px-5 py-4 font-semibold text-[#52627A]">
                        Nº presupuesto
                      </th>

                      <th className="px-5 py-4 font-semibold text-[#52627A]">
                        Proyecto
                      </th>

                      <th className="px-5 py-4 font-semibold text-[#52627A]">
                        Emisión
                      </th>

                      <th className="px-5 py-4 font-semibold text-[#52627A]">
                        Validez
                      </th>

                      <th className="px-5 py-4 font-semibold text-[#52627A]">
                        Importe
                      </th>

                      <th className="px-5 py-4 font-semibold text-[#52627A]">
                        Estado
                      </th>

                      <th className="px-5 py-4 font-semibold text-[#52627A]">
                        Acciones
                      </th>
                    </tr>

                  </thead>

                  <tbody>

                    <tr className="border-b border-[#E8ECF2]">

                      <td className="px-5 py-5 font-semibold text-[#102A66]">
                        PRES-26-AAAA
                      </td>

                      <td className="px-5 py-5 text-[#52627A]">
                        Automatización comercial
                      </td>

                      <td className="px-5 py-5 text-[#52627A]">
                        20/08/2026
                      </td>

                      <td className="px-5 py-5 text-[#52627A]">
                        30/08/2026
                      </td>

                      <td className="px-5 py-5 font-semibold text-[#102A66]">
                        1.250 €
                      </td>

                      <td className="px-5 py-5">

                        <span className="inline-flex rounded-full border border-yellow-200 bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                          Pendiente
                        </span>

                      </td>

                      <td className="px-5 py-5">

                        <div className="flex items-center gap-2">

                          <button
                            type="button"
                            onClick={() => setActiveQuotationStep(2)}
                            className="rounded-lg border border-[#E1E7EF] p-2 text-[#173B8F] transition hover:bg-[#F4F6F9]"
                            title="Ver presupuesto"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveQuotationStep(2)}
                            className="rounded-lg border border-[#E1E7EF] p-2 text-[#173B8F] transition hover:bg-[#F4F6F9]"
                            title="Descargar PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                        </div>

                      </td>

                    </tr>

                  </tbody>

                </table>

              </div>

              {/* Móvil */}
              <div className="p-5 md:hidden">

                <div className="rounded-2xl border border-[#E1E7EF] p-5">

                  <div className="flex items-start justify-between gap-4">

                    <div>
                      <p className="text-xs font-semibold text-[#8793A5]">
                        Nº presupuesto
                      </p>

                      <p className="mt-1 font-bold text-[#102A66]">
                        PRES-26-AAAA
                      </p>
                    </div>

                    <span className="rounded-full border border-yellow-200 bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                      Pendiente
                    </span>

                  </div>

                  <p className="mt-4 text-sm font-medium text-[#102A66]">
                    Automatización comercial
                  </p>

                  <p className="mt-1 text-sm text-[#52627A]">
                    Importe: <strong>1.250 €</strong>
                  </p>

                  <div className="mt-5 flex gap-2">

                    <button
                      type="button"
                      onClick={() => setActiveQuotationStep(2)}
                      className="flex-1 rounded-lg border border-[#E1E7EF] py-2 text-sm font-semibold text-[#173B8F]"
                    >
                      Ver
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveQuotationStep(2)}
                      className="flex-1 rounded-lg border border-[#E1E7EF] py-2 text-sm font-semibold text-[#173B8F]"
                    >
                      PDF
                    </button>

                  </div>

                </div>

              </div>

            </div>

            {/* Flujo interactivo */}
            <div className="scroll-reveal-item mx-auto mt-10 max-w-5xl rounded-3xl bg-gradient-to-r from-[#102A66] to-[#173B8F] p-7 text-white md:p-10">

              <div className="grid gap-8 md:grid-cols-[1fr_260px] md:items-center">

                <div>

                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/55">
                    Qué ocurre después
                  </p>

                  <h3 className="mt-2 text-2xl font-bold md:text-3xl">
                    {quotationSteps[activeQuotationStep].title}
                  </h3>

                  <p className="mt-4 leading-relaxed text-white/75">
                    {quotationSteps[activeQuotationStep].description}
                  </p>

                  <div className="mt-6 flex gap-2">

                    {quotationSteps.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        aria-label={`Paso ${index + 1}`}
                        onClick={() => setActiveQuotationStep(index)}
                        className={`h-2 rounded-full transition-all ${
                          index === activeQuotationStep
                            ? "w-8 bg-white"
                            : "w-2 bg-white/30"
                        }`}
                      />
                    ))}

                  </div>

                </div>

                <div className="flex justify-center">

                  <div className="guide-float flex h-32 w-32 flex-col items-center justify-center rounded-3xl border border-white/15 bg-white/10 backdrop-blur-sm">

                    {(() => {
                      const Icon = quotationSteps[activeQuotationStep].icon;

                      return <Icon className="h-9 w-9" />;
                    })()}

                    <span className="mt-3 text-xs font-semibold text-white/75">
                      PASO {quotationSteps[activeQuotationStep].number}
                    </span>

                  </div>

                </div>

              </div>

              <div className="mt-8 flex justify-between border-t border-white/10 pt-6">

                <button
                  type="button"
                  disabled={activeQuotationStep === 0}
                  onClick={() =>
                    setActiveQuotationStep((current) =>
                      Math.max(current - 1, 0)
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/15 disabled:opacity-30"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </button>

                <button
                  type="button"
                  disabled={activeQuotationStep === quotationSteps.length - 1}
                  onClick={() =>
                    setActiveQuotationStep((current) =>
                      Math.min(current + 1, quotationSteps.length - 1)
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#102A66] transition hover:bg-white/90 disabled:opacity-30"
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </button>

              </div>

            </div>

            {/* Vista previa */}
            <div className="mx-auto mt-8 max-w-5xl">

              <div className="scroll-reveal-item rounded-2xl border border-[#DCE4EF] bg-[#F8FAFC] p-6 md:p-7">

                <div className="flex flex-col gap-5 md:flex-row md:items-center">

                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F]">
                    <Eye className="h-6 w-6" />
                  </div>

                  <div className="flex-1">

                    <h3 className="font-bold text-[#102A66]">
                      ¿Qué puedes hacer desde la vista del presupuesto?
                    </h3>

                    <p className="mt-1 text-sm leading-relaxed text-[#52627A]">
                      La vista de detalle te permite revisar la propuesta
                      antes de tomar una decisión. Desde ella puedes
                      consultar la información disponible, acceder al PDF,
                      descargarlo y, mientras esté pendiente, aceptar o
                      rechazar el presupuesto.
                    </p>

                  </div>

                  <div className="flex flex-wrap gap-2">

                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E1E7EF] bg-white px-3 py-2 text-xs font-semibold text-[#52627A]">
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E1E7EF] bg-white px-3 py-2 text-xs font-semibold text-[#52627A]">
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#173B8F] px-3 py-2 text-xs font-semibold text-white">
                      <Check className="h-3.5 w-3.5" />
                      Aceptar
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600">
                      <X className="h-3.5 w-3.5" />
                      Rechazar
                    </span>

                  </div>

                </div>

              </div>

            </div>

          </div>
        </section>

        {/* ========================================================
            FACTURACIÓN
            ======================================================== */}

        <section
          id="facturacion"
          className="relative bg-[#F4F6F9] py-16 md:py-24 before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-white before:to-[#F4F6F9]"
        >
          <div className="container mx-auto px-4">

            <div className="mx-auto max-w-4xl text-center">

              <p className="scroll-reveal-item text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                Facturación
              </p>

              <h2 className="scroll-reveal-item mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                Consulta y paga tus facturas desde el mismo espacio
              </h2>

              <p className="scroll-reveal-item mt-4 text-[#52627A] md:text-lg">
                Cuando tengas facturas disponibles podrás consultar su estado,
                revisar la documentación y realizar el pago cuando corresponda.
              </p>

            </div>

            {/* Resumen */}
            <div className="scroll-reveal-item mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">

              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6">

                <div className="flex items-center gap-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
                    <Clock3 className="h-6 w-6" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-yellow-700">
                      Pendientes
                    </p>

                    <p className="text-2xl font-bold text-[#102A66]">
                      Facturas por pagar
                    </p>
                  </div>

                </div>

              </div>

              <div className="rounded-2xl border border-green-200 bg-green-50 p-6">

                <div className="flex items-center gap-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-700">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-green-700">
                      Pagadas
                    </p>

                    <p className="text-2xl font-bold text-[#102A66]">
                      Facturas abonadas
                    </p>
                  </div>

                </div>

              </div>

            </div>

            {/* Tabla */}
            <div className="scroll-reveal-item mx-auto mt-8 max-w-6xl overflow-hidden rounded-3xl border border-[#E1E7EF] bg-white shadow-sm">

              <div className="border-b border-[#E8ECF2] bg-[#F8FAFC] px-6 py-5">

                <div className="flex items-center justify-between">

                  <div>
                    <h3 className="font-bold text-[#102A66]">
                      Tus facturas
                    </h3>

                    <p className="mt-1 text-sm text-[#8793A5]">
                      Ejemplo de la información disponible
                    </p>
                  </div>

                  <Receipt className="h-6 w-6 text-[#173B8F]" />

                </div>

              </div>

              <div className="hidden overflow-x-auto md:block">

                <table className="w-full text-left text-sm">

                  <thead className="border-b border-[#E8ECF2]">

                    <tr>
                      <th className="px-5 py-4 font-semibold text-[#52627A]">
                        Nº factura
                      </th>

                      <th className="px-5 py-4 font-semibold text-[#52627A]">
                        Proyecto
                      </th>

                      <th className="px-5 py-4 font-semibold text-[#52627A]">
                        Emisión
                      </th>

                      <th className="px-5 py-4 font-semibold text-[#52627A]">
                        Vencimiento
                      </th>

                      <th className="px-5 py-4 font-semibold text-[#52627A]">
                        Importe
                      </th>

                      <th className="px-5 py-4 font-semibold text-[#52627A]">
                        Estado
                      </th>

                      <th className="px-5 py-4 font-semibold text-[#52627A]">
                        Acciones
                      </th>
                    </tr>

                  </thead>

                  <tbody>

                    <tr className="border-b border-[#E8ECF2]">

                      <td className="px-5 py-5 font-semibold text-[#102A66]">
                        MODIRA-26-AAAA
                      </td>

                      <td className="px-5 py-5 text-[#52627A]">
                        Automatización comercial
                      </td>

                      <td className="px-5 py-5 text-[#52627A]">
                        01/09/2026
                      </td>

                      <td className="px-5 py-5 text-[#52627A]">
                        15/09/2026
                      </td>

                      <td className="px-5 py-5 font-semibold text-[#102A66]">
                        1.512,50 €
                      </td>

                      <td className="px-5 py-5">

                        <span className="inline-flex rounded-full border border-yellow-200 bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                          Pendiente
                        </span>

                      </td>

                      <td className="px-5 py-5">

                        <div className="flex items-center gap-2">

                          <button
                            type="button"
                            onClick={() => setActiveInvoiceStep(2)}
                            className="rounded-lg border border-[#E1E7EF] p-2 text-[#173B8F] transition hover:bg-[#F4F6F9]"
                            title="Ver factura"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveInvoiceStep(2)}
                            className="rounded-lg border border-[#E1E7EF] p-2 text-[#173B8F] transition hover:bg-[#F4F6F9]"
                            title="Descargar PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveInvoiceStep(3)}
                            className="rounded-lg bg-[#173B8F] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#102A66]"
                          >
                            Pagar
                          </button>

                        </div>

                      </td>

                    </tr>

                  </tbody>

                </table>

              </div>

              {/* Móvil */}
              <div className="p-5 md:hidden">

                <div className="rounded-2xl border border-[#E1E7EF] p-5">

                  <div className="flex items-start justify-between gap-4">

                    <div>
                      <p className="text-xs font-semibold text-[#8793A5]">
                        Nº factura
                      </p>

                      <p className="mt-1 break-all font-bold text-[#102A66]">
                        MODIRA-26-AAAA
                      </p>
                    </div>

                    <span className="rounded-full border border-yellow-200 bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                      Pendiente
                    </span>

                  </div>

                  <p className="mt-4 text-sm text-[#52627A]">
                    Automatización comercial
                  </p>

                  <p className="mt-1 text-sm text-[#52627A]">
                    Importe: <strong>1.512,50 €</strong>
                  </p>

                  <div className="mt-5 grid grid-cols-3 gap-2">

                    <button
                      type="button"
                      onClick={() => setActiveInvoiceStep(2)}
                      className="rounded-lg border border-[#E1E7EF] py-2 text-sm font-semibold text-[#173B8F]"
                    >
                      Ver
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveInvoiceStep(2)}
                      className="rounded-lg border border-[#E1E7EF] py-2 text-sm font-semibold text-[#173B8F]"
                    >
                      PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveInvoiceStep(3)}
                      className="rounded-lg bg-[#173B8F] py-2 text-sm font-semibold text-white"
                    >
                      Pagar
                    </button>

                  </div>

                </div>

              </div>

            </div>

            {/* Flujo pago */}
            <div className="scroll-reveal-item mx-auto mt-10 max-w-5xl rounded-3xl border border-[#DCE4EF] bg-white p-7 md:p-10">

              <div className="grid gap-8 md:grid-cols-[1fr_220px] md:items-center">

                <div>

                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                    Flujo de facturación
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-[#102A66] md:text-3xl">
                    {invoiceSteps[activeInvoiceStep].title}
                  </h3>

                  <p className="mt-4 leading-relaxed text-[#52627A]">
                    {invoiceSteps[activeInvoiceStep].description}
                  </p>

                  <div className="mt-6 flex gap-2">

                    {invoiceSteps.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setActiveInvoiceStep(index)}
                        className={`h-2 rounded-full transition-all ${
                          index === activeInvoiceStep
                            ? "w-8 bg-[#173B8F]"
                            : "w-2 bg-[#DCE4EF]"
                        }`}
                      />
                    ))}

                  </div>

                </div>

                <div className="flex justify-center">

                  <div className="guide-float flex h-32 w-32 flex-col items-center justify-center rounded-3xl bg-[#173B8F]/10 text-[#173B8F]">

                    {(() => {
                      const Icon = invoiceSteps[activeInvoiceStep].icon;

                      return <Icon className="h-9 w-9" />;
                    })()}

                    <span className="mt-3 text-xs font-semibold">
                      PASO {invoiceSteps[activeInvoiceStep].number}
                    </span>

                  </div>

                </div>

              </div>

              <div className="mt-8 flex justify-between border-t border-[#E8ECF2] pt-6">

                <button
                  type="button"
                  disabled={activeInvoiceStep === 0}
                  onClick={() =>
                    setActiveInvoiceStep((current) =>
                      Math.max(current - 1, 0)
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E1E7EF] px-4 py-2.5 text-sm font-semibold text-[#52627A] disabled:opacity-30"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </button>

                <button
                  type="button"
                  disabled={activeInvoiceStep === invoiceSteps.length - 1}
                  onClick={() =>
                    setActiveInvoiceStep((current) =>
                      Math.min(current + 1, invoiceSteps.length - 1)
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-[#173B8F] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-30"
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </button>

              </div>

            </div>

            {/* Seguridad pago */}
            <div className="mx-auto mt-8 max-w-5xl">

              <div className="scroll-reveal-item rounded-2xl border border-[#DCE4EF] bg-white p-6 md:p-7">

                <div className="flex flex-col gap-5 md:flex-row md:items-center">

                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F]">
                    <Lock className="h-6 w-6" />
                  </div>

                  <div>

                    <h3 className="font-bold text-[#102A66]">
                      Pago gestionado mediante una pasarela segura
                    </h3>

                    <p className="mt-1 text-sm leading-relaxed text-[#52627A]">
                      Al pulsar Pagar, el sistema inicia el proceso de pago
                      utilizando la integración segura configurada para
                      Modira. El importe real de la factura se obtiene desde
                      el sistema y la confirmación definitiva del pago se
                      realiza mediante la infraestructura de pagos.
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>
        </section>

        {/* ========================================================
            SOPORTE
            ======================================================== */}

        <section
          id="soporte"
          className="relative bg-white py-16 md:py-24 before:absolute before:inset-x-0 before:top-0 before:h-8 before:bg-gradient-to-b before:from-[#F4F6F9] before:to-white"
        >
          <div className="container mx-auto px-4">

            <div className="mx-auto max-w-4xl text-center">

              <p className="scroll-reveal-item text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                Soporte
              </p>

              <h2 className="scroll-reveal-item mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                Si tienes un problema, puedes abrir un ticket
              </h2>

              <p className="scroll-reveal-item mt-4 text-[#52627A] md:text-lg">
                El Área de Cliente incluye un apartado de soporte para que
                puedas comunicar incidencias relacionadas con la plataforma y
                realizar el seguimiento de tus solicitudes.
              </p>

            </div>

            <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">

              {[
                {
                  icon: MessageSquare,
                  number: "01",
                  title: "Describe el problema",
                  text: "Indica qué ocurre y aporta todos los detalles que puedan ayudarnos a entender la incidencia.",
                },
                {
                  icon: Clock3,
                  number: "02",
                  title: "Seguimos tu solicitud",
                  text: "Puedes consultar tus tickets y comprobar el estado de cada solicitud.",
                },
                {
                  icon: CheckCircle2,
                  number: "03",
                  title: "Resolvemos y cerramos",
                  text: "Nuestro equipo trabaja sobre la solicitud hasta que el problema queda solucionado o atendido.",
                },
              ].map((item) => (
                <div
                  key={item.number}
                  className="scroll-reveal-item rounded-2xl border border-[#E1E7EF] bg-[#F8FAFC] p-7"
                >

                  <div className="flex items-center justify-between">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F]">
                      <item.icon className="h-5 w-5" />
                    </div>

                    <span className="text-sm font-bold text-[#173B8F]/40">
                      {item.number}
                    </span>

                  </div>

                  <h3 className="mt-6 text-xl font-bold text-[#102A66]">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-[#52627A]">
                    {item.text}
                  </p>

                </div>
              ))}

            </div>

            {/* Ticket visual */}
            <div className="scroll-reveal-item mx-auto mt-8 max-w-5xl rounded-3xl border border-[#E1E7EF] bg-white p-7 shadow-sm md:p-9">

              <div className="flex flex-col gap-7 md:flex-row">

                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[#173B8F]/10 text-[#173B8F]">
                  <LifeBuoy className="h-7 w-7" />
                </div>

                <div className="flex-1">

                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8793A5]">
                        Ejemplo de ticket
                      </p>

                      <h3 className="mt-1 text-xl font-bold text-[#102A66]">
                        Problema al consultar un proyecto
                      </h3>
                    </div>

                    <span className="w-fit rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      En progreso
                    </span>

                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-[#52627A]">
                    "Al acceder a mi proyecto aparece un mensaje de error y
                    no puedo consultar la información."
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">

                    <span className="rounded-lg bg-[#F4F6F9] px-3 py-2 text-xs font-medium text-[#52627A]">
                      Prioridad normal
                    </span>

                    <span className="rounded-lg bg-[#F4F6F9] px-3 py-2 text-xs font-medium text-[#52627A]">
                      Creado recientemente
                    </span>

                    <span className="rounded-lg bg-[#F4F6F9] px-3 py-2 text-xs font-medium text-[#52627A]">
                      Seguimiento disponible
                    </span>

                  </div>

                </div>

              </div>

            </div>

          </div>
        </section>

        {/* ========================================================
            CONTACTO DIRECTO
            ======================================================== */}

        <section className="relative bg-[#F4F6F9] py-16 md:py-24">

          <div className="container mx-auto px-4">

            <div className="scroll-reveal-item mx-auto max-w-5xl rounded-3xl bg-gradient-to-r from-[#102A66] to-[#173B8F] px-7 py-12 text-white md:px-14 md:py-14">

              <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-center">

                <div>

                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/55">
                    Contacto directo
                  </p>

                  <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                    ¿Necesitas hablar directamente con Modira?
                  </h2>

                  <p className="mt-5 max-w-2xl leading-relaxed text-white/75">
                    Si tienes una pregunta que no puedes resolver desde el
                    Área de Cliente, puedes contactar directamente con
                    nosotros mediante tu aplicación de correo electrónico.
                  </p>

                </div>

                <a
                  href="mailto:info@modira.es"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3.5 font-semibold text-[#102A66] shadow-sm transition hover:bg-white/90"
                >
                  <Mail className="h-4 w-4" />
                  Contactar con Modira
                </a>

              </div>

            </div>

          </div>

        </section>

        {/* ========================================================
            FAQ
            ======================================================== */}

        <section className="relative bg-white py-16 md:py-24">

          <div className="container mx-auto px-4">

            <div className="mx-auto max-w-3xl text-center">

              <p className="scroll-reveal-item text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                Preguntas frecuentes
              </p>

              <h2 className="scroll-reveal-item mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                Las dudas más habituales
              </h2>

              <p className="scroll-reveal-item mt-4 text-[#52627A] md:text-lg">
                Si todavía tienes alguna duda sobre el funcionamiento del
                Área de Cliente, aquí tienes algunas respuestas rápidas.
              </p>

            </div>

            <div className="mx-auto mt-12 max-w-4xl space-y-3">

              {faqItems.map((item, index) => {
                const isActive = openFaq === index;

                return (
                  <div
                    key={item.question}
                    className="scroll-reveal-item overflow-hidden rounded-2xl border border-[#E1E7EF] bg-white"
                  >

                    <button
                      type="button"
                      onClick={() =>
                        setOpenFaq(isActive ? null : index)
                      }
                      className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left"
                    >

                      <span className="font-semibold text-[#102A66]">
                        {item.question}
                      </span>

                      {isActive ? (
                        <ChevronUp className="h-5 w-5 flex-shrink-0 text-[#173B8F]" />
                      ) : (
                        <ChevronDown className="h-5 w-5 flex-shrink-0 text-[#8793A5]" />
                      )}

                    </button>

                    {isActive && (
                      <div className="border-t border-[#E8ECF2] px-6 py-5">

                        <p className="text-sm leading-relaxed text-[#52627A]">
                          {item.answer}
                        </p>

                      </div>
                    )}

                  </div>
                );
              })}

            </div>

          </div>

        </section>

        {/* ========================================================
            CTA FINAL
            ======================================================== */}

        <section className="relative bg-[#F4F6F9] py-16 md:py-24">

          <div className="container mx-auto px-4">

            <div className="scroll-reveal-item mx-auto max-w-4xl text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#173B8F]/10 text-[#173B8F]">
                <LayoutDashboard className="h-7 w-7" />
              </div>

              <h2 className="mt-5 text-3xl font-bold text-[#102A66] md:text-4xl">
                ¿Listo para entrar en tu Área de Cliente?
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-[#52627A] md:text-lg">
                Accede a tus proyectos, presupuestos, facturas y soporte
                desde un único espacio.
              </p>

              <button
                type="button"
                onClick={() => setLocation("/auth")}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#173B8F] px-7 py-3.5 font-semibold text-white shadow-sm transition hover:bg-[#102A66]"
              >
                Acceder al Área de Cliente
                <ArrowRight className="h-4 w-4" />
              </button>

            </div>

          </div>

        </section>

      </main>

      {/* ========================================================
          FOOTER
          ======================================================== */}

      <footer className="bg-[#102A66] py-8 text-white">

        <div className="container mx-auto px-4 text-center text-sm text-white/60">

          <p>
            © {new Date().getFullYear()} Modira. Todos los derechos reservados.
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-4">

            <a
              href="/politica-privacidad"
              className="transition hover:text-white"
            >
              Privacidad
            </a>

            <a
              href="/politica-cookies"
              className="transition hover:text-white"
            >
              Cookies
            </a>

            <a
              href="/terminos"
              className="transition hover:text-white"
            >
              Términos
            </a>

            <a
              href="/aviso-legal"
              className="transition hover:text-white"
            >
              Aviso legal
            </a>

          </div>

        </div>

      </footer>

    </div>
  );
}

/* ================================================================
   COMPONENTES AUXILIARES
   ================================================================ */

function FlowNode({
  icon: Icon,
}: {
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-white/20 bg-white/[0.09] backdrop-blur-sm">
      <Icon className="h-[16px] w-[16px] text-white/85" />
    </div>
  );
}

function BellIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <AlertCircle className={className} />
  );
}

function MenuIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}