import Header from "@/components/Header";
import {
  ArrowLeft,
  UserRound,
  Database,
  FileText,
  Bot,
  CreditCard,
  ShieldCheck,
  Scale,
  Clock3,
  Users,
  LockKeyhole,
} from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />

      {/* Header de la página */}
      <section className="pt-32 pb-14 md:pt-36 md:pb-16 bg-white border-b border-gray-100">
        <div className="container-lg mx-auto px-6 md:px-10 lg:px-12">
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => setLocation("/")}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#1E3A8A] hover:text-[#16306F] transition-colors mb-8"
            >
              <ArrowLeft size={18} />
              Volver
            </button>

            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-[#1E3A8A] mb-3">
                Área legal
              </p>

              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#172554] mb-5">
                Política de Privacidad
              </h1>

              <p className="text-base md:text-lg text-gray-500 leading-relaxed">
                Información sobre cómo Modira trata los datos personales de
                usuarios, clientes y personas que interactúan con sus
                servicios.
              </p>

              <div className="mt-6 text-sm text-gray-400">
                Última actualización: Agosto de 2026
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contenido */}
      <main className="py-12 md:py-20">
        <div className="container-lg mx-auto px-6 md:px-10 lg:px-12">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-8 md:px-10 md:py-12 lg:px-14 lg:py-14">

                {/* 1. Responsable */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                      <UserRound size={20} className="text-[#1E3A8A]" />
                    </div>

                    <div className="flex-1">
                      <h2 className="text-2xl md:text-3xl font-bold text-[#172554] mb-5">
                        1. Responsable del tratamiento
                      </h2>

                      <p className="text-gray-600 leading-8 mb-4">
                        El responsable del tratamiento de los datos personales
                        tratados a través de Modira será el prestador que
                        figure identificado legalmente en el Aviso Legal.
                      </p>

                      <p className="text-gray-600 leading-8 mb-4">
                        La información relativa a la identidad jurídica,
                        NIF, domicilio y demás datos identificativos del
                        responsable deberá completarse antes de la publicación
                        definitiva de esta política.
                      </p>

                      <div className="mt-6 bg-[#F8FAFC] border border-gray-100 rounded-xl p-5">
                        <p className="text-sm text-gray-500 leading-6">
                          <strong className="text-gray-900">Contacto:</strong>{" "}
                          contacto@modira.com
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. Qué datos recogemos */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#F5F7FA] flex items-center justify-center">
                      <Database size={20} className="text-[#1E3A8A]" />
                    </div>

                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-[#172554]">
                        2. Qué datos recogemos
                      </h2>
                    </div>
                  </div>

                  <p className="text-gray-600 leading-8 mb-8">
                    Los datos tratados por Modira pueden variar en función de
                    la forma en la que interactúes con la web o utilices los
                    servicios. Entre otros, pueden incluir los siguientes:
                  </p>

                  <div className="space-y-5">

                    {/* Navegación */}
                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">
                        Navegación y uso de la web
                      </h3>

                      <ul className="space-y-3 text-gray-600">
                        <li>Información técnica y de navegación.</li>
                        <li>
                          Información relacionada con cookies y tecnologías
                          similares cuando corresponda.
                        </li>
                        <li>
                          Datos necesarios para garantizar la seguridad y el
                          correcto funcionamiento del servicio.
                        </li>
                      </ul>
                    </div>

                    {/* Chat IA */}
                    <div className="border border-gray-200 rounded-xl p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                          <Bot size={20} className="text-[#1E3A8A]" />
                        </div>

                        <div className="flex-1">
                          <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">
                            Modira AI
                          </h3>

                          <p className="text-gray-600 leading-7 mb-4">
                            Antes de registrarse, un visitante puede utilizar
                            determinadas funcionalidades de Modira AI. En ese
                            caso pueden conservarse los mensajes enviados por
                            el usuario y las respuestas generadas por el
                            servicio.
                          </p>

                          <p className="text-gray-600 leading-7 mb-4">
                            Las conversaciones pueden estar asociadas a
                            información técnica y de sesión y, cuando el
                            propio usuario la proporcione, pueden contener
                            información sobre su empresa o actividad.
                          </p>

                          <p className="text-gray-600 leading-7">
                            Además, determinadas conversaciones pueden ser
                            analizadas para extraer información empresarial
                            proporcionada durante la conversación, como el
                            nombre de la empresa o su tipo de actividad.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Auditoría */}
                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">
                        Solicitud de auditoría
                      </h3>

                      <p className="text-gray-600 leading-7 mb-4">
                        Cuando solicitas una auditoría gratuita, puedes
                        proporcionar información como:
                      </p>

                      <ul className="space-y-3 text-gray-600">
                        <li>Nombre.</li>
                        <li>Dirección de correo electrónico.</li>
                        <li>Rango aproximado del número de empleados.</li>
                        <li>
                          Descripción de los procesos, necesidades u
                          oportunidades que quieras comunicar.
                        </li>
                      </ul>
                    </div>

                    {/* Registro */}
                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">
                        Registro y Área de Cliente
                      </h3>

                      <p className="text-gray-600 leading-7 mb-4">
                        Al registrarte y utilizar el Área de Cliente pueden
                        tratarse datos necesarios para gestionar tu cuenta y
                        prestar los servicios.
                      </p>

                      <ul className="space-y-3 text-gray-600">
                        <li>Nombre.</li>
                        <li>Dirección de correo electrónico.</li>
                        <li>Teléfono, cuando sea proporcionado.</li>
                        <li>Información de empresa.</li>
                        <li>
                          Información necesaria para gestionar la relación
                          comercial.
                        </li>
                      </ul>
                    </div>

                    {/* Empresa */}
                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">
                        Información de empresa
                      </h3>

                      <p className="text-gray-600 leading-7 mb-4">
                        En función del servicio utilizado, pueden tratarse
                        datos empresariales como:
                      </p>

                      <ul className="space-y-3 text-gray-600">
                        <li>Nombre de la empresa.</li>
                        <li>CIF/VAT.</li>
                        <li>Dirección y datos de localización empresarial.</li>
                        <li>Sector.</li>
                        <li>Contacto principal.</li>
                        <li>Notas y etiquetas relacionadas con la empresa.</li>
                      </ul>
                    </div>

                    {/* Proyectos */}
                    <div className="border border-gray-200 rounded-xl p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#F5F7FA] flex items-center justify-center">
                          <FileText size={20} className="text-[#1E3A8A]" />
                        </div>

                        <div className="flex-1">
                          <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">
                            Proyectos y documentación
                          </h3>

                          <p className="text-gray-600 leading-7 mb-4">
                            Para prestar los servicios, el cliente puede
                            proporcionar información relacionada con sus
                            procesos y necesidades empresariales.
                          </p>

                          <ul className="space-y-3 text-gray-600">
                            <li>Descripción de procesos.</li>
                            <li>Procedimientos e información empresarial.</li>
                            <li>Documentación y archivos.</li>
                            <li>Logotipos y otros materiales.</li>
                            <li>
                              Información necesaria para diseñar o implementar
                              automatizaciones.
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Presupuestos */}
                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">
                        Presupuestos
                      </h3>

                      <p className="text-gray-600 leading-7">
                        Pueden conservarse los presupuestos emitidos, su
                        contenido económico, documentación asociada y el
                        historial relacionado con su aceptación o rechazo.
                      </p>
                    </div>

                    {/* Facturación */}
                    <div className="border border-gray-200 rounded-xl p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#F5F7FA] flex items-center justify-center">
                          <CreditCard size={20} className="text-[#1E3A8A]" />
                        </div>

                        <div className="flex-1">
                          <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">
                            Facturación y pagos
                          </h3>

                          <p className="text-gray-600 leading-7 mb-4">
                            Cuando existe una relación contractual pueden
                            tratarse datos relacionados con la facturación y
                            los pagos.
                          </p>

                          <ul className="space-y-3 text-gray-600">
                            <li>Importes y bases imponibles.</li>
                            <li>IVA e información fiscal aplicable.</li>
                            <li>IRPF cuando corresponda.</li>
                            <li>Estado de las facturas.</li>
                            <li>Información relacionada con los pagos.</li>
                            <li>
                              Identificadores técnicos relacionados con Stripe
                              y sus sistemas de pago.
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Soporte */}
                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">
                        Soporte y comunicaciones
                      </h3>

                      <p className="text-gray-600 leading-7">
                        Las solicitudes de soporte y comunicaciones con Modira
                        pueden contener información personal, empresarial,
                        documentación o archivos que el usuario decida
                        proporcionar.
                      </p>
                    </div>

                    {/* Actividad */}
                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">
                        Actividad y registros internos
                      </h3>

                      <p className="text-gray-600 leading-7">
                        Para fines de seguridad, trazabilidad, funcionamiento
                        y resolución de incidencias pueden registrarse
                        determinadas acciones realizadas dentro de la
                        plataforma, junto con información técnica, fecha,
                        hora, recurso relacionado y otros datos necesarios
                        para dicha finalidad.
                      </p>
                    </div>
                  </div>
                </section>

                {/* 3. Finalidades */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                      <Scale size={20} className="text-[#1E3A8A]" />
                    </div>

                    <h2 className="text-2xl md:text-3xl font-bold text-[#172554]">
                      3. Para qué utilizamos los datos
                    </h2>
                  </div>

                  <p className="text-gray-600 leading-8 mb-6">
                    Los datos personales pueden tratarse para las siguientes
                    finalidades, dependiendo de la relación que mantengas con
                    Modira:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      "Gestionar solicitudes de auditoría.",
                      "Analizar necesidades y oportunidades empresariales.",
                      "Gestionar cuentas y acceso al Área de Cliente.",
                      "Preparar y gestionar proyectos.",
                      "Elaborar y gestionar presupuestos.",
                      "Gestionar la aceptación y seguimiento de proyectos.",
                      "Prestar servicios de automatización, diseño, desarrollo e integración.",
                      "Gestionar documentación y archivos necesarios para los servicios.",
                      "Gestionar facturación y obligaciones fiscales.",
                      "Gestionar pagos.",
                      "Prestar soporte y atender incidencias.",
                      "Mantener la seguridad y trazabilidad de la plataforma.",
                      "Gestionar el funcionamiento de Modira AI.",
                      "Analizar necesidades para mejorar y configurar los servicios.",
                      "Cumplir obligaciones legales.",
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-xl p-5"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-[#1E3A8A] font-semibold text-sm">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <p className="text-gray-600 leading-6">{item}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 4. Bases jurídicas */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#172554] mb-5">
                    4. Base jurídica del tratamiento
                  </h2>

                  <p className="text-gray-600 leading-8 mb-6">
                    La base jurídica aplicable dependerá del tratamiento
                    concreto realizado. No todos los datos se tratan sobre la
                    misma base jurídica.
                  </p>

                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Ejecución del contrato
                      </h3>
                      <p className="text-gray-600 leading-7">
                        Cuando el tratamiento sea necesario para gestionar una
                        cuenta, prestar un servicio contratado, gestionar un
                        proyecto, emitir una factura o ejecutar las condiciones
                        acordadas.
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Medidas precontractuales
                      </h3>
                      <p className="text-gray-600 leading-7">
                        Cuando sea necesario tratar información para gestionar
                        una solicitud, analizar una necesidad o preparar una
                        posible contratación antes de formalizar el servicio.
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Consentimiento
                      </h3>
                      <p className="text-gray-600 leading-7">
                        Cuando la normativa exija obtener previamente el
                        consentimiento del usuario, como puede ocurrir con
                        determinadas tecnologías de análisis o marketing.
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Obligación legal
                      </h3>
                      <p className="text-gray-600 leading-7">
                        Cuando el tratamiento sea necesario para cumplir
                        obligaciones legales aplicables, especialmente en
                        materia fiscal, contable o de conservación de
                        documentación.
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Interés legítimo
                      </h3>
                      <p className="text-gray-600 leading-7">
                        Cuando proceda y siempre que se hayan realizado las
                        correspondientes ponderaciones y se respeten los
                        derechos y libertades de las personas afectadas.
                      </p>
                    </div>
                  </div>
                </section>

                {/* 5. Modira AI */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                      <Bot size={20} className="text-[#1E3A8A]" />
                    </div>

                    <h2 className="text-2xl md:text-3xl font-bold text-[#172554]">
                      5. Modira AI y conversaciones
                    </h2>
                  </div>

                  <p className="text-gray-600 leading-8 mb-4">
                    Modira puede ofrecer funcionalidades de inteligencia
                    artificial mediante las que un visitante o usuario puede
                    mantener conversaciones relacionadas con sus necesidades
                    empresariales.
                  </p>

                  <p className="text-gray-600 leading-8 mb-4">
                    Las conversaciones pueden conservarse junto con la
                    información necesaria para gestionar la sesión y el
                    funcionamiento del servicio.
                  </p>

                  <p className="text-gray-600 leading-8 mb-4">
                    Según la configuración actualmente prevista, las
                    conversaciones podrán conservarse hasta que un trabajador
                    de Modira proceda a eliminarlas.
                  </p>

                  <p className="text-gray-600 leading-8 mb-4">
                    Las conversaciones pueden ser revisadas por trabajadores
                    autorizados de Modira cuando resulte necesario para la
                    prestación, funcionamiento, soporte, análisis de
                    necesidades o mejora y configuración del servicio.
                  </p>

                  <div className="mt-6 border-l-4 border-[#1E3A8A] bg-[#F8FAFC] px-5 py-4">
                    <p className="text-sm text-gray-600 leading-6">
                      <strong className="text-gray-900">Importante:</strong>{" "}
                      no debe interpretarse que las conversaciones se utilizan
                      para entrenar modelos propios de Modira salvo que esa
                      finalidad se incorpore efectivamente y se informe de ella
                      de forma específica.
                    </p>
                  </div>
                </section>

                {/* 6. OpenAI */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#172554] mb-5">
                    6. Proveedores tecnológicos y OpenAI
                  </h2>

                  <p className="text-gray-600 leading-8 mb-4">
                    Para determinadas funcionalidades de Modira AI se utiliza
                    la API de OpenAI. Las solicitudes necesarias para generar
                    respuestas pueden implicar el envío a OpenAI de la
                    información necesaria para procesar la conversación.
                  </p>

                  <p className="text-gray-600 leading-8 mb-4">
                    La integración se realiza desde el backend de Modira y no
                    mediante la exposición directa de las credenciales de la
                    API en el navegador del usuario.
                  </p>

                  <p className="text-gray-600 leading-8">
                    Antes de publicar definitivamente esta política deberán
                    verificarse las condiciones concretas aplicables a la
                    configuración de OpenAI utilizada por Modira, incluyendo
                    las condiciones de tratamiento, conservación y posibles
                    transferencias internacionales que correspondan.
                  </p>

                  <div className="mt-6 bg-[#F8FAFC] border border-gray-100 rounded-xl p-5">
                    <p className="text-sm text-gray-500 leading-6">
                      La identificación definitiva de proveedores y sus
                      condiciones deberá mantenerse actualizada conforme a los
                      servicios que estén realmente integrados en Modira.
                    </p>
                  </div>
                </section>

                {/* 7. Otros proveedores */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#172554] mb-5">
                    7. Destinatarios y proveedores
                  </h2>

                  <p className="text-gray-600 leading-8 mb-6">
                    Para prestar y gestionar los servicios, Modira puede
                    apoyarse en proveedores tecnológicos que traten
                    determinados datos por cuenta de Modira o intervengan en
                    servicios concretos.
                  </p>

                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Supabase
                      </h3>
                      <p className="text-gray-600 leading-7">
                        Infraestructura utilizada para determinadas funciones
                        de base de datos, autenticación, almacenamiento y
                        backend de la plataforma.
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        OpenAI
                      </h3>
                      <p className="text-gray-600 leading-7">
                        Proveedor utilizado para determinadas funcionalidades
                        de inteligencia artificial mediante su API.
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Stripe
                      </h3>
                      <p className="text-gray-600 leading-7">
                        Proveedor utilizado para procesar pagos realizados
                        mediante los medios de pago habilitados en el Área de
                        Cliente.
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Otros proveedores
                      </h3>
                      <p className="text-gray-600 leading-7">
                        La lista definitiva deberá incluir los servicios de
                        correo electrónico, hosting, analítica, almacenamiento
                        u otros proveedores que estén efectivamente
                        integrados en la plataforma.
                      </p>
                    </div>
                  </div>
                </section>

                {/* 8. Encargados */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#F5F7FA] flex items-center justify-center">
                      <Users size={20} className="text-[#1E3A8A]" />
                    </div>

                    <h2 className="text-2xl md:text-3xl font-bold text-[#172554]">
                      8. Tratamiento de datos por cuenta del cliente
                    </h2>
                  </div>

                  <p className="text-gray-600 leading-8 mb-4">
                    En determinados proyectos, una empresa cliente puede
                    proporcionar a Modira datos personales de sus propios
                    clientes, empleados, proveedores u otras personas para
                    realizar una automatización o prestar un servicio.
                  </p>

                  <p className="text-gray-600 leading-8 mb-4">
                    En estos casos, dependiendo de la naturaleza concreta del
                    tratamiento, Modira podrá actuar como encargado del
                    tratamiento por cuenta de la empresa cliente, que
                    determinará las finalidades y medios correspondientes como
                    responsable del tratamiento.
                  </p>

                  <p className="text-gray-600 leading-8">
                    Cuando resulte necesario, esta relación se regulará
                    mediante el correspondiente Acuerdo de Encargo de
                    Tratamiento, en el que se establecerán las instrucciones,
                    categorías de datos, medidas de seguridad, subencargados y
                    demás obligaciones aplicables.
                  </p>
                </section>

                {/* 9. Conservación */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#F5F7FA] flex items-center justify-center">
                      <Clock3 size={20} className="text-[#1E3A8A]" />
                    </div>

                    <h2 className="text-2xl md:text-3xl font-bold text-[#172554]">
                      9. Conservación de los datos
                    </h2>
                  </div>

                  <p className="text-gray-600 leading-8 mb-5">
                    Los datos se conservarán durante el tiempo necesario para
                    cumplir las finalidades para las que fueron recogidos y,
                    cuando corresponda, durante los períodos exigidos por las
                    obligaciones legales aplicables.
                  </p>

                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Conversaciones de Modira AI
                      </h3>
                      <p className="text-gray-600 leading-7">
                        Según la configuración actualmente definida, podrán
                        conservarse hasta que un trabajador de Modira proceda
                        a eliminarlas.
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Cuenta y proyectos
                      </h3>
                      <p className="text-gray-600 leading-7">
                        Se conservarán mientras resulte necesario para gestionar
                        la cuenta, prestar los servicios, mantener la
                        trazabilidad del proyecto y atender las obligaciones
                        que puedan resultar aplicables.
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Facturación y documentación
                      </h3>
                      <p className="text-gray-600 leading-7">
                        La información fiscal, contable y de facturación se
                        conservará durante los períodos exigidos por la
                        normativa aplicable.
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Otros datos
                      </h3>
                      <p className="text-gray-600 leading-7">
                        Los períodos concretos de conservación para cada
                        categoría deberán definirse y revisarse antes de la
                        publicación definitiva de esta política.
                      </p>
                    </div>
                  </div>
                </section>

                {/* 10. Seguridad */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                      <LockKeyhole size={20} className="text-[#1E3A8A]" />
                    </div>

                    <h2 className="text-2xl md:text-3xl font-bold text-[#172554]">
                      10. Seguridad de los datos
                    </h2>
                  </div>

                  <p className="text-gray-600 leading-8 mb-4">
                    Modira aplica medidas técnicas y organizativas destinadas
                    a proteger los datos frente a accesos no autorizados,
                    pérdida, alteración, destrucción o tratamientos
                    indebidos.
                  </p>

                  <p className="text-gray-600 leading-8 mb-4">
                    La arquitectura de la plataforma utiliza controles de
                    acceso y permisos para limitar el acceso a la información
                    según el usuario, empresa y función correspondiente.
                  </p>

                  <p className="text-gray-600 leading-8">
                    Los documentos almacenados en la plataforma pueden
                    mantenerse en almacenamiento privado y el acceso a
                    determinadas operaciones se realiza mediante servicios de
                    backend y controles de autorización.
                  </p>
                </section>

                {/* 11. Derechos */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#172554] mb-5">
                    11. Tus derechos
                  </h2>

                  <p className="text-gray-600 leading-8 mb-6">
                    Puedes ejercer, cuando resulten aplicables, los derechos
                    reconocidos por la normativa de protección de datos.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      [
                        "Acceso",
                        "Conocer qué datos personales tratamos sobre ti.",
                      ],
                      [
                        "Rectificación",
                        "Solicitar la corrección de datos inexactos o incompletos.",
                      ],
                      [
                        "Supresión",
                        "Solicitar la eliminación de tus datos cuando proceda.",
                      ],
                      [
                        "Oposición",
                        "Oponerte a determinados tratamientos cuando la normativa lo permita.",
                      ],
                      [
                        "Limitación",
                        "Solicitar que se limite el tratamiento en los supuestos previstos legalmente.",
                      ],
                      [
                        "Portabilidad",
                        "Recibir determinados datos en un formato estructurado y de uso habitual cuando proceda.",
                      ],
                    ].map(([title, description], index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-xl p-5"
                      >
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {title}
                        </h3>
                        <p className="text-sm text-gray-500 leading-6">
                          {description}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="text-gray-600 leading-8 mt-6">
                    También podrás retirar un consentimiento previamente
                    otorgado cuando el tratamiento se base en dicho
                    consentimiento, sin que ello afecte a la licitud del
                    tratamiento realizado con anterioridad.
                  </p>

                  <p className="text-gray-600 leading-8 mt-4">
                    Para ejercer tus derechos puedes contactar con nosotros
                    mediante:
                  </p>

                  <div className="mt-5 bg-[#F8FAFC] border border-gray-200 rounded-xl p-6">
                    <p className="text-gray-600">
                      <strong className="text-gray-900">Email:</strong>{" "}
                      contacto@modira.com
                    </p>
                  </div>

                  <p className="text-gray-600 leading-8 mt-5">
                    Asimismo, puedes presentar una reclamación ante la
                    autoridad de protección de datos competente, incluida la
                    Agencia Española de Protección de Datos (AEPD), cuando
                    consideres que el tratamiento de tus datos no se ajusta a
                    la normativa aplicable.
                  </p>
                </section>

                {/* 12. Cookies */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#172554] mb-5">
                    12. Cookies y tecnologías similares
                  </h2>

                  <p className="text-gray-600 leading-8 mb-4">
                    Modira puede utilizar cookies y otras tecnologías similares
                    para garantizar el funcionamiento de la web y, cuando
                    corresponda, realizar análisis de uso u otras finalidades
                    que requieran consentimiento.
                  </p>

                  <p className="text-gray-600 leading-8">
                    Puedes consultar información detallada sobre estas
                    tecnologías y gestionar tus preferencias en nuestra{" "}
                    <button
                      onClick={() => setLocation("/politica-cookies")}
                      className="text-[#1E3A8A] font-medium hover:underline"
                    >
                      Política de Cookies
                    </button>
                    .
                  </p>
                </section>

                {/* 13. Cambios */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#172554] mb-5">
                    13. Cambios en esta política
                  </h2>

                  <p className="text-gray-600 leading-8 mb-4">
                    Podemos actualizar esta Política de Privacidad cuando sea
                    necesario para reflejar cambios en los tratamientos de
                    datos, en los servicios utilizados o en la normativa
                    aplicable.
                  </p>

                  <p className="text-gray-600 leading-8">
                    La versión actualizada se publicará en esta misma página y
                    deberá mantenerse alineada con el funcionamiento real de
                    Modira.
                  </p>
                </section>

                {/* 14. Contacto */}
                <section>
                  <h2 className="text-2xl md:text-3xl font-bold text-[#172554] mb-5">
                    14. Contacto
                  </h2>

                  <p className="text-gray-600 leading-8 mb-6">
                    Si tienes preguntas sobre esta Política de Privacidad o
                    sobre cómo tratamos tus datos personales, puedes contactar
                    con nosotros:
                  </p>

                  <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-6 md:p-7">
                    <div className="space-y-3">
                      <p className="text-gray-600">
                        <strong className="text-gray-900">Email:</strong>{" "}
                        contacto@modira.com
                      </p>

                      <p className="text-gray-600">
                        <strong className="text-gray-900">Asunto:</strong>{" "}
                        Privacidad y protección de datos
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* Pie de página de la propia página legal */}
            <div className="mt-8 text-center">
              <button
                onClick={() => setLocation("/")}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#1E3A8A] hover:text-[#16306F] transition-colors"
              >
                <ArrowLeft size={16} />
                Volver a Modira
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}