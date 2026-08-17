import {
  CheckCircle2,
  Lightbulb,
  Wrench,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { useLocation } from "wouter";

export default function HowWeWork() {
  const [, setLocation] = useLocation();

  const steps = [
    {
      number: "01",
      title: "Auditoría gratuita",
      description:
        "Analizamos tu empresa para detectar oportunidades de automatización sin compromiso.",
      icon: CheckCircle2,
    },
    {
      number: "02",
      title: "Diseño de la solución",
      description:
        "Diseñamos un flujo personalizado adaptado a tus procesos y necesidades específicas.",
      icon: Lightbulb,
    },
    {
      number: "03",
      title: "Desarrollo e implantación",
      description:
        "Implementamos la solución, la probamos exhaustivamente y la ponemos en marcha.",
      icon: Wrench,
    },
    {
      number: "04",
      title: "Seguimiento y mejora",
      description:
        "Monitoreamos el sistema y realizamos mejoras continuas para optimizar resultados.",
      icon: TrendingUp,
    },
  ];

  return (
    <section className="py-14 md:py-20 bg-white">
      <div className="container-lg mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-[#102A66] mb-3 leading-tight">
            Cómo trabajamos
          </h2>

          <p className="text-base md:text-lg text-[#52627A] max-w-2xl mx-auto leading-relaxed">
            Un proceso estructurado y transparente para garantizar el éxito de tu
            automatización
          </p>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block">
          <div className="relative">
            {/* Connection Line */}
            <div className="absolute top-10 left-0 right-0 h-1 bg-gradient-to-r from-[#173B8F] via-[#173B8F] to-[#173B8F]/30 -z-10" />

            {/* Steps */}
            <div className="grid grid-cols-4 gap-6">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center"
                >
                  {/* Step Circle */}
                  <div className="relative mb-6 z-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#173B8F] to-[#102A66] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      <step.icon className="w-9 h-9 text-white" />
                    </div>

                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-white border-2 border-[#173B8F] rounded-full flex items-center justify-center text-[#173B8F] font-bold text-xs shadow-md">
                      {step.number}
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="text-center max-w-[240px]">
                    <h3 className="text-base font-bold text-[#102A66] mb-2">
                      {step.title}
                    </h3>

                    <p className="text-[#52627A] text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-7">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-5">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#173B8F] to-[#102A66] rounded-full flex items-center justify-center shadow-lg">
                    <step.icon className="w-7 h-7 text-white" />
                  </div>

                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-white border-2 border-[#173B8F] rounded-full flex items-center justify-center text-[#173B8F] font-bold text-[10px] shadow-md">
                    {step.number.split("")[1]}
                  </div>
                </div>

                {index < steps.length - 1 && (
                  <div className="w-1 h-10 bg-gradient-to-b from-[#173B8F] to-[#173B8F]/30 mt-3" />
                )}
              </div>

              <div className="pt-1 pb-3">
                <h3 className="text-base font-bold text-[#102A66] mb-1.5">
                  {step.title}
                </h3>

                <p className="text-[#52627A] text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Saber más */}
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => setLocation("/como-trabajamos")}
            className="inline-flex items-center gap-2 rounded-lg bg-[#173B8F] px-6 py-3 font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#102A66] hover:-translate-y-0.5"
          >
            Descubre cómo trabajamos
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}