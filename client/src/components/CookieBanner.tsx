import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Settings } from "lucide-react";

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
    // Check if user has already made a choice
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

    if (prefs.analytics && endpoint && websiteId && !endpoint.startsWith('%') && !websiteId.startsWith('%')) {
      // Load analytics script
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
    localStorage.setItem("cookiePreferences", JSON.stringify(allAccepted));
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
    localStorage.setItem("cookiePreferences", JSON.stringify(minimal));
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem("cookiePreferences", JSON.stringify(preferences));
    loadCookies(preferences);
    setShowBanner(false);
    setShowSettings(false);
  };

  if (!showBanner && !showSettings) {
    return (
      <button
        onClick={() => setShowSettings(true)}
        className="fixed bottom-4 right-4 text-xs text-gray-600 hover:text-[#1E3A8A] underline z-40"
      >
        Configurar cookies
      </button>
    );
  }

  return (
    <>
      {/* Cookie Banner */}
      {showBanner && !showSettings && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50 animate-in slide-in-from-bottom">
          <div className="container-lg mx-auto px-4 py-6 md:py-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2">
                  Configuración de cookies
                </h3>
                <p className="text-sm text-gray-600 mb-4 md:mb-0">
                  Utilizamos cookies esenciales para el funcionamiento de la web y opcionales para análisis y marketing. Puedes aceptar todas, rechazar las opcionales o configurar tus preferencias.
                </p>
              </div>
              <div className="flex gap-3 w-full md:w-auto flex-shrink-0">
                <Button
                  onClick={handleRejectOptional}
                  variant="outline"
                  className="flex-1 md:flex-none border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Rechazar
                </Button>
                <Button
                  onClick={() => setShowSettings(true)}
                  variant="outline"
                  className="flex-1 md:flex-none border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#1E3A8A]/5"
                >
                  Configurar
                </Button>
                <Button
                  onClick={handleAcceptAll}
                  className="flex-1 md:flex-none bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white"
                >
                  Aceptar todo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#1E3A8A]">
                Preferencias de cookies
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Essential Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">Cookies esenciales</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Necesarias para el funcionamiento básico de la web. No pueden desactivarse.
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
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">Cookies de análisis</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Nos ayudan a entender cómo usas la web para mejorar tu experiencia.
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
                    className="mt-1 w-5 h-5 cursor-pointer"
                  />
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">Cookies de marketing</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Utilizadas para mostrar anuncios relevantes y medir su efectividad.
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
                    className="mt-1 w-5 h-5 cursor-pointer"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-600">
                Para más información, consulta nuestra{" "}
                <a href="/politica-cookies" className="text-[#1E3A8A] hover:underline">
                  Política de Cookies
                </a>
                .
              </p>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-3">
              <Button
                onClick={() => setShowSettings(false)}
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSavePreferences}
                className="flex-1 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white"
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
