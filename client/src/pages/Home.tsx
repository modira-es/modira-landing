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
    // Aquí irá la lógica de envío del formulario
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

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-16 md:pb-24 bg-gradient-to-br from-white via-[#F5F7FA] to-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl font-bold text-[#1E3A8A] leading-tight">
                Automatiza tu empresa, libera tu equipo
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Recupera entre 10 y 30 horas semanales automatizando procesos
                repetitivos. Modira conecta tus herramientas y crea flujos
                inteligentes adaptados a tu negocio.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  size="lg"
                  className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white text-lg px-8"
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
                  className="text-lg px-8 border-gray-300"
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
            <div className="relative">
              <img
                src="/manus-storage/hero-automation_b0b0b568.png"
                alt="Automatización de procesos"
                className="rounded-2xl shadow-2xl w-full h-auto"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-12 pt-12 border-t border-gray-200 mt-12">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#1E3A8A]">80%</p>
              <p className="text-sm text-gray-600">reducción de trabajo manual</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#1E3A8A]">500+</p>
              <p className="text-sm text-gray-600">procesos automatizados</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problema Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative order-2 md:order-1">
              <img
                src="/manus-storage/process-automation_c0d73b2d.png"
                alt="Procesos manuales"
                className="rounded-2xl shadow-lg w-full h-auto"
              />
            </div>
            <div className="space-y-6 order-1 md:order-2">
              <h2 className="text-4xl font-bold text-[#1E3A8A]">
                El problema que enfrentas
              </h2>
              <p className="text-lg text-gray-600">
                Tu equipo pierde horas valiosas en tareas que podrían automatizarse:
              </p>
              <ul className="space-y-3">
                {[
                  "Introducir datos manualmente en múltiples herramientas",
                  "Procesos administrativos repetitivos sin conexión entre sistemas",
                  "Errores humanos que generan retrasos y costos",
                  "Respuestas lentas a clientes por falta de automatización",
                  "Oportunidades comerciales perdidas por falta de tiempo",
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex items-center justify-center h-5 w-5 rounded-full bg-red-100">
                        <span className="text-red-600 text-xs font-bold">✕</span>
                      </div>
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Solución Section */}
      <section className="py-16 md:py-24 bg-[#F5F7FA]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#1E3A8A] mb-4">
              La solución: Automatización inteligente
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Modira diseña flujos personalizados que conectan tus herramientas
              existentes y automatizan tus procesos sin cambiar tu infraestructura.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
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
                className="p-8 border-gray-200 hover:shadow-lg transition-shadow"
              >
                <item.icon className="h-12 w-12 text-[#1E3A8A] mb-4" />
                <h3 className="text-xl font-bold text-[#1E3A8A] mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo trabajamos Section */}
      <HowWeWork />

      {/* Servicios Section */}
      <section id="servicios" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#1E3A8A] mb-4">
              Nuestros servicios
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Soluciones adaptadas a cada etapa de tu crecimiento
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Automatización de procesos",
                price: "desde 590 €",
                description:
                  "Ideal para empresas que quieren empezar a automatizar tareas concretas.",
                features: [
                  "Análisis del proceso",
                  "Diseño del flujo",
                  "Integración entre herramientas",
                  "Configuración y pruebas",
                  "Documentación básica",
                ],
                examples: [
                  "Automatización de formularios",
                  "Gestión de clientes",
                  "Emails automáticos",
                ],
              },
              {
                title: "Sistemas avanzados",
                price: "desde 1.590 €",
                description:
                  "Para empresas que necesitan conectar múltiples áreas.",
                features: [
                  "Auditoría del proceso actual",
                  "Diseño de la solución",
                  "Integración múltiple",
                  "IA aplicada al proceso",
                  "Documentación completa",
                ],
                examples: [
                  "Sistemas comerciales automatizados",
                  "Gestión inteligente de clientes",
                  "Procesamiento de documentos",
                ],
                featured: true,
              },
              {
                title: "Presencia digital",
                price: "desde 1.890 €",
                description:
                  "Web profesional que trabaja para tu empresa.",
                features: [
                  "Diseño profesional",
                  "Formularios inteligentes",
                  "Captación automatizada",
                  "Integración con herramientas",
                  "Automatizaciones iniciales",
                ],
                examples: [
                  "Landing pages efectivas",
                  "Formularios de contacto",
                  "Captación de leads",
                ],
              },
            ].map((service, idx) => (
              <Card
                key={idx}
                className={`p-8 border-2 transition-all ${
                  service.featured
                    ? "border-[#1E3A8A] bg-gradient-to-br from-white to-[#F5F7FA] shadow-xl"
                    : "border-gray-200 hover:border-[#1E3A8A]"
                }`}
              >
                <h3 className="text-2xl font-bold text-[#1E3A8A] mb-2">
                  {service.title}
                </h3>
                <p className="text-3xl font-bold text-[#1E3A8A] mb-4">
                  {service.price}
                </p>
                <p className="text-gray-600 mb-6">{service.description}</p>
                <div className="space-y-3 mb-6">
                  {service.features.map((feature, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className={`w-full ${
                    service.featured
                      ? "bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white"
                      : "border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#1E3A8A]/5"
                  }`}
                  variant={service.featured ? "default" : "outline"}
                >
                  Solicitar presupuesto
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mantenimiento Section */}
      <section className="py-16 md:py-24 bg-[#F5F7FA]">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-[#1E3A8A] mb-12 text-center">
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
                    ? "border-[#1E3A8A] bg-gradient-to-br from-white to-[#F5F7FA]"
                    : "border-gray-200"
                }`}
              >
                <h3 className="text-2xl font-bold text-[#1E3A8A] mb-2">
                  {plan.name}
                </h3>
                <p className="text-3xl font-bold text-[#1E3A8A] mb-2">
                  {plan.price}
                </p>
                <p className="text-sm text-gray-600 mb-2">{plan.automatizaciones}</p>
                {plan.description && <p className="text-sm text-gray-600 mb-6">{plan.description}</p>}
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tecnología Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-[#1E3A8A] mb-12 text-center">
            Tecnología que usamos
          </h2>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-lg text-gray-600 mb-6">
                Modira integra las herramientas que tu empresa ya utiliza,
                creando un ecosistema conectado y eficiente.
              </p>
              <div className="space-y-3">
                {[
                  "Make - Automatización visual",
                  "n8n - Flujos de trabajo avanzados",
                  "Inteligencia Artificial - Procesos inteligentes",
                  "APIs - Integraciones personalizadas",
                  "WhatsApp Business - Comunicación automatizada",
                  "Airtable - Base de datos flexible",
                  "Google Workspace - Productividad integrada",
                  "Y muchas más...",
                ].map((tech, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <CheckCircle className="h-5 w-5 text-[#1E3A8A] flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{tech}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <img
                src="/manus-storage/integration-ecosystem_9d4ef23f.png"
                alt="Ecosistema de integraciones"
                className="rounded-2xl shadow-lg w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Diferenciación Section */}
      <section className="py-16 md:py-24 bg-[#F5F7FA]">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-[#1E3A8A] mb-12 text-center">
            Por qué elegir Modira
          </h2>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img
                src="/manus-storage/team-collaboration_a30b2170.png"
                alt="Equipo de Modira"
                className="rounded-2xl shadow-lg w-full h-auto"
              />
            </div>
            <div className="space-y-6">
              {[
                {
                  title: "100% Personalizadas",
                  description:
                    "No usamos plantillas genéricas. Cada solución se diseña para tu negocio específico.",
                },
                {
                  title: "Soporte cercano",
                  description:
                    "Equipo disponible para ayudarte en cada paso. No somos un chatbot.",
                },
                {
                  title: "Formación incluida",
                  description:
                    "Tu equipo aprende a usar y mantener los sistemas. Eres independiente.",
                },
                {
                  title: "Orientados a resultados",
                  description:
                    "Nos importa tu ahorro de tiempo y dinero, no vender más tecnología.",
                },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#1E3A8A]">
                      <Star className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1E3A8A] mb-1">
                      {item.title}
                    </h3>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Casos de éxito Section */}
      <section id="casos-exito" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-[#1E3A8A] mb-12 text-center">
            Casos de éxito
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "María García",
                role: "CEO, Consultoría Digital",
                quote:
                  "Con Modira recuperamos 25 horas semanales. Nuestro equipo ahora se enfoca en estrategia, no en tareas repetitivas.",
                metrics: "25h/semana ahorradas",
              },
              {
                name: "Carlos López",
                role: "Director de Operaciones, E-commerce",
                quote:
                  "La automatización de nuestros procesos comerciales fue un cambio de juego. Los errores bajaron un 95%.",
                metrics: "95% menos errores",
              },
              {
                name: "Elena Martínez",
                role: "Gerente, Agencia de Marketing",
                quote:
                  "Modira nos ayudó a escalar sin contratar más gente. Nuestros sistemas trabajan 24/7.",
                metrics: "0 contrataciones",
              },
            ].map((testimonial, idx) => (
              <Card key={idx} className="p-8 border-gray-200">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">\"{testimonial.quote}\"</p>
                <div className="border-t border-gray-200 pt-4">
                  <p className="font-bold text-[#1E3A8A]">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                  <p className="text-sm font-semibold text-[#1E3A8A] mt-2">
                    {testimonial.metrics}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-24 bg-[#F5F7FA]">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-[#1E3A8A] mb-12 text-center">
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
                  className="border border-gray-300 rounded-lg px-6 py-4"
                >
                  <AccordionTrigger className="text-lg font-semibold text-[#1E3A8A] hover:text-[#1E3A8A]/80">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-700 pt-4">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Auditoría CTA Section */}
      <section id="auditoria" className="py-16 md:py-24 bg-gradient-to-br from-[#1E3A8A] to-[#1E3A8A]/90">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-6 text-center">
              Auditoría gratuita de automatización
            </h2>
            <p className="text-lg text-white/90 mb-12 text-center">
              Completa este formulario y nuestro equipo analizará tu empresa para
              detectar oportunidades de automatización. Sin compromiso.
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-6 bg-white p-8 rounded-2xl">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Empresa
                  </label>
                  <input
                    type="text"
                    name="empresa"
                    value={formData.empresa}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    placeholder="Nombre de tu empresa"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Número de empleados
                  </label>
                  <select
                    name="empleados"
                    value={formData.empleados}
                    onChange={handleFormChange as any}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ¿Qué proceso te gustaría automatizar?
                </label>
                <textarea
                  name="proceso"
                  value={formData.proceso}
                  onChange={handleFormChange}
                  required
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  placeholder="Describe brevemente los procesos que consumen más tiempo en tu empresa..."
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white text-lg py-6"
              >
                Solicitar auditoría gratuita
              </Button>

              <p className="text-sm text-gray-600 text-center">
                Nos pondremos en contacto en 24 horas. Sin spam, sin compromiso.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1F2937] text-white py-12">
        <div className="container-lg mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-white/10 p-1.5 rounded-lg">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">Modira</span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Automatización inteligente para pymes españolas.
              </p>
              <p className="text-gray-500 text-xs">
                <strong>Email:</strong> info@modira.es
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Producto</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <a href="#servicios" className="hover:text-white transition">
                    Servicios
                  </a>
                </li>
                <li>
                  <a href="#precios" className="hover:text-white transition">
                    Precios
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
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <a href="/area-cliente" className="hover:text-white transition">
                    Área Cliente
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Blog
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
              <ul className="space-y-2 text-gray-400 text-sm">
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
                <li>
                  <a href="/aviso-legal" className="hover:text-white transition">
                    Aviso Legal
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8">
            <div className="grid md:grid-cols-2 gap-8 mb-4">
              <div className="text-gray-400 text-xs">
                <p><strong>Modira</strong></p>
                <p>Servicios de automatización empresarial</p>
                <p className="mt-2">Email: info@modira.es</p>
              </div>
              <div className="text-gray-400 text-xs text-right md:text-left">
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
