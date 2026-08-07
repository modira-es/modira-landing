import Header from "@/components/Header";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsOfService() {
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
            Términos y Condiciones
          </h1>
          <p className="text-gray-600 text-lg">
            Última actualización: Agosto de 2024
          </p>
        </div>
      </div>

      <div className="container-lg mx-auto py-16 md:py-24">
        <div className="max-w-3xl mx-auto prose prose-lg">
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">1. Aceptación de términos</h2>
            <p className="text-gray-700">
              Al acceder y utilizar esta web, aceptas estar vinculado por estos Términos y Condiciones. Si no estás de acuerdo con alguna parte, no debes utilizar este sitio.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">2. Descripción del servicio</h2>
            <p className="text-gray-700 mb-4">
              Modira proporciona servicios de automatización empresarial, incluyendo:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Auditorías gratuitas de automatización</li>
              <li>Diseño e implementación de soluciones de automatización</li>
              <li>Integración de herramientas y plataformas</li>
              <li>Mantenimiento y soporte continuo</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">3. Uso permitido</h2>
            <p className="text-gray-700 mb-4">
              Aceptas utilizar esta web únicamente para propósitos legales y de la manera que no infrinja los derechos de terceros ni restrinja su uso y disfrute.
            </p>
            <p className="text-gray-700">
              Específicamente, aceptas no:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Acosar o causar angustia o inconvenientes a ninguna persona</li>
              <li>Transmitir contenido obsceno u ofensivo</li>
              <li>Interrumpir el funcionamiento normal de la web</li>
              <li>Intentar acceder sin autorización a sistemas o datos</li>
              <li>Recopilar datos de forma no autorizada</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">4. Propiedad intelectual</h2>
            <p className="text-gray-700">
              Todo el contenido de esta web (textos, gráficos, logos, imágenes, etc.) es propiedad de Modira o de sus proveedores de contenido y está protegido por leyes de propiedad intelectual.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">5. Limitación de responsabilidad</h2>
            <p className="text-gray-700 mb-4">
              En la máxima medida permitida por la ley, Modira no será responsable por:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Daños indirectos, incidentales o consecuentes</li>
              <li>Pérdida de datos o ganancias</li>
              <li>Interrupciones del servicio</li>
              <li>Errores técnicos o de funcionamiento</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">6. Garantía de auditoría</h2>
            <p className="text-gray-700">
              La auditoría gratuita de automatización es proporcionada sin garantía de resultados específicos. Modira se compromete a proporcionar un análisis profesional y honesto de tus procesos.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">7. Precios y pagos</h2>
            <p className="text-gray-700 mb-4">
              Los precios indicados en la web están sujetos a cambios sin previo aviso. Los servicios contratados se facturan según los términos acordados en cada propuesta.
            </p>
            <p className="text-gray-700">
              El pago debe realizarse según las condiciones especificadas en la factura.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">8. Cancelación y reembolsos</h2>
            <p className="text-gray-700">
              Las políticas de cancelación y reembolso se especificarán en el contrato de servicios específico. Para consultas, contacta con nuestro equipo.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">9. Confidencialidad</h2>
            <p className="text-gray-700">
              Modira se compromete a mantener la confidencialidad de la información que compartes durante la auditoría y el proceso de implementación, excepto cuando sea legalmente requerido revelarla.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">10. Enlaces externos</h2>
            <p className="text-gray-700">
              Esta web puede contener enlaces a sitios externos. No somos responsables del contenido de estos sitios ni de sus políticas de privacidad.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">11. Modificación de términos</h2>
            <p className="text-gray-700">
              Modira se reserva el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor cuando se publiquen en esta página.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">12. Ley aplicable</h2>
            <p className="text-gray-700">
              Estos Términos y Condiciones se rigen por la ley española. Cualquier disputa será resuelta por los tribunales competentes en España.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">13. Contacto</h2>
            <p className="text-gray-700">
              Si tienes preguntas sobre estos Términos y Condiciones, contacta con nosotros:
            </p>
            <div className="bg-[#F5F7FA] p-6 rounded-lg mt-4">
              <p className="text-gray-700"><strong>Email:</strong> info@modira.es</p>
              <p className="text-gray-700 mt-2"><strong>Asunto:</strong> Términos y Condiciones</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
