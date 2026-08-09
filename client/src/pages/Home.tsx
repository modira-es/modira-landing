import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Header from "@/components/Header";
import HowWeWork from "@/components/HowWeWork";
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
} from "lucide-react";
import { useState } from "react";

export default function Home() {
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Formulario enviado:", formData);
    alert("Gracias por tu solicitud. Te contactaremos pronto.");
    setFormData({
      nombre: "",
      email: "",
      empresa: "",
      empleados: "",
      proceso: "",
    });
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
      <Header />

      {/* Hero Section - Premium Dark Blue Gradient */}
      <section className="pt-32 pb-20 md:pb-32 bg-gradient-to-br from-[#102A66] via-[#173B8F] to-[#2854B8] relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -ml-48 -mb-48"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
                Automatiza tu empresa, libera tu equipo
              </h1>
              <p className="text-lg md:text-xl text-white/85 leading-relaxed">
                Recupera entre 10 y 30 horas semanales automatizando procesos
                repetitivos. Modira conecta tus herramientas y crea flujos
                inteligentes adaptados a tu negocio.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
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
              <img
                src="/Images/hero-automation.png"
                alt="Automatización de procesos"
                className="rounded-2xl shadow-2xl w-full h-auto"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/10 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section - Premium Cards */}
      <section className="py-16 md:py-24 bg-[#F4F6F9]">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                label: "Hasta",
                value: "80%",
                description: "Reducción de trabajo manual",
                icon: TrendingUp,
              },
              {
                label: "Potencial",
                value: "10–30 h",
                description: "Ahorro semanal por proceso",
                icon: Clock,
              },
              {
                label: "Experiencia",
                value: "500+",
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
                key={idx}
                className="p-6 md:p-8 border border-[#E8ECF2] bg-white hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-[#52627A] mb-1">
                      {stat.label}
                    </p>
                    <p className="text-3xl md:text-4xl font-bold text-[#173B8F]">
                      {stat.value}
                    </p>
                  </div>
                  <stat.icon className="h-6 w-6 text-[#173B8F] opacity-60" />
                </div>
                <p className="text-sm text-[#52627A]">{stat.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Problema Section - Enhanced */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative order-2 md:order-1">
              <img
                src="/Images/manual-processes.png"
                alt="Procesos manuales"
                className="rounded-2xl shadow-lg w-full h-auto"
              />
            </div>
            <div className="space-y-6 order-1 md:order-2">
              <h2 className="text-4xl md:text-5xl font-bold text-[#102A66] leading-tight">
                El problema que enfrentas
              </h2>
              <p className="text-lg text-[#52627A]">
                Tu equipo pierde horas valiosas en tareas que podrían automatizarse:
              </p>
              <ul className="space-y-4">
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
      <section className="py-16 md:py-24 bg-[#F4F6F9]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-[#102A66] mb-4 leading-tight">
              La solución: Automatización inteligente
            </h2>
            <p className="text-lg text-[#52627A] max-w-2xl mx-auto">
              Modira diseña flujos personalizados que conectan tus herramientas
              existentes y automatizan tus procesos sin cambiar tu infraestructura.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              {
                icon: Zap,
                title: "Recupera tiempo",
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
                className="p-8 border border-[#E8ECF2] bg-white hover:border-[#173B8F] hover:shadow-lg transition-all duration-300"
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
          <div className="relative rounded-2xl overflow-hidden">
            <img
              src="/Images/integration-ecosystem.png"
              alt="Ecosistema de integraciones"
              className="w-full h-auto rounded-2xl shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Cómo trabajamos Section */}
      <HowWeWork />

      {/* Before/After Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-[#102A66] mb-4">
              De procesos manuales a sistemas que trabajan por ti
            </h2>
            <p className="text-lg text-[#52627A] max-w-2xl mx-auto">
              Visualiza la transformación que Modira proporciona a tu empresa
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Before */}
            <Card className="p-8 border-2 border-red-200 bg-red-50">
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
            <Card className="p-8 border-2 border-green-200 bg-green-50">
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

      {/* ROI Calculator Section */}
      <section className="py-16 md:py-24 bg-[#F4F6F9]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-[#102A66] mb-4">
              ¿Cuánto podrías ahorrar?
            </h2>
            <p className="text-lg text-[#52627A]">
              Calculadora orientativa de ahorro potencial
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="p-8 md:p-12 border border-[#E8ECF2]">
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

      {/* Servicios Section */}
      <section id="servicios" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-[#102A66] mb-4">
              Nuestros servicios
            </h2>
            <p className="text-lg text-[#52627A] max-w-2xl mx-auto">
              Soluciones adaptadas a cada etapa de tu crecimiento
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Automatización de procesos",
                price: "Desde 490 €",
                description:
                  "Ideal para empresas que quieren empezar a automatizar tareas concretas.",
                features: [
                  "Análisis del proceso",
                  "Diseño del flujo",
                  "Integración entre herramientas",
                  "Configuración y pruebas",
                  "Documentación básica",
                ],
              },
              {
                title: "Sistemas de automatización avanzados",
                price: "Desde 1.500 €",
                description:
                  "Para empresas que necesitan conectar múltiples áreas.",
                features: [
                  "Auditoría del proceso actual",
                  "Diseño de la solución",
                  "Integración múltiple",
                  "IA aplicada al proceso",
                  "Documentación completa",
                ],
                featured: true,
              },
              {
                title: "Presencia digital automatizada",
                price: "Desde 1.500 €",
                description:
                  "Web profesional que trabaja para tu empresa.",
                features: [
                  "Diseño profesional",
                  "Formularios inteligentes",
                  "Captación automatizada",
                  "Integración con herramientas",
                  "Automatizaciones iniciales",
                ],
              },
            ].map((service, idx) => (
              <Card
                key={idx}
                className={`p-8 border-2 transition-all ${
                  service.featured
                    ? "border-[#173B8F] bg-gradient-to-br from-white to-[#F4F6F9] shadow-xl"
                    : "border-[#E8ECF2] hover:border-[#173B8F]"
                }`}
              >
                <h3 className="text-2xl font-bold text-[#102A66] mb-2">
                  {service.title}
                </h3>
                <p className="text-3xl font-bold text-[#173B8F] mb-4">
                  {service.price}
                </p>
                <p className="text-[#52627A] mb-6">{service.description}</p>
                <div className="space-y-3 mb-6">
                  {service.features.map((feature, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-[#182230]">{feature}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className={`w-full ${
                    service.featured
                      ? "bg-[#173B8F] hover:bg-[#102A66] text-white"
                      : "border-[#173B8F] text-[#173B8F] hover:bg-[#173B8F]/5"
                  }`}
                  variant={service.featured ? "default" : "outline"}
                >
                  Quiero automatizar esto
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mantenimiento Section */}
      <section className="py-16 md:py-24 bg-[#F4F6F9]">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-[#102A66] mb-12 text-center">
            Planes de mantenimiento
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Essential",
                price: "149 €/mes",
                automatizaciones: "Hasta 3 automatizaciones",
                description: "Ideal para mantener tus primeras automatizaciones funcionando sin preocupaciones.",
                features: [
                  "Supervisión de automatizaciones",
                  "Soporte básico",
                  "Revisión mensual",
                ],
              },
              {
                name: "Growth",
                price: "299 €/mes",
                automatizaciones: "Hasta 10 automatizaciones",
                description: "Pensado para empresas en crecimiento que necesitan optimizar y ampliar sus automatizaciones.",
                features: [
                  "Mejoras continuas",
                  "Revisión quincenal",
                  "Soporte prioritario",
                ],
                featured: true,
              },
              {
                name: "Business",
                price: "499 €/mes",
                automatizaciones: "Automatizaciones ilimitadas",
                description: "Soporte y optimización continua para procesos críticos donde cada minuto cuenta.",
                features: [
                  "Automatizaciones críticas",
                  "Optimización continua",
                  "Soporte avanzado 24/7",
                ],
              },
            ].map((plan, idx) => (
              <Card
                key={idx}
                className={`p-8 border-2 ${
                  plan.featured
                    ? "border-[#173B8F] bg-gradient-to-br from-white to-[#F4F6F9]"
                    : "border-[#E8ECF2]"
                }`}
              >
                <h3 className="text-2xl font-bold text-[#102A66] mb-2">
                  {plan.name}
                </h3>
                <p className="text-3xl font-bold text-[#173B8F] mb-2">
                  {plan.price}
                </p>
                <p className="text-sm text-[#52627A] mb-2">{plan.automatizaciones}</p>
                {plan.description && <p className="text-sm text-[#52627A] mb-6">{plan.description}</p>}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <CheckCircle className="h-5 w-5 text-[#173B8F] flex-shrink-0 mt-0.5" />
                      <span className="text-[#182230]">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    plan.featured
                      ? "bg-[#173B8F] hover:bg-[#102A66] text-white"
                      : "border-[#173B8F] text-[#173B8F] hover:bg-[#173B8F]/5"
                  }`}
                  variant={plan.featured ? "default" : "outline"}
                >
                  Contratar plan
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Casos de Éxito Section */}
      <section id="casos-exito" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-[#102A66] mb-4 text-center">
            Ejemplos de transformación
          </h2>
          <p className="text-lg text-[#52627A] max-w-2xl mx-auto text-center mb-12">
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
              <Card key={idx} className="p-8 border-[#E8ECF2] hover:shadow-lg transition-all">
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

      {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-24 bg-[#F4F6F9]">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-[#102A66] mb-12 text-center">
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
                  className="border border-[#E8ECF2] rounded-lg px-6 py-4 bg-white"
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
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 text-center">
              Auditoría gratuita de automatización
            </h2>
            <p className="text-lg text-white/90 mb-12 text-center">
              Completa este formulario y nuestro equipo analizará tu empresa para
              detectar oportunidades de automatización. Sin compromiso.
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-6 bg-white p-8 rounded-2xl shadow-xl">
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
                    <option value="5-10">5-10</option>
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

      {/* Por qué elegir Modira Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-[#102A66] mb-12 text-center">
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
                <div key={idx} className="flex gap-4">
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
                className="rounded-2xl shadow-lg w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#102A66] text-white py-12">
        <div className="container-lg mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-white/10 p-1.5 rounded-lg">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">Modira</span>
              </div>
              <p className="text-white/70 text-sm mb-4">
                Automatización inteligente para pymes españolas.
              </p>
              <p className="text-white/60 text-xs">
                <strong>Email:</strong> info@modira.es
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Producto</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li>
                  <a href="#servicios" className="hover:text-white transition">
                    Servicios
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-white transition">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Empresa</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li>
                  <a href="/area-cliente" className="hover:text-white transition">
                    Área Cliente
                  </a>
                </li>
                <li>
                  <a href="/empleados/login" className="hover:text-white transition">
                    Área de empleados
                  </a>
                </li>
                <li>
                  <a href="#auditoria" className="hover:text-white transition">
                    Contacto
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li>
                  <a href="/politica-privacidad" className="hover:text-white transition">
                    Privacidad
                  </a>
                </li>
                <li>
                  <a href="/terminos" className="hover:text-white transition">
                    Términos
                  </a>
                </li>
                <li>
                  <a href="/politica-cookies" className="hover:text-white transition">
                    Cookies
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8">
            <div className="grid md:grid-cols-2 gap-8 mb-4">
              <div className="text-white/70 text-xs">
                <p><strong>Modira</strong></p>
                <p>Servicios de automatización empresarial</p>
                <p className="mt-2">Email: info@modira.es</p>
              </div>
              <div className="text-white/70 text-xs text-right md:text-left">
                <p>© 2024 Modira. Todos los derechos reservados.</p>
                <p className="mt-2">Cumplimos con RGPD, LOPDGDD y LSSI-CE</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
