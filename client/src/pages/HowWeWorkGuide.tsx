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
  BookOpen,
} from "lucide-react";
import { useLocation } from "wouter";

export default function HowWeWorkGuide() {
  const [, setLocation] = useLocation();

  const processSteps = [
    {
      number: "01",
      title: "Auditoría gratuita",
      subtitle: "Entendemos tu negocio antes de automatizarlo",
      icon: ClipboardCheck,
      description:
        "El primer paso es conocer cómo funciona realmente tu empresa. Analizamos tus procesos, las herramientas que utilizas y las tareas que consumen más tiempo para detectar dónde la automatización puede aportar un mayor valor.",
      points: [
        "Analizamos procesos repetitivos y administrativos.",
        "Detectamos tareas que pueden automatizarse.",
        "Identificamos herramientas y sistemas que ya utilizas.",
        "Priorizamos las oportunidades según su impacto.",
      ],
    },
    {
      number: "02",
      title: "Diseño de la solución",
      subtitle: "Convertimos la necesidad en un flujo personalizado",
      icon: Lightbulb,
      description:
        "Con la información obtenida diseñamos una solución adaptada a tu empresa. No partimos de una plantilla genérica: definimos cómo deben conectarse tus herramientas y qué tareas debe realizar el sistema.",
      points: [
        "Diseñamos el flujo completo del proceso.",
        "Definimos las herramientas y sistemas que intervienen.",
        "Establecemos qué tareas serán automáticas.",
        "Buscamos una solución escalable y preparada para crecer.",
      ],
    },
    {
      number: "03",
      title: "Desarrollo e implantación",
      subtitle: "Construimos, probamos y ponemos en marcha la solución",
      icon: Rocket,
      description:
        "Una vez definido el diseño, desarrollamos la automatización y conectamos los sistemas necesarios. Antes de ponerla en funcionamiento realizamos pruebas para comprobar que el flujo funciona correctamente.",
      points: [
        "Configuramos las integraciones necesarias.",
        "Desarrollamos los flujos de automatización.",
        "Realizamos pruebas y comprobaciones.",
        "Ponemos la solución en funcionamiento.",
      ],
    },
    {
      number: "04",
      title: "Seguimiento y mejora",
      subtitle: "La automatización evoluciona contigo",
      icon: TrendingUp,
      description:
        "Nuestro trabajo no termina cuando la automatización empieza a funcionar. Monitorizamos el sistema y podemos realizar ajustes y mejoras para que continúe adaptándose a las necesidades de tu empresa.",
      points: [
        "Supervisamos el funcionamiento de las automatizaciones.",
        "Detectamos oportunidades de mejora.",
        "Optimizamos los procesos cuando es necesario.",
        "Te acompañamos en la evolución de tus sistemas.",
      ],
    },
  ];

  return (
  <div className="min-h-screen bg-white">
    {/* HEADER */}
<header className="bg-gradient-to-r from-[#102A66] to-[#173B8F] text-white">      <nav className="container mx-auto h-[80px] pl-10 pr-4 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-3 h-full">
          <img
            src={import.meta.env.VITE_APP_LOGO}
            alt="Modira"
            className="h-8 w-auto object-contain"
          />

          <span className="modira-font text-xl leading-none flex items-center translate-y-[2px] text-white">
            MODIRA
          </span>
        </div>

        {/* Botón Área principal */}
        <button
          type="button"
          onClick={() => setLocation("/")}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#102A66] shadow-md transition hover:bg-white/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Área principal
        </button>
      </nav>
    </header>

    {/* TÍTULO */}
    <section className="bg-[#102A66]">
  <div className="container mx-auto px-4 py-10 md:py-12">
    <h1 className="text-4xl font-bold text-white leading-tight md:text-5xl">
      Cómo trabajamos
    </h1>

    <p className="mt-2 text-base text-white/80 md:text-lg">
      Conoce cómo transformamos procesos manuales en sistemas que trabajan por ti.
    </p>
  </div>
</section>

          <main>
        {/* INTRO */}
       <section className="bg-white py-14 md:py-20">
  <div className="container mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                Un proceso pensado para tu empresa
              </p>

              <h2 className="mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                Automatizar no es simplemente conectar herramientas
              </h2>

              <p className="mt-5 text-base leading-relaxed text-[#52627A] md:text-lg">
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

        {/* PROCESO */}
        <section id="proceso" className="bg-[#F4F6F9] py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                Nuestro proceso
              </p>

              <h2 className="mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                Cuatro etapas para transformar tu proceso
              </h2>

              <p className="mt-4 text-[#52627A] md:text-lg">
                Trabajamos de forma progresiva para que cada decisión tenga un
                objetivo claro y puedas conocer en todo momento en qué punto se
                encuentra tu proyecto.
              </p>
            </div>

            <div className="mx-auto max-w-5xl space-y-8">
              {processSteps.map((step, index) => (
                <div
                  key={step.number}
                  className="rounded-2xl border border-[#E1E7EF] bg-white p-7 shadow-sm md:p-10"
                >
                  <div className="flex flex-col gap-7 md:flex-row">
                    <div className="flex-shrink-0">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#173B8F] text-white shadow-md">
                        <step.icon className="h-8 w-8" />
                      </div>

                      <p className="mt-3 text-center text-sm font-bold text-[#173B8F]">
                        {step.number}
                      </p>
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#173B8F]">
                        {step.subtitle}
                      </p>

                      <h3 className="mt-1 text-2xl font-bold text-[#102A66] md:text-3xl">
                        {step.title}
                      </h3>

                      <p className="mt-4 leading-relaxed text-[#52627A]">
                        {step.description}
                      </p>

                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {step.points.map((point) => (
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

                  {index < processSteps.length - 1 && (
                    <div className="mt-8 hidden h-px bg-[#E8ECF2] md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AREA CLIENTE */}
        <section className="bg-white py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                  Transparencia durante el proyecto
                </p>

                <h2 className="mt-3 text-3xl font-bold leading-tight text-[#102A66] md:text-4xl">
                  Tu proyecto, siempre bajo control
                </h2>

                <p className="mt-5 leading-relaxed text-[#52627A] md:text-lg">
                  Cuando trabajas con Modira, dispones de un Área de Cliente
                  desde la que puedes consultar la evolución de tus proyectos
                  y acceder a la información relacionada con el servicio.
                </p>

                <p className="mt-4 leading-relaxed text-[#52627A] md:text-lg">
                  El objetivo es sencillo: que no tengas que depender de
                  correos o mensajes para saber qué está pasando con tu
                  proyecto.
                </p>

                <button
                  type="button"
                  onClick={() => setLocation("/auth")}
                  className="mt-7 inline-flex items-center gap-2 font-semibold text-[#173B8F] hover:text-[#102A66]"
                >
                  Acceder al Área de Cliente
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Visual */}
              <div className="rounded-3xl bg-gradient-to-br from-[#102A66] to-[#173B8F] p-6 shadow-xl md:p-8">
                <div className="rounded-2xl bg-white p-6 md:p-8">
                  <div className="mb-7 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#52627A]">
                        Estado del proyecto
                      </p>
                      <h3 className="mt-1 text-xl font-bold text-[#102A66]">
                        Automatización
                      </h3>
                    </div>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                      Activo
                    </span>
                  </div>

                  <div className="space-y-4">
                    {[
                      ["Pendiente", false],
                      ["Activo", true],
                      ["Pausado", false],
                      ["Entregado", false],
                      ["Completado", false],
                    ].map(([status, active], index) => (
                      <div
                        key={status as string}
                        className="flex items-center gap-3"
                      >
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            active
                              ? "bg-[#173B8F] text-white"
                              : "bg-[#EEF2F7] text-[#52627A]"
                          }`}
                        >
                          {active ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <span className="text-xs font-bold">
                              {index + 1}
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-sm font-semibold ${
                            active
                              ? "text-[#102A66]"
                              : "text-[#8793A5]"
                          }`}
                        >
                          {status as string}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-7 rounded-xl bg-[#F4F6F9] p-4">
                    <p className="text-xs leading-relaxed text-[#52627A]">
                      El estado del proyecto se actualiza conforme avanza el
                      trabajo, permitiéndote conocer su situación de forma
                      clara.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TODO EN UN MISMO LUGAR */}
        <section className="bg-[#F4F6F9] py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#173B8F]">
                Área de Cliente
              </p>

              <h2 className="mt-3 text-3xl font-bold text-[#102A66] md:text-4xl">
                Todo lo que necesitas, en un mismo lugar
              </h2>

              <p className="mt-4 text-[#52627A] md:text-lg">
                Además de seguir tus proyectos, puedes gestionar desde tu Área
                de Cliente los principales aspectos de tu relación con Modira.
              </p>
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
                  className="rounded-2xl border border-[#E1E7EF] bg-white p-6"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#173B8F]/10 text-[#173B8F]">
                    <item.icon className="h-5 w-5" />
                  </div>

                  <h3 className="text-xl font-bold text-[#102A66]">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-[#52627A]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="mx-auto mt-8 flex max-w-4xl items-start gap-4 rounded-2xl border border-[#DCE4EF] bg-white p-6">
              <ShieldCheck className="mt-0.5 h-6 w-6 flex-shrink-0 text-[#173B8F]" />

              <div>
                <h3 className="font-bold text-[#102A66]">
                  Información protegida y separada por cliente
                </h3>

                <p className="mt-1 text-sm leading-relaxed text-[#52627A]">
                  El Área de Cliente está diseñada para que cada usuario
                  acceda únicamente a la información que corresponde a su
                  cuenta, empresa y proyectos.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* RESULTADO */}
        <section className="bg-white py-16 md:py-24">
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
                      <span className="text-sm font-semibold">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="auditoria" className="bg-[#F4F6F9] py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#173B8F]/10 text-[#173B8F]">
                <ClipboardCheck className="h-7 w-7" />
              </div>

              <h2 className="mt-5 text-3xl font-bold text-[#102A66] md:text-4xl">
                ¿Dónde puede ayudarte la automatización?
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-[#52627A] md:text-lg">
                Cuéntanos qué procesos te hacen perder más tiempo y
                analizaremos dónde puede aportar valor la automatización en tu
                empresa.
              </p>

              <button
                type="button"
                onClick={() => setLocation("/#auditoria")}
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

      {/* FOOTER SIMPLE */}
      <footer className="bg-[#102A66] py-8 text-white">
        <div className="container mx-auto px-4 text-center text-sm text-white/60">
          © 2024 Modira. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}