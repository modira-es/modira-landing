import Header from "@/components/Header";
import { ArrowLeft, CheckCircle2, BarChart3, ShieldCheck, Settings2 } from "lucide-react";
import { useLocation } from "wouter";

export default function CookiePolicy() {
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

              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1E3A8A] mb-5">
                Política de Cookies
              </h1>

              <p className="text-base md:text-lg text-gray-500 leading-relaxed">
                Información sobre las cookies y tecnologías similares utilizadas
                en la web de Modira y sobre la gestión de tus preferencias.
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

                {/* Introducción */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A] mb-5">
                    ¿Qué son las cookies?
                  </h2>

                  <p className="text-gray-600 leading-8">
                    Las cookies son pequeños archivos de texto que se almacenan
                    en tu dispositivo cuando visitas nuestra web. Nos ayudan a
                    mejorar tu experiencia y a entender cómo utilizas nuestros
                    servicios.
                  </p>

                  <p className="text-gray-600 leading-8 mt-4">
                    Además de cookies, una página web puede utilizar otras
                    tecnologías similares de almacenamiento o lectura de
                    información en el dispositivo del usuario. Esta política
                    se refiere conjuntamente a estas tecnologías cuando sea
                    necesario.
                  </p>
                </section>

                {/* Tipos de cookies */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A] mb-5">
                    Tipos de cookies que utilizamos
                  </h2>

                  <p className="text-gray-600 leading-8 mb-8">
                    En Modira diferenciamos entre las tecnologías necesarias
                    para el funcionamiento de la web y aquellas que requieren
                    que el usuario haya prestado previamente su consentimiento.
                  </p>

                  {/* Esenciales */}
                  <div className="border border-gray-200 rounded-xl p-6 md:p-7 mb-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                        <ShieldCheck
                          size={20}
                          className="text-[#1E3A8A]"
                        />
                      </div>

                      <div className="flex-1">
                        <h3 className="text-lg md:text-xl font-semibold text-[#1E3A8A] mb-3">
                          1. Tecnologías esenciales
                        </h3>

                        <p className="text-gray-600 leading-7 mb-4">
                          Son necesarias para que determinadas funciones de la
                          web puedan funcionar correctamente. Estas tecnologías
                          no se utilizan para realizar análisis publicitario
                          ni para crear perfiles comerciales.
                        </p>

                        <ul className="space-y-3 text-gray-600">
                          <li className="flex items-start gap-3">
                            <CheckCircle2
                              size={18}
                              className="text-[#1E3A8A] mt-1 flex-shrink-0"
                            />
                            <span>Autenticación y seguridad.</span>
                          </li>

                          <li className="flex items-start gap-3">
                            <CheckCircle2
                              size={18}
                              className="text-[#1E3A8A] mt-1 flex-shrink-0"
                            />
                            <span>Funcionamiento básico de determinadas funcionalidades.</span>
                          </li>

                          <li className="flex items-start gap-3">
                            <CheckCircle2
                              size={18}
                              className="text-[#1E3A8A] mt-1 flex-shrink-0"
                            />
                            <span>Gestión de preferencias necesarias para el funcionamiento del servicio.</span>
                          </li>
                        </ul>

                        <div className="mt-5 pt-4 border-t border-gray-100">
                          <p className="text-sm text-gray-500 leading-6">
                            Estas tecnologías pueden utilizarse cuando sean
                            estrictamente necesarias para prestar el servicio
                            solicitado o permitir el funcionamiento de la web.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Analítica */}
                  <div className="border border-gray-200 rounded-xl p-6 md:p-7 mb-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#F5F7FA] flex items-center justify-center">
                        <BarChart3
                          size={20}
                          className="text-[#1E3A8A]"
                        />
                      </div>

                      <div className="flex-1">
                        <h3 className="text-lg md:text-xl font-semibold text-[#1E3A8A] mb-3">
                          2. Tecnologías de análisis
                        </h3>

                        <p className="text-gray-600 leading-7 mb-4">
                          Nos ayudan a entender cómo interactúan los visitantes
                          con nuestra web y a obtener estadísticas que permitan
                          mejorar su funcionamiento y nuestros servicios.
                        </p>

                        <p className="text-gray-600 leading-7">
                          Actualmente, la analítica se encuentra preparada para
                          utilizar <strong>Umami Analytics</strong>, y solo se
                          activa cuando el usuario acepta expresamente las
                          tecnologías de análisis mediante el gestor de
                          preferencias de cookies.
                        </p>

                        <div className="mt-5 bg-[#F8FAFC] border border-gray-100 rounded-lg p-4">
                          <p className="text-sm text-gray-500 leading-6">
                            Si no aceptas las tecnologías de análisis, estas no
                            deberán cargarse con finalidad analítica.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Marketing */}
                  <div className="border border-gray-200 rounded-xl p-6 md:p-7">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#F5F7FA] flex items-center justify-center">
                        <Settings2
                          size={20}
                          className="text-[#1E3A8A]"
                        />
                      </div>

                      <div className="flex-1">
                        <h3 className="text-lg md:text-xl font-semibold text-[#1E3A8A] mb-3">
                          3. Tecnologías de marketing
                        </h3>

                        <p className="text-gray-600 leading-7">
                          Las tecnologías de marketing, publicidad personalizada
                          o remarketing solo podrán utilizarse si se incorporan
                          efectivamente a la web y, cuando resulte necesario,
                          después de obtener el consentimiento correspondiente.
                        </p>

                        <div className="mt-5 bg-[#F8FAFC] border border-gray-100 rounded-lg p-4">
                          <p className="text-sm text-gray-500 leading-6">
                            Actualmente no declaramos herramientas concretas de
                            marketing o remarketing en esta política si no se
                            encuentran realmente implementadas en la web.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Preferencias */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A] mb-5">
                    Gestión del consentimiento
                  </h2>

                  <p className="text-gray-600 leading-8 mb-4">
                    Al acceder a la web, puedes gestionar tus preferencias
                    mediante el banner de cookies. Puedes aceptar todas las
                    categorías disponibles, rechazarlas cuando corresponda o
                    configurar individualmente aquellas que requieren
                    consentimiento.
                  </p>

                  <p className="text-gray-600 leading-8">
                    Las preferencias seleccionadas se guardan en el navegador
                    para recordar tu elección. Esta información de preferencia
                    no debe confundirse con una cookie de análisis o marketing:
                    su finalidad es gestionar el propio consentimiento del
                    usuario.
                  </p>

                  <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-gray-200 rounded-xl p-5">
                      <p className="font-semibold text-[#1E3A8A] mb-2">
                        Aceptar
                      </p>
                      <p className="text-sm text-gray-500 leading-6">
                        Permite las categorías de cookies o tecnologías
                        opcionales seleccionadas.
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-5">
                      <p className="font-semibold text-[#1E3A8A] mb-2">
                        Rechazar
                      </p>
                      <p className="text-sm text-gray-500 leading-6">
                        Impide la activación de las categorías opcionales que
                        requieren consentimiento.
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-5">
                      <p className="font-semibold text-[#1E3A8A] mb-2">
                        Configurar
                      </p>
                      <p className="text-sm text-gray-500 leading-6">
                        Permite elegir individualmente las categorías
                        opcionales disponibles.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Cómo cambiar preferencias */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A] mb-5">
                    Cómo gestionar tus preferencias
                  </h2>

                  <p className="text-gray-600 leading-8 mb-5">
                    Puedes controlar y modificar tus preferencias de varias
                    formas:
                  </p>

                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-start gap-3">
                      <span className="text-[#1E3A8A] font-semibold">01</span>
                      <span>
                        Utilizando nuestro banner de cookies al acceder a la
                        web.
                      </span>
                    </li>

                    <li className="flex items-start gap-3">
                      <span className="text-[#1E3A8A] font-semibold">02</span>
                      <span>
                        Accediendo posteriormente a la opción
                        <strong> "Configurar cookies"</strong> disponible desde
                        el footer.
                      </span>
                    </li>

                    <li className="flex items-start gap-3">
                      <span className="text-[#1E3A8A] font-semibold">03</span>
                      <span>
                        Configurando tu navegador para bloquear o eliminar
                        determinadas cookies.
                      </span>
                    </li>

                    <li className="flex items-start gap-3">
                      <span className="text-[#1E3A8A] font-semibold">04</span>
                      <span>
                        Eliminando manualmente las cookies almacenadas desde
                        las opciones de tu navegador.
                      </span>
                    </li>
                  </ul>

                  <div className="mt-7 border-l-4 border-[#1E3A8A] bg-[#F8FAFC] px-5 py-4">
                    <p className="text-sm text-gray-600 leading-6">
                      <strong className="text-[#1E3A8A]">Importante:</strong>{" "}
                      determinadas tecnologías esenciales son necesarias para
                      el funcionamiento de la web y no pueden desactivarse
                      mediante el gestor de preferencias cuando su uso sea
                      estrictamente necesario.
                    </p>
                  </div>
                </section>

                {/* Duración */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A] mb-5">
                    Duración de las cookies
                  </h2>

                  <p className="text-gray-600 leading-8 mb-4">
                    Las tecnologías de almacenamiento utilizadas en una web
                    pueden tener diferentes períodos de duración.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold text-[#1E3A8A] mb-3">
                        Cookies de sesión
                      </h3>
                      <p className="text-sm text-gray-500 leading-6">
                        Se utilizan durante una sesión de navegación y pueden
                        eliminarse al cerrar el navegador, dependiendo de su
                        configuración.
                      </p>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold text-[#1E3A8A] mb-3">
                        Cookies persistentes
                      </h3>
                      <p className="text-sm text-gray-500 leading-6">
                        Pueden permanecer almacenadas durante un período
                        determinado establecido por la tecnología utilizada.
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 leading-6 mt-5">
                    La duración concreta dependerá de cada tecnología realmente
                    implementada en la web. No se establece en esta política
                    una duración genérica cuando no corresponda a una cookie
                    concreta.
                  </p>
                </section>

                {/* Terceros */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A] mb-5">
                    Cookies de terceros
                  </h2>

                  <p className="text-gray-600 leading-8 mb-4">
                    Determinadas funcionalidades o servicios de terceros pueden
                    utilizar sus propias tecnologías cuando se integren en la
                    web.
                  </p>

                  <p className="text-gray-600 leading-8">
                    La identificación de terceros debe corresponder siempre a
                    los servicios que estén realmente implementados en la web
                    en cada momento. Por ello, esta política podrá actualizarse
                    cuando se incorporen o retiren herramientas de terceros.
                  </p>

                  <div className="mt-6 border border-gray-200 rounded-xl p-6">
                    <h3 className="font-semibold text-[#1E3A8A] mb-3">
                      Analítica
                    </h3>

                    <p className="text-gray-600 leading-7">
                      Cuando la analítica esté habilitada y el usuario haya
                      prestado su consentimiento, puede utilizarse Umami
                      Analytics para obtener estadísticas de uso de la web.
                    </p>
                  </div>
                </section>

                {/* Cumplimiento */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A] mb-5">
                    Cumplimiento legal
                  </h2>

                  <p className="text-gray-600 leading-8">
                    La utilización de cookies y tecnologías similares se
                    gestionará de acuerdo con la normativa española y europea
                    aplicable, incluyendo el Reglamento General de Protección
                    de Datos (RGPD) y la normativa aplicable a los servicios de
                    la sociedad de la información y las comunicaciones
                    electrónicas.
                  </p>

                  <p className="text-gray-600 leading-8 mt-4">
                    Las tecnologías no esenciales que requieran consentimiento
                    no deberán activarse antes de que el usuario haya realizado
                    la elección correspondiente.
                  </p>
                </section>

                {/* Cambios */}
                <section className="pb-10 mb-10 border-b border-gray-100">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A] mb-5">
                    Cambios en esta política
                  </h2>

                  <p className="text-gray-600 leading-8">
                    Podemos actualizar esta Política de Cookies en cualquier
                    momento. Los cambios entrarán en vigor cuando publiquemos
                    la versión actualizada en esta página.
                  </p>

                  <p className="text-gray-600 leading-8 mt-4">
                    La política deberá mantenerse actualizada para reflejar las
                    cookies y tecnologías que estén realmente implementadas en
                    la web en cada momento.
                  </p>
                </section>

                {/* Contacto */}
                <section>
                  <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A] mb-5">
                    Contacto
                  </h2>

                  <p className="text-gray-600 leading-8 mb-6">
                    Si tienes preguntas sobre nuestro uso de cookies, contacta
                    con nosotros:
                  </p>

                  <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-6 md:p-7">
                    <div className="space-y-3">
                      <p className="text-gray-600">
                        <strong className="text-[#1E3A8A]">Email:</strong>{" "}
                        contacto@modira.com
                      </p>

                      <p className="text-gray-600">
                        <strong className="text-[#1E3A8A]">Asunto:</strong>{" "}
                        Política de Cookies
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