import { CheckCircle2, Lightbulb, Wrench, TrendingUp } from "lucide-react";

export default function HowWeWork() {
  const steps = [
    {
      number: "01",
      title: "Auditoría gratuita",
      description: "Analizamos tu empresa para detectar oportunidades de automatización sin compromiso.",
      icon: CheckCircle2,
    },
    {
      number: "02",
      title: "Diseño de la solución",
      description: "Diseñamos un flujo personalizado adaptado a tus procesos y necesidades específicas.",
      icon: Lightbulb,
    },
    {
      number: "03",
      title: "Desarrollo e implantación",
      description: "Implementamos la solución, la probamos exhaustivamente y la ponemos en marcha.",
      icon: Wrench,
    },
    {
      number: "04",
      title: "Seguimiento y mejora",
      description: "Monitoreamos el sistema y realizamos mejoras continuas para optimizar resultados.",
      icon: TrendingUp,
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-[#F4F6F9]">
      <div className="container-lg mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-[#102A66] mb-4 leading-tight">
            Cómo trabajamos
          </h2>
          <p className="text-lg text-[#52627A] max-w-2xl mx-auto">
            Un proceso estructurado y transparente para garantizar el éxito de tu automatización
          </p>
        </div>

        {/* Desktop View - Horizontal Steps */}
        <div className="hidden md:block">
          <div className="relative">
            {/* Connection Line */}
            <div className="absolute top-12 left-0 right-0 h-1 bg-gradient-to-r from-[#173B8F] via-[#173B8F] to-[#173B8F]/30 -z-10"></div>

            {/* Steps Grid */}
            <div className="grid grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="flex flex-col items-center">
                  {/* Step Circle */}
                  <div className="relative mb-8 z-10">
                    <div className="w-24 h-24 bg-gradient-to-br from-[#173B8F] to-[#102A66] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      <step.icon className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white border-2 border-[#173B8F] rounded-full flex items-center justify-center text-[#173B8F] font-bold text-sm shadow-md">
                      {step.number}
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-[#102A66] mb-2">
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

        {/* Mobile View - Vertical Steps */}
        <div className="md:hidden space-y-8">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-6">
              {/* Left Side - Circle and Line */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#173B8F] to-[#102A66] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all">
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-white border-2 border-[#173B8F] rounded-full flex items-center justify-center text-[#173B8F] font-bold text-xs shadow-md">
                    {step.number.split("")[1]}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-1 h-12 bg-gradient-to-b from-[#173B8F] to-[#173B8F]/30 mt-4"></div>
                )}
              </div>

              {/* Right Side - Content */}
              <div className="pt-1 pb-4">
                <h3 className="text-lg font-bold text-[#102A66] mb-2">
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
    </section>
  );
}
