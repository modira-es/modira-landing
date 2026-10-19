import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Cookie } from "lucide-react";
import { supabase } from "@/lib/supabase";

type CookiePreferences = {
  essential: true;
  analytics: boolean;
  policyVersion: string;
};

const COOKIE_PREFERENCES_KEY = "cookiePreferences";

/*
 * ============================================================
 * MODIRA — VERSIÓN DE LA POLÍTICA DE COOKIES
 * ============================================================
 *
 * Debe coincidir con la versión vigente utilizada por la RPC
 * record_cookie_consent() en Supabase.
 *
 * Actualmente:
 *
 * 2026-09
 *
 * Si en el futuro se publica una nueva versión que requiera
 * renovar el consentimiento, cambiar este valor.
 */
const COOKIE_POLICY_VERSION = "2026-09";

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: false,
  policyVersion: COOKIE_POLICY_VERSION,
};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

/*
 * ============================================================
 * GOOGLE ANALYTICS
 * ============================================================
 */

function getGoogleAnalyticsId(): string | null {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (
    !measurementId ||
    typeof measurementId !== "string" ||
    measurementId.startsWith("%")
  ) {
    return null;
  }

  return measurementId.trim() || null;
}

/*
 * ============================================================
 * GOOGLE TAG / DATA LAYER
 * ============================================================
 *
 * Crea dataLayer + gtag sin cargar todavía Google Analytics.
 *
 * Esto permite establecer primero el estado de consentimiento.
 */

function initializeGoogleTag() {
  window.dataLayer = window.dataLayer || [];

  window.gtag =
    window.gtag ||
    function (...args: unknown[]) {
      window.dataLayer.push(args);
    };
}

/*
 * ============================================================
 * CONSENTIMIENTO POR DEFECTO
 * ============================================================
 *
 * Todo lo opcional comienza denegado.
 *
 * No utilizamos Google Analytics ni almacenamiento analítico
 * hasta que exista consentimiento.
 */

function setDefaultConsent() {
  initializeGoogleTag();

  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

/*
 * ============================================================
 * ACTUALIZAR CONSENTIMIENTO DE GOOGLE
 * ============================================================
 */

function updateGoogleConsent(analyticsGranted: boolean) {
  initializeGoogleTag();

  window.gtag("consent", "update", {
    analytics_storage: analyticsGranted ? "granted" : "denied",

    /*
     * Modira no utiliza Google Ads ni herramientas de
     * publicidad/remarketing en esta implementación.
     */
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  const measurementId = getGoogleAnalyticsId();

  if (!measurementId) {
    return;
  }

  /*
   * Protección adicional específica de Google Analytics.
   */
  window[`ga-disable-${measurementId}`] = !analyticsGranted;
}

/*
 * ============================================================
 * CARGAR GOOGLE ANALYTICS
 * ============================================================
 *
 * Solo se ejecuta después de que exista consentimiento
 * para analítica.
 */

function loadGoogleAnalytics() {
  const measurementId = getGoogleAnalyticsId();

  if (!measurementId) {
    return;
  }

  /*
   * Evitar cargar el script más de una vez.
   */
  if (document.getElementById("google-analytics-script")) {
    return;
  }

  initializeGoogleTag();

  /*
   * Inicialización estándar de gtag.js.
   */
  window.gtag("js", new Date());

  window.gtag("config", measurementId);

  /*
   * Cargar la etiqueta oficial de Google.
   */
  const script = document.createElement("script");

  script.id = "google-analytics-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    measurementId
  )}`;

  document.head.appendChild(script);
}

/*
 * ============================================================
 * REGISTRO DEL CONSENTIMIENTO
 * ============================================================
 *
 * Registra la decisión en Supabase mediante la RPC pública:
 *
 * record_cookie_consent(boolean)
 *
 * La RPC determina en el servidor:
 *
 * - UUID del registro
 * - fecha/hora
 * - versión de la Política de Cookies
 *
 * El error NO bloquea el funcionamiento del banner.
 *
 * El consentimiento local continúa funcionando aunque
 * temporalmente no pueda registrarse el evento en Supabase.
 */

async function recordCookieConsent(analytics: boolean) {
  try {
    const { error } = await supabase.rpc("record_cookie_consent", {
      p_analytics: analytics,
    });

    if (error) {
      console.error(
        "No se pudo registrar el consentimiento de cookies.",
        error
      );
    }
  } catch (error) {
    console.error(
      "No se pudo registrar el consentimiento de cookies.",
      error
    );
  }
}

/*
 * ============================================================
 * COMPONENTE
 * ============================================================
 */

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [preferences, setPreferences] =
    useState<CookiePreferences>(DEFAULT_PREFERENCES);

  /*
   * ============================================================
   * INICIALIZACIÓN
   * ============================================================
   */

  useEffect(() => {
    /*
     * Siempre establecemos primero el estado seguro:
     * Google Analytics / almacenamiento analítico denegado.
     */
    setDefaultConsent();

    try {
      const savedPreferences = localStorage.getItem(
        COOKIE_PREFERENCES_KEY
      );

      /*
       * Primera visita:
       * no existe una decisión previa.
       */
      if (!savedPreferences) {
        setPreferences(DEFAULT_PREFERENCES);
        setShowBanner(true);

        updateGoogleConsent(false);

        return;
      }

      const parsedPreferences = JSON.parse(savedPreferences);

      /*
       * ========================================================
       * COMPROBAR VERSIÓN DE LA POLÍTICA
       * ========================================================
       *
       * Si la preferencia pertenece a una versión anterior,
       * solicitamos nuevamente la decisión.
       *
       * Esto evita mantener indefinidamente un consentimiento
       * basado en una versión antigua de la política.
       */
      if (
        parsedPreferences?.policyVersion !== COOKIE_POLICY_VERSION
      ) {
        setPreferences(DEFAULT_PREFERENCES);
        setShowBanner(true);

        updateGoogleConsent(false);

        return;
      }

      /*
       * Normalizamos las preferencias almacenadas.
       *
       * essential siempre es true porque las tecnologías
       * necesarias no forman parte de una opción voluntaria.
       */
      const normalizedPreferences: CookiePreferences = {
        essential: true,
        analytics: parsedPreferences?.analytics === true,
        policyVersion: COOKIE_POLICY_VERSION,
      };

      setPreferences(normalizedPreferences);

      /*
       * Aplicar inmediatamente la decisión almacenada.
       */
      updateGoogleConsent(normalizedPreferences.analytics);

      /*
       * Solo cargar Google Analytics si existe consentimiento
       * para analítica.
       */
      if (normalizedPreferences.analytics) {
        loadGoogleAnalytics();
      }
    } catch (error) {
      /*
       * Si el almacenamiento está corrupto:
       *
       * - volvemos al estado seguro
       * - no cargamos Analytics
       * - solicitamos nuevamente las preferencias
       */
      console.error(
        "No se pudieron cargar las preferencias de cookies.",
        error
      );

      setPreferences(DEFAULT_PREFERENCES);
      setShowBanner(true);

      updateGoogleConsent(false);
    }
  }, []);

  /*
   * ============================================================
   * GUARDAR PREFERENCIAS
   * ============================================================
   */

  const savePreferences = (
    newPreferences: CookiePreferences
  ) => {
    const normalizedPreferences: CookiePreferences = {
      essential: true,
      analytics: newPreferences.analytics === true,
      policyVersion: COOKIE_POLICY_VERSION,
    };

    /*
     * ========================================================
     * GUARDAR LOCALMENTE
     * ========================================================
     *
     * Se mantiene el mecanismo existente para recordar la
     * decisión en el navegador.
     */
    try {
      localStorage.setItem(
        COOKIE_PREFERENCES_KEY,
        JSON.stringify(normalizedPreferences)
      );
    } catch (error) {
      console.error(
        "No se pudieron guardar las preferencias de cookies.",
        error
      );
    }

    setPreferences(normalizedPreferences);

    /*
     * ========================================================
     * ACTUALIZAR GOOGLE CONSENT
     * ========================================================
     *
     * Se mantiene exactamente el comportamiento existente.
     */
    updateGoogleConsent(normalizedPreferences.analytics);

    /*
     * Si ha aceptado analítica, cargar Google Analytics.
     */
    if (normalizedPreferences.analytics) {
      loadGoogleAnalytics();
    }

    /*
     * ========================================================
     * REGISTRAR DECISIÓN EN SUPABASE
     * ========================================================
     *
     * Se ejecuta sin bloquear el cierre del banner.
     *
     * Si Supabase no responde, el consentimiento local y el
     * funcionamiento de la web no quedan bloqueados.
     */
    void recordCookieConsent(normalizedPreferences.analytics);

    /*
     * Mantener el comportamiento actual del banner.
     */
    setShowBanner(false);
    setShowSettings(false);
  };

  /*
   * ============================================================
   * ACEPTAR
   * ============================================================
   */

  const handleAcceptAll = () => {
    savePreferences({
      essential: true,
      analytics: true,
      policyVersion: COOKIE_POLICY_VERSION,
    });
  };

  /*
   * ============================================================
   * RECHAZAR
   * ============================================================
   */

  const handleRejectOptional = () => {
    savePreferences({
      essential: true,
      analytics: false,
      policyVersion: COOKIE_POLICY_VERSION,
    });
  };

  /*
   * ============================================================
   * GUARDAR CONFIGURACIÓN
   * ============================================================
   */

  const handleSavePreferences = () => {
    savePreferences(preferences);
  };

  /*
   * ============================================================
   * BOTÓN FLOTANTE
   * ============================================================
   */

  if (!showBanner && !showSettings) {
    return (
      <button
        type="button"
        onClick={() => setShowSettings(true)}
        aria-label="Gestionar preferencias de cookies"
        title="Gestionar preferencias de cookies"
        className="
          fixed
          bottom-6
          left-6
          z-40
          flex
          size-14
          items-center
          justify-center
          rounded-full
          border
          border-gray-200
          bg-white
          text-[#1E3A8A]
          shadow-lg
          transition-all
          duration-200
          hover:scale-105
          hover:shadow-xl
          active:scale-95
        "
      >
        <Cookie className="size-6" strokeWidth={2} />
      </button>
    );
  }

  return (
    <>
      {/* ========================================================
          COOKIE BANNER
          ======================================================== */}

      {showBanner && !showSettings && (
        <div
          className="
            fixed
            bottom-0
            left-0
            right-0
            z-50
            border-t
            border-gray-200
            bg-white
            shadow-2xl
            animate-in
            slide-in-from-bottom
          "
        >
          <div className="container-lg mx-auto px-4 py-6 md:py-4">
            <div
              className="
                flex
                flex-col
                items-start
                justify-between
                gap-4
                md:flex-row
                md:items-center
              "
            >
              <div className="flex-1">
                <h3 className="mb-2 font-bold text-gray-900">
                  Configuración de cookies
                </h3>

                <p className="text-sm text-gray-600 md:mb-0">
                  Utilizamos tecnologías necesarias para el funcionamiento
                  de la web y, si das tu consentimiento, Google Analytics
                  para analizar el uso de la web y mejorar nuestros
                  servicios. Puedes aceptar, rechazar o configurar tus
                  preferencias.
                </p>
              </div>

              <div
                className="
                  flex
                  w-full
                  flex-shrink-0
                  gap-3
                  md:w-auto
                "
              >
                <Button
                  onClick={handleRejectOptional}
                  variant="outline"
                  className="
                    flex-1
                    border-gray-300
                    text-gray-700
                    hover:bg-gray-50
                    md:flex-none
                  "
                >
                  Rechazar
                </Button>

                <Button
                  onClick={() => setShowSettings(true)}
                  variant="outline"
                  className="
                    flex-1
                    border-[#1E3A8A]
                    text-[#1E3A8A]
                    hover:bg-[#1E3A8A]/5
                    md:flex-none
                  "
                >
                  Configurar
                </Button>

                <Button
                  onClick={handleAcceptAll}
                  className="
                    flex-1
                    bg-[#1E3A8A]
                    text-white
                    hover:bg-[#1E3A8A]/90
                    md:flex-none
                  "
                >
                  Aceptar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          COOKIE SETTINGS MODAL
          ======================================================== */}

      {showSettings && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/50
            p-4
          "
        >
          <div
            className="
              max-h-[90vh]
              w-full
              max-w-2xl
              overflow-y-auto
              rounded-2xl
              bg-white
            "
          >
            {/* HEADER */}

            <div
              className="
                sticky
                top-0
                flex
                items-center
                justify-between
                border-b
                border-gray-200
                bg-white
                p-6
              "
            >
              <h2 className="text-2xl font-bold text-[#1E3A8A]">
                Preferencias de cookies
              </h2>

              <button
                type="button"
                onClick={() => setShowSettings(false)}
                aria-label="Cerrar preferencias"
                className="
                  text-gray-400
                  transition-colors
                  hover:text-gray-600
                "
              >
                <X size={24} />
              </button>
            </div>

            {/* CONTENT */}

            <div className="space-y-6 p-6">
              {/* TECNOLOGÍAS NECESARIAS */}

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Tecnologías necesarias
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      Necesarias para el funcionamiento básico, la
                      seguridad y las funcionalidades esenciales de la
                      web. No pueden desactivarse.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    aria-label="Tecnologías necesarias siempre activas"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* ANALÍTICA */}

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Analítica
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      Google Analytics se utiliza para obtener
                      información estadística sobre el uso de la web
                      y ayudarnos a analizar y mejorar nuestros
                      servicios. Solo se activa si prestas tu
                      consentimiento.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        analytics: e.target.checked,
                      })
                    }
                    aria-label="Permitir Google Analytics"
                    className="mt-1 h-5 w-5 cursor-pointer"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-600">
                Para más información, consulta nuestra{" "}
                <a
                  href="/politica-cookies"
                  className="text-[#1E3A8A] hover:underline"
                >
                  Política de Cookies
                </a>
                .
              </p>
            </div>

            {/* FOOTER */}

            <div
              className="
                sticky
                bottom-0
                flex
                gap-3
                border-t
                border-gray-200
                bg-gray-50
                p-6
              "
            >
              <Button
                onClick={() => setShowSettings(false)}
                variant="outline"
                className="
                  flex-1
                  border-gray-300
                  text-gray-700
                  hover:bg-gray-100
                "
              >
                Cancelar
              </Button>

              <Button
                onClick={handleSavePreferences}
                className="
                  flex-1
                  bg-[#1E3A8A]
                  text-white
                  hover:bg-[#1E3A8A]/90
                "
              >
                Guardar preferencias
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}