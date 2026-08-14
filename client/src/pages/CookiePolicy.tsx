import Header from "@/components/Header";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function CookiePolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-32 pb-16 md:pb-24 bg-gradient-to-br from-[#F5F7FA] to-white">
        <div className="container-lg mx-auto">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-[#1E3A8A] hover:underline mb-6"
          >
            <ArrowLeft size={20} />
            Volver
          </button>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1E3A8A] mb-4">
            Política de Cookies
          </h1>
          <p className="text-gray-600 text-lg">
            Última actualización: Agosto de 2024
          </p>
        </div>
      </div>

      <div className="container-lg mx-auto py-16 md:py-24">
        <div className="max-w-3xl mx-auto prose prose-lg">
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">¿Qué son las cookies?</h2>
            <p className="text-gray-700">
              Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas nuestra web. Nos ayudan a mejorar tu experiencia y a entender cómo utilizas nuestros servicios.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Tipos de cookies que utilizamos</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">1. Cookies esenciales</h3>
            <p className="text-gray-700 mb-4">
              Necesarias para el funcionamiento básico de la web. No requieren consentimiento previo.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
              <li>Autenticación y seguridad</li>
              <li>Preferencias de usuario</li>
              <li>Funcionamiento de formularios</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2. Cookies de análisis</h3>
            <p className="text-gray-700 mb-4">
              Nos ayudan a entender cómo interactúas con nuestra web para mejorar nuestros servicios. Requieren tu consentimiento.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
              <li>Google Analytics: Análisis de tráfico y comportamiento</li>
              <li>Umami Analytics: Estadísticas de visitantes</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3. Cookies de marketing</h3>
            <p className="text-gray-700 mb-4">
              Utilizadas para mostrar anuncios relevantes y medir su efectividad. Requieren tu consentimiento.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Publicidad personalizada</li>
              <li>Seguimiento de conversiones</li>
              <li>Remarketing</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Duración de las cookies</h2>
            <p className="text-gray-700 mb-4">Las cookies pueden ser:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>De sesión:</strong> Se eliminan cuando cierras el navegador</li>
              <li><strong>Persistentes:</strong> Se conservan en tu dispositivo durante un período determinado (generalmente 1-2 años)</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Cómo gestionar tus preferencias</h2>
            <p className="text-gray-700 mb-4">
              Puedes controlar y eliminar cookies de varias formas:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Usando nuestro banner de cookies al entrar en la web</li>
              <li>Accediendo a "Configurar cookies" en el footer</li>
              <li>Configurando tu navegador para rechazar cookies</li>
              <li>Eliminando cookies manualmente desde tu navegador</li>
            </ul>
            <p className="text-gray-700 text-sm bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <strong>Nota:</strong> Si rechazas las cookies esenciales, algunos servicios de la web podrían no funcionar correctamente.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Cookies de terceros</h2>
            <p className="text-gray-700">
              Nuestra web puede contener cookies de terceros (Google, redes sociales, etc.). No controlamos estas cookies directamente. Te recomendamos consultar las políticas de privacidad de estos servicios.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Cumplimiento legal</h2>
            <p className="text-gray-700">
              Cumplimos con la normativa española y europea sobre cookies (RGPD, LSSI-CE, LOPDGDD). Recopilamos tu consentimiento explícito antes de instalar cookies no esenciales.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Cambios en esta política</h2>
            <p className="text-gray-700">
              Podemos actualizar esta Política de Cookies en cualquier momento. Los cambios entrarán en vigor cuando publiquemos la versión actualizada en esta página.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Contacto</h2>
            <p className="text-gray-700">
              Si tienes preguntas sobre nuestro uso de cookies, contacta con nosotros:
            </p>
            <div className="bg-[#F5F7FA] p-6 rounded-lg mt-4">
              <p className="text-gray-700"><strong>Email:</strong> modira.information@gmail.com</p>
              <p className="text-gray-700 mt-2"><strong>Asunto:</strong> Política de Cookies</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
