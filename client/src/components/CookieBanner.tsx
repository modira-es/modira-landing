import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Cookie } from "lucide-react";

type CookiePreferences = {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
};

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const savedPreferences = localStorage.getItem("cookiePreferences");

    if (!savedPreferences) {
      setShowBanner(true);
    } else {
      const prefs = JSON.parse(savedPreferences);
      setPreferences(prefs);
      loadCookies(prefs);
    }
  }, []);

  const loadCookies = (prefs: CookiePreferences) => {
    const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
    const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;

    if (
      prefs.analytics &&
      endpoint &&
      websiteId &&
      !endpoint.startsWith("%") &&
      !websiteId.startsWith("%")
    ) {
      const script = document.createElement("script");

      script.src = `${endpoint}/umami`;
      script.setAttribute("data-website-id", websiteId);
      script.defer = true;

      document.head.appendChild(script);
    }
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      essential: true,
      analytics: true,
      marketing: true,
    };

    setPreferences(allAccepted);

    localStorage.setItem(
      "cookiePreferences",
      JSON.stringify(allAccepted)
    );

    loadCookies(allAccepted);
    setShowBanner(false);
  };

  const handleRejectOptional = () => {
    const minimal = {
      essential: true,
      analytics: false,
      marketing: false,
    };

    setPreferences(minimal);

    localStorage.setItem(
      "cookiePreferences",
      JSON.stringify(minimal)
    );

    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem(
      "cookiePreferences",
      JSON.stringify(preferences)
    );

    loadCookies(preferences);

    setShowBanner(false);
    setShowSettings(false);
  };

  /*
   * ============================================================
   * BOTÓN FLOTANTE DE COOKIES
   * ============================================================
   *
   * Cuando el banner no está visible, mostramos únicamente
   * un botón circular abajo a la derecha.
   *
   * El chatbot ocupará la posición inferior derecha principal.
   * El botón de cookies queda debajo.
   */

  if (!showBanner && !showSettings) {
    return (
      <button
        type="button"
        onClick={() => setShowSettings(true)}
        aria-label="Gestionar cookies"
        title="Gestionar cookies"
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
                  Utilizamos cookies esenciales para el funcionamiento de
                  la web y opcionales para análisis y marketing. Puedes
                  aceptar todas, rechazar las opcionales o configurar tus
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
                  Aceptar todo
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
              {/* Essential Cookies */}

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Cookies esenciales
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      Necesarias para el funcionamiento básico de la web.
                      No pueden desactivarse.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={preferences.essential}
                    disabled
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Analytics Cookies */}

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Cookies de análisis
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      Nos ayudan a entender cómo usas la web para mejorar
                      tu experiencia.
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
                    className="mt-1 h-5 w-5 cursor-pointer"
                  />
                </div>
              </div>

              {/* Marketing Cookies */}

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Cookies de marketing
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      Utilizadas para mostrar anuncios relevantes y medir
                      su efectividad.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        marketing: e.target.checked,
                      })
                    }
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