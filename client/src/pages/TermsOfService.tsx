import Header from "@/components/Header";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsOfService() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#172033]">
      <Header />

      {/* Header de la página */}
      <header className="border-b border-[#E5EAF1] bg-white pt-32 pb-14">
        <div className="mx-auto w-full max-w-5xl px-6 sm:px-8 lg:px-10">
          <button
            onClick={() => setLocation("/")}
            className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-[#1E3A8A] transition-colors hover:text-[#16306f]"
          >
            <ArrowLeft size={18} strokeWidth={2} />
            Volver
          </button>

          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-[#64748B]">
              Legal
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-[#1E3A8A] sm:text-5xl">
              Términos y Condiciones
            </h1>

            <p className="mt-5 text-base text-[#64748B]">
              Última actualización: Agosto de 2026
            </p>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
        <article className="rounded-2xl border border-[#E3E8F0] bg-white px-6 py-8 shadow-[0_4px_20px_rgba(15,23,42,0.04)] sm:px-10 sm:py-12 lg:px-14 lg:py-14">

          {/* Introducción */}
          <section className="mb-14">
            <p className="text-[16px] leading-8 text-[#475569]">
              Estos Términos y Condiciones regulan la relación contractual entre
              Modira y los clientes que contraten sus servicios.
            </p>

            <p className="mt-5 text-[16px] leading-8 text-[#475569]">
              La contratación de los servicios de Modira implica la aceptación
              de estos Términos y Condiciones, así como de las condiciones
              particulares que figuren en el presupuesto o documentación
              contractual correspondiente.
            </p>
          </section>

          {/* 1 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              1. Objeto
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Modira presta servicios de automatización empresarial orientados
              a empresas, autónomos y profesionales dentro de su actividad
              económica o profesional.
            </p>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Los servicios pueden comprender, entre otros:
            </p>

            <ul className="space-y-3 pl-6 text-[16px] leading-7 text-[#475569]">
              <li className="list-disc">análisis de procesos;</li>
              <li className="list-disc">automatización;</li>
              <li className="list-disc">diseño;</li>
              <li className="list-disc">desarrollo;</li>
              <li className="list-disc">implementación;</li>
              <li className="list-disc">integraciones;</li>
              <li className="list-disc">documentación;</li>
              <li className="list-disc">pruebas;</li>
              <li className="list-disc">mantenimiento;</li>
              <li className="list-disc">soporte.</li>
            </ul>

            <p className="mt-6 text-[16px] leading-8 text-[#475569]">
              Los 3 servicios con precios base orientativos estarán explicados
              en la web.
            </p>

            <p className="mt-5 text-[16px] leading-8 text-[#475569]">
              Los precios mostrados en la landing serán orientativos, no
              necesariamente el precio contractual definitivo.
            </p>

            <p className="mt-5 text-[16px] leading-8 text-[#475569]">
              El precio definitivo será el que figure en el presupuesto
              aceptado.
            </p>
          </section>

          {/* 2 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              2. Auditoría gratuita
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              El cliente puede solicitar una auditoría gratuita desde la web.
            </p>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              La auditoría:
            </p>

            <ul className="space-y-3 pl-6 text-[16px] leading-7 text-[#475569]">
              <li className="list-disc">es gratuita;</li>
              <li className="list-disc">puede tener un alcance variable;</li>
              <li className="list-disc">
                depende de la información proporcionada;
              </li>
              <li className="list-disc">
                no garantiza un resultado concreto;
              </li>
              <li className="list-disc">
                no implica que Modira vaya a implementar necesariamente ninguna
                solución;
              </li>
              <li className="list-disc">
                sirve para analizar posibles necesidades/oportunidades.
              </li>
            </ul>

            <p className="mt-6 text-[16px] leading-8 text-[#475569]">
              La auditoría no constituye por sí misma la contratación de un
              proyecto.
            </p>
          </section>

          {/* 3 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              3. Inicio de un proyecto por parte del cliente
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              El propio cliente puede crear o iniciar un proyecto desde el Área
              de Cliente.
            </p>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              En ese caso:
            </p>

            <ol className="space-y-3 pl-6 text-[16px] leading-7 text-[#475569]">
              <li className="list-decimal">
                el cliente describe lo que necesita;
              </li>
              <li className="list-decimal">
                el equipo técnico de Modira lo revisa;
              </li>
              <li className="list-decimal">
                analiza la viabilidad/necesidades;
              </li>
              <li className="list-decimal">
                se concreta el resultado esperado;
              </li>
              <li className="list-decimal">
                si procede, se prepara presupuesto;
              </li>
              <li className="list-decimal">
                el cliente decide si lo acepta.
              </li>
            </ol>

            <p className="mt-6 text-[16px] leading-8 text-[#475569]">
              La creación de un proyecto no equivale por sí misma a la
              contratación del servicio.
            </p>
          </section>

          {/* 4 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              4. Flujo contractual
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              El flujo habitual de contratación será:
            </p>

            <div className="border-l-2 border-[#1E3A8A] pl-6">
              <p className="text-[16px] font-medium leading-8 text-[#334155]">
                Auditoría gratuita → definición del proyecto → presupuesto →
                aceptación → desarrollo/implantación → pruebas/validación →
                demostración → factura → pago.
              </p>
            </div>

            <p className="my-6 text-[16px] leading-8 text-[#475569]">
              También podrá producirse el siguiente flujo:
            </p>

            <div className="border-l-2 border-[#1E3A8A] pl-6">
              <p className="text-[16px] font-medium leading-8 text-[#334155]">
                Cliente crea proyecto → equipo técnico lo revisa →
                definición/resultado → presupuesto → aceptación → desarrollo →
                pruebas/validación → demostración → factura → pago.
              </p>
            </div>
          </section>

          {/* 5 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              5. Presupuestos
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              El presupuesto contendrá las condiciones concretas del proyecto,
              incluyendo el alcance, entregables, precio y, cuando corresponda,
              las condiciones particulares aplicables.
            </p>

            <p className="text-[16px] leading-8 text-[#475569]">
              Este presupuesto será válido durante 15 días naturales desde su
              fecha de emisión, salvo que en el propio documento se establezca
              expresamente otro plazo.
            </p>
          </section>

          {/* 6 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              6. Aceptación del presupuesto
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              El cliente podrá aceptar el presupuesto desde el Área de Cliente.
            </p>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              La aceptación constituye la manifestación de conformidad con el
              presupuesto y con las condiciones concretas del proyecto.
            </p>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              La aceptación queda registrada y podrá conservarse como
              evidencia de la contratación.
            </p>

            <p className="text-[16px] leading-8 text-[#475569]">
              El proyecto no comenzará hasta dicha aceptación.
            </p>
          </section>

          {/* 7 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              7. Inicio del trabajo
            </h2>

            <p className="text-[16px] leading-8 text-[#475569]">
              El desarrollo y/o implantación comenzará después de la aceptación
              del presupuesto por parte del cliente.
            </p>
          </section>

          {/* 8 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              8. Cancelación de proyectos
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              El cliente podrá solicitar la cancelación del proyecto durante el
              período inicial indicado en el presupuesto o en las condiciones
              particulares del proyecto.
            </p>

            <p className="text-[16px] leading-8 text-[#475569]">
              Durante dicho período inicial, el cliente podrá solicitar la
              cancelación sin que se le cobre el trabajo realizado.
            </p>
          </section>

          {/* 9 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              9. Cancelación después del inicio del trabajo
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Si el cliente solicita la cancelación después del período inicial,
              Modira podrá cobrar el trabajo efectivamente realizado hasta la
              fecha de cancelación, conforme a las condiciones del
              presupuesto/servicio.
            </p>

            <p className="text-[16px] leading-8 text-[#475569]">
              El importe correspondiente deberá guardar relación con el trabajo
              efectivamente realizado y con las condiciones acordadas.
            </p>
          </section>

          {/* 10 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              10. Trabajo realizado y trazabilidad
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Modira podrá conservar evidencias relacionadas con la ejecución
              del proyecto.
            </p>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Entre ellas podrán encontrarse:
            </p>

            <ul className="space-y-3 pl-6 text-[16px] leading-7 text-[#475569]">
              <li className="list-disc">registro del proyecto;</li>
              <li className="list-disc">fechas de inicio;</li>
              <li className="list-disc">estado del proyecto;</li>
              <li className="list-disc">tareas;</li>
              <li className="list-disc">automatizaciones creadas;</li>
              <li className="list-disc">documentación;</li>
              <li className="list-disc">pruebas;</li>
              <li className="list-disc">entregables;</li>
              <li className="list-disc">cambios solicitados;</li>
              <li className="list-disc">comunicaciones;</li>
              <li className="list-disc">actividad técnica;</li>
              <li className="list-disc">demostraciones;</li>
              <li className="list-disc">versiones;</li>
              <li className="list-disc">resultados de pruebas.</li>
            </ul>
          </section>

          {/* 11 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              11. Cambios de proyecto
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              El cliente puede solicitar cambios sobre el proyecto.
            </p>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Las solicitudes de modificación serán evaluadas por Modira y,
              cuando afecten al alcance, esfuerzo, precio o plazo, podrán
              requerir una nueva valoración o presupuesto.
            </p>

            <p className="text-[16px] leading-8 text-[#475569]">
              Algunos cambios podrán requerir modificación del plazo o no ser
              técnicamente viables.
            </p>
          </section>

          {/* 12 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              12. Garantía
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Los servicios realizados tienen una garantía de 90 días respecto
              del trabajo realizado.
            </p>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              La garantía cubre problemas atribuibles a la implementación
              realizada por Modira dentro del alcance contratado.
            </p>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              La garantía no cubre automáticamente:
            </p>

            <ul className="space-y-3 pl-6 text-[16px] leading-7 text-[#475569]">
              <li className="list-disc">cambios realizados por terceros;</li>
              <li className="list-disc">
                modificaciones de herramientas externas;
              </li>
              <li className="list-disc">cambios de APIs;</li>
              <li className="list-disc">cambios de credenciales;</li>
              <li className="list-disc">
                cambios en procesos del cliente;
              </li>
              <li className="list-disc">nuevas funcionalidades;</li>
              <li className="list-disc">ampliaciones del proyecto;</li>
              <li className="list-disc">
                problemas derivados de servicios externos.
              </li>
            </ul>
          </section>

          {/* 13 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              13. Mantenimiento
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Modira ofrece 3 planes de mantenimiento mensuales, explicados en
              la web.
            </p>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              El mantenimiento constituye un servicio diferente de la garantía
              y se presta mediante una suscripción mensual.
            </p>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              El cliente podrá elegir uno de los tres planes disponibles según
              sus necesidades.
            </p>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Los precios mostrados en la web podrán ser precios base u
              orientativos. El precio definitivo será el que conste en la
              contratación correspondiente.
            </p>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Las prestaciones incluidas serán las correspondientes al plan
              contratado.
            </p>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Nuevas implementaciones que excedan el alcance del plan podrán
              requerir un presupuesto independiente.
            </p>

            <p className="text-[16px] leading-8 text-[#475569]">
              La cancelación del mantenimiento no elimina la garantía de 90 días
              que corresponda a una implementación previamente realizada,
              siempre que dicha garantía siga vigente.
            </p>
          </section>

          {/* 14 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              14. Pagos
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              El pago de las facturas podrá realizarse mediante los medios
              habilitados por Modira, actualmente incluyendo Stripe a través
              del Área de Cliente.
            </p>

            <p className="text-[16px] leading-8 text-[#475569]">
              Las condiciones concretas de pago podrán establecerse en la
              factura, presupuesto o documentación contractual correspondiente.
            </p>
          </section>

          {/* 15 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              15. Facturación
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Las facturas se emitirán con los datos necesarios conforme a la
              normativa aplicable.
            </p>

            <p className="text-[16px] leading-8 text-[#475569]">
              La factura podrá incluir, cuando corresponda, la base imponible,
              IVA, IRPF y demás conceptos fiscales aplicables.
            </p>
          </section>

          {/* 16 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              16. Soporte
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Modira podrá proporcionar soporte mediante los canales habilitados
              para ello, incluyendo el Área de Cliente.
            </p>

            <p className="text-[16px] leading-8 text-[#475569]">
              Las condiciones y alcance del soporte dependerán del servicio o
              plan contratado.
            </p>
          </section>

          {/* 17 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              17. Clientes B2B
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Modira está orientada exclusivamente a empresas, autónomos y
              profesionales que contratan dentro de su actividad
              económica/profesional.
            </p>

            <p className="text-[16px] leading-8 text-[#475569]">
              El cliente deberá actuar mediante una persona con capacidad y
              autorización suficiente para representar a la empresa o entidad
              correspondiente cuando proceda.
            </p>
          </section>

          {/* 18 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              18. Protección de datos
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              El tratamiento de datos personales realizado por Modira se
              encuentra regulado en la Política de Privacidad.
            </p>

            <p className="text-[16px] leading-8 text-[#475569]">
              Estos Términos y Condiciones no sustituyen a la Política de
              Privacidad ni regulan de forma exhaustiva el tratamiento de datos
              personales.
            </p>
          </section>

          {/* 19 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              19. Encargo de tratamiento
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Cuando Modira trate datos personales por cuenta de una empresa
              cliente en el marco de la prestación de los servicios, podrá
              resultar aplicable un Acuerdo de Encargo de Tratamiento.
            </p>

            <p className="text-[16px] leading-8 text-[#475569]">
              Dicho acuerdo regulará, cuando corresponda, las condiciones
              específicas del tratamiento de datos personales realizado por
              Modira por cuenta del cliente.
            </p>
          </section>

          {/* 20 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              20. Confidencialidad
            </h2>

            <p className="text-[16px] leading-8 text-[#475569]">
              Modira mantendrá la confidencialidad de la información empresarial
              que el cliente proporcione en el marco de la prestación de los
              servicios, salvo cuando su comunicación sea necesaria para la
              prestación del servicio, exista autorización del cliente o exista
              una obligación legal de comunicarla.
            </p>
          </section>

          {/* 21 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              21. Propiedad intelectual
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Los derechos sobre los elementos, materiales, documentación,
              desarrollos y demás entregables correspondientes a cada proyecto
              se determinarán conforme al presupuesto y a las condiciones
              particulares aplicables.
            </p>

            <p className="text-[16px] leading-8 text-[#475569]">
              La propiedad intelectual de las herramientas, sistemas,
              metodologías, componentes y materiales preexistentes de Modira
              seguirá correspondiendo a sus respectivos titulares.
            </p>
          </section>

          {/* 22 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              22. Servicios y herramientas de terceros
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Las automatizaciones e integraciones desarrolladas por Modira
              pueden depender de servicios, APIs, plataformas o herramientas de
              terceros.
            </p>

            <p className="text-[16px] leading-8 text-[#475569]">
              Modira no controla los cambios, interrupciones, limitaciones o
              modificaciones que puedan realizar dichos terceros. Cuando estos
              cambios afecten a una solución previamente implementada, podrán
              requerir ajustes, mantenimiento o una nueva valoración.
            </p>
          </section>

          {/* 23 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              23. Responsabilidad
            </h2>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Modira prestará los servicios con la diligencia razonablemente
              exigible conforme a la naturaleza del servicio contratado.
            </p>

            <p className="mb-5 text-[16px] leading-8 text-[#475569]">
              Modira no será responsable de los daños o incidencias derivados
              de circunstancias ajenas a su control, incluyendo problemas,
              interrupciones o modificaciones de servicios de terceros, cuando
              no sean atribuibles a una actuación de Modira.
            </p>

            <p className="text-[16px] leading-8 text-[#475569]">
              En cualquier caso, la responsabilidad de Modira quedará limitada
              en los términos permitidos por la legislación aplicable.
            </p>
          </section>

          {/* 24 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              24. Modificación de los Términos
            </h2>

            <p className="text-[16px] leading-8 text-[#475569]">
              Modira podrá modificar estos Términos y Condiciones cuando resulte
              necesario para adaptarlos a cambios en los servicios, en la
              legislación o en el funcionamiento de la plataforma.
            </p>
          </section>

          {/* 25 */}
          <section className="mb-14">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              25. Ley aplicable
            </h2>

            <p className="text-[16px] leading-8 text-[#475569]">
              Estos Términos y Condiciones se regirán por la legislación
              española aplicable.
            </p>
          </section>

          {/* 26 */}
          <section>
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#1E3A8A]">
              26. Contacto
            </h2>

            <p className="mb-6 text-[16px] leading-8 text-[#475569]">
              Para cualquier consulta relacionada con estos Términos y
              Condiciones, puedes contactar con Modira mediante:
            </p>

            <div className="border-t border-[#E5EAF1] pt-6">
              <p className="text-[16px] leading-8 text-[#475569]">
                <strong className="font-semibold text-[#172033]">Email:</strong>{" "}
                contacto@modira.com
              </p>

              <p className="mt-2 text-[16px] leading-8 text-[#475569]">
                <strong className="font-semibold text-[#172033]">
                  Asunto:
                </strong>{" "}
                Términos y Condiciones
              </p>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}