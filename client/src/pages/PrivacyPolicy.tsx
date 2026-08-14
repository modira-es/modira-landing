import Header from "@/components/Header";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicy() {
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
            Política de Privacidad
          </h1>
          <p className="text-gray-600 text-lg">
            Última actualización: Agosto de 2024
          </p>
        </div>
      </div>

      <div className="container-lg mx-auto py-16 md:py-24">
        <div className="max-w-3xl mx-auto prose prose-lg">
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">1. Responsable del tratamiento</h2>
            <p className="text-gray-700 mb-4">
              <strong>Modira</strong> es el responsable del tratamiento de tus datos personales conforme a la normativa de protección de datos vigente (RGPD y LOPDGDD).
            </p>
            <p className="text-gray-700">
              Para cualquier cuestión relacionada con tus datos personales, puedes contactar con nosotros en: <strong>modira.information@gmail.com</strong>
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">2. Datos que recopilamos</h2>
            <p className="text-gray-700 mb-4">Recopilamos los siguientes datos personales:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>Nombre completo</li>
              <li>Dirección de correo electrónico</li>
              <li>Nombre de la empresa</li>
              <li>Número de empleados</li>
              <li>Descripción de procesos a automatizar</li>
              <li>Dirección IP (recopilada automáticamente)</li>
              <li>Información de navegación (cookies)</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">3. Base legal del tratamiento</h2>
            <p className="text-gray-700 mb-4">Tratamos tus datos basándonos en:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>Consentimiento:</strong> Cuando completas el formulario de auditoría</li>
              <li><strong>Interés legítimo:</strong> Para mejorar nuestros servicios y comunicarnos contigo</li>
              <li><strong>Obligación legal:</strong> Cuando la ley lo requiere</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">4. Finalidad del tratamiento</h2>
            <p className="text-gray-700 mb-4">Utilizamos tus datos para:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Procesar tu solicitud de auditoría gratuita</li>
              <li>Contactarte con información sobre nuestros servicios</li>
              <li>Enviar comunicaciones comerciales (si lo autorizas)</li>
              <li>Mejorar nuestra web y servicios</li>
              <li>Cumplir con obligaciones legales</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">5. Conservación de datos</h2>
            <p className="text-gray-700">
              Conservaremos tus datos personales durante el tiempo necesario para cumplir con las finalidades indicadas. Generalmente, los datos se conservarán durante 3 años desde el último contacto, salvo que exista una obligación legal de conservarlos por más tiempo.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">6. Destinatarios de los datos</h2>
            <p className="text-gray-700 mb-4">Tus datos pueden ser compartidos con:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Nuestro equipo interno de Modira</li>
              <li>Proveedores de servicios (hosting, email marketing)</li>
              <li>Autoridades públicas cuando sea legalmente requerido</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">7. Tus derechos</h2>
            <p className="text-gray-700 mb-4">Tienes derecho a:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>Acceso:</strong> Conocer qué datos tenemos sobre ti</li>
              <li><strong>Rectificación:</strong> Corregir datos inexactos</li>
              <li><strong>Supresión:</strong> Solicitar la eliminación de tus datos</li>
              <li><strong>Oposición:</strong> Oponerte al tratamiento de tus datos</li>
              <li><strong>Portabilidad:</strong> Recibir tus datos en formato estructurado</li>
              <li><strong>Limitación:</strong> Limitar el tratamiento de tus datos</li>
            </ul>
            <p className="text-gray-700 mt-4">
              Para ejercer estos derechos, contacta con: <strong>modira.information@gmail.com</strong>
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">8. Seguridad de los datos</h2>
            <p className="text-gray-700">
              Implementamos medidas técnicas y organizativas para proteger tus datos personales contra acceso no autorizado, alteración, pérdida o destrucción. Utilizamos encriptación SSL/TLS en todas nuestras comunicaciones.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">9. Cookies</h2>
            <p className="text-gray-700">
              Utilizamos cookies para mejorar tu experiencia en nuestra web. Consulta nuestra <a href="/politica-cookies" className="text-[#1E3A8A] hover:underline">Política de Cookies</a> para más información.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">10. Cambios en esta política</h2>
            <p className="text-gray-700">
              Podemos actualizar esta Política de Privacidad en cualquier momento. Te notificaremos de cambios significativos publicando una versión actualizada en esta página.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">11. Contacto</h2>
            <p className="text-gray-700">
              Si tienes preguntas sobre esta Política de Privacidad o sobre cómo tratamos tus datos, contacta con nosotros:
            </p>
            <div className="bg-[#F5F7FA] p-6 rounded-lg mt-4">
              <p className="text-gray-700"><strong>Email:</strong> modira.information@gmail.com</p>
              <p className="text-gray-700 mt-2"><strong>Asunto:</strong> Privacidad y protección de datos</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
