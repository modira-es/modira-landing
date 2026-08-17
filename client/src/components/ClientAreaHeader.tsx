import { Button } from "@/components/ui/button";
import { LogOut, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

interface ClientAreaHeaderProps {
  userName: string;
  onLogout: () => void;
}

export default function ClientAreaHeader({
  userName,
  onLogout,
}: ClientAreaHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigationItems = [
    { label: "Mi perfil", path: "#perfil" },
    { label: "Mis proyectos", path: "/area-cliente/proyectos" },
    { label: "Presupuestos", path: "/area-cliente/presupuestos" },
    { label: "Facturación", path: "/area-cliente/facturacion" },
    { label: "Soporte técnico", path: "/area-cliente/soporte" },
    { label: "Ayuda", path: "#ayuda" },
  ];

  const handleNavigation = (path: string) => {
    if (path.startsWith("#")) {
      const element = document.querySelector(path);

      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      setLocation(path);
    }

    setIsOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 w-full h-[80px] z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-[#102A66]/10"
          : "bg-gradient-to-r from-[#102A66] to-[#173B8F] shadow-lg"
      }`}
    >
      <nav className="container mx-auto h-[80px] pl-10 pr-4 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-3 h-full">

          <img
            src={
              isScrolled
                ? import.meta.env.VITE_APP_LOGO_DARK
                : import.meta.env.VITE_APP_LOGO
            }
            alt="Modira"
            className="h-8 w-auto object-contain transition-all duration-300"
          />

          <span
            className={`modira-font text-xl leading-none flex items-center translate-y-[2px] transition-colors duration-300 ${
              isScrolled ? "text-[#102A66]" : "text-white"
            }`}
          >
            MODIRA
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">

          <nav className="flex items-center gap-6">
            {navigationItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavigation(item.path)}
                className={`text-[14px] font-medium transition-colors duration-300 ${
                  isScrolled
                    ? "text-[#102A66]/80 hover:text-[#102A66]"
                    : "text-white/80 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <Button
            onClick={onLogout}
            className={`text-[14px] font-semibold flex gap-2 items-center shadow-md transition-all duration-300 ${
              isScrolled
                ? "bg-[#102A66] text-white hover:bg-[#173B8F]"
                : "bg-white text-[#102A66] hover:bg-white/90"
            }`}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className={`md:hidden transition-colors duration-300 ${
            isScrolled ? "text-[#102A66]" : "text-white"
          }`}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {isOpen && (
        <div
          className={`md:hidden absolute top-[80px] left-0 w-full border-b px-4 py-4 space-y-3 shadow-lg animate-in fade-in slide-in-from-top-2 transition-colors duration-300 ${
            isScrolled
              ? "bg-white border-[#102A66]/10"
              : "bg-[#102A66] border-white/20"
          }`}
        >

          {navigationItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavigation(item.path)}
              className={`block w-full text-left py-2 text-[15px] font-medium transition-colors ${
                isScrolled
                  ? "text-[#102A66]/80 hover:text-[#102A66]"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}

          <Button
            onClick={onLogout}
            className={`w-full text-[15px] font-semibold mt-2 transition-all duration-300 ${
              isScrolled
                ? "bg-[#102A66] text-white hover:bg-[#173B8F]"
                : "bg-white text-[#102A66] hover:bg-white/90"
            }`}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      )}
    </header>
  );
}