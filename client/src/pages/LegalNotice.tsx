import Header from "@/components/Header";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function LegalNotice() {
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
            Aviso Legal
          </h1>
          <p className="text-gray-600 text-lg">
            Última actualización: Agosto de 2024
          </p>
        </div>
      </div>

      <div className="container-lg mx-auto py-16 md:py-24">
        <div className="max-w-3xl mx-auto prose prose-lg">
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Información general</h2>
            <p className="text-gray-700 mb-4">
              De conformidad con la Ley 34/1988, de 11 de noviembre, de Publicidad y la Ley 34/1988, de 11 de noviembre, sobre Servicios de la Sociedad de la Información y de Comercio Electrónico, se expone la siguiente información legal:
            </p>
            <div className="bg-[#F5F7FA] p-6 rounded-lg space-y-3">
              <p className="text-gray-700">
                <strong>Denominación social:</strong> Modira
              </p>
              <p className="text-gray-700">
                <strong>Actividad:</strong> Servicios de automatización empresarial, desarrollo de soluciones de integración y consultoría en procesos
              </p>
              <p className="text-gray-700">
                <strong>Email de contacto:</strong> info@modira.es
              </p>
              <p className="text-gray-700">
                <strong>Sitio web:</strong> www.modira.es
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Responsabilidad del contenido</h2>
            <p className="text-gray-700 mb-4">
              Modira se esfuerza por mantener la información contenida en esta web actualizada y precisa. Sin embargo:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>No garantiza la exactitud, integridad o actualización del contenido</li>
              <li>No se responsabiliza por errores u omisiones</li>
              <li>Se reserva el derecho a modificar el contenido sin previo aviso</li>
              <li>No es responsable de daños derivados del uso de la información</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Disponibilidad del servicio</h2>
            <p className="text-gray-700">
              Modira se esfuerza por mantener esta web disponible 24/7, pero no garantiza disponibilidad continua. El servicio puede ser interrumpido por:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Mantenimiento técnico</li>
              <li>Problemas de infraestructura</li>
              <li>Circunstancias fuera de nuestro control</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Propiedad intelectual</h2>
            <p className="text-gray-700">
              Todo el contenido de esta web (textos, imágenes, gráficos, logos, etc.) está protegido por derechos de autor y propiedad intelectual. No está permitido:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Reproducir o distribuir el contenido sin autorización</li>
              <li>Modificar o adaptar el contenido</li>
              <li>Usar el contenido con fines comerciales</li>
              <li>Crear trabajos derivados</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Enlaces externos</h2>
            <p className="text-gray-700">
              Esta web puede contener enlaces a sitios de terceros. Modira no:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Controla el contenido de sitios externos</li>
              <li>Es responsable de su contenido o políticas</li>
              <li>Respalda necesariamente sus contenidos</li>
              <li>Asume responsabilidad por daños derivados de su uso</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Limitación de responsabilidad</h2>
            <p className="text-gray-700">
              En la máxima medida permitida por la ley, Modira no será responsable por:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Daños directos, indirectos o consecuentes</li>
              <li>Pérdida de datos, ingresos o ganancias</li>
              <li>Interrupciones del servicio</li>
              <li>Errores técnicos o de funcionamiento</li>
              <li>Virus o malware</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Cookies y tecnologías de seguimiento</h2>
            <p className="text-gray-700">
              Esta web utiliza cookies y tecnologías similares. Consulta nuestra <a href="/politica-cookies" className="text-[#1E3A8A] hover:underline">Política de Cookies</a> para más información.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Protección de datos</h2>
            <p className="text-gray-700">
              El tratamiento de datos personales se realiza conforme a la Política de Privacidad y la normativa de protección de datos (RGPD, LOPDGDD). Consulta nuestra <a href="/politica-privacidad" className="text-[#1E3A8A] hover:underline">Política de Privacidad</a>.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Ley aplicable y jurisdicción</h2>
            <p className="text-gray-700">
              Este Aviso Legal se rige por la ley española. Cualquier disputa será resuelta por los tribunales competentes en España.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Modificaciones</h2>
            <p className="text-gray-700">
              Modira se reserva el derecho de modificar este Aviso Legal en cualquier momento. Los cambios entrarán en vigor cuando se publiquen en esta página.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Contacto</h2>
            <p className="text-gray-700">
              Para cualquier cuestión relacionada con este Aviso Legal, contacta con nosotros:
            </p>
            <div className="bg-[#F5F7FA] p-6 rounded-lg mt-4">
              <p className="text-gray-700"><strong>Email:</strong> info@modira.es</p>
              <p className="text-gray-700 mt-2"><strong>Asunto:</strong> Aviso Legal</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
