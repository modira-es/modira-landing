import { Button } from "@/components/ui/button";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

interface ClientAreaHeaderProps {
  userName: string;
  onLogout: () => void;
}

export default function ClientAreaHeader({ userName, onLogout }: ClientAreaHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();

  const navigationItems = [
    { label: "Mi perfil", path: "#perfil" },
    { label: "Mis proyectos", path: "/area-cliente/proyectos" },
    { label: "Presupuestos", path: "/area-cliente/presupuestos" },
    { label: "Facturación", path: "/area-cliente/facturacion" },
    { label: "Soporte técnico", path: "/area-cliente/soporte" },
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
    <header className="bg-gradient-to-r from-[#102A66] to-[#173B8F] text-white sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          {/* Left: Title and Welcome */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Área de Clientes</h1>
            <p className="text-white/80 mt-1">Bienvenido, {userName}</p>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-6">
              {navigationItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavigation(item.path)}
                  className="text-white/80 hover:text-white transition-colors font-medium text-sm"
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <Button
              onClick={onLogout}
              className="bg-white text-[#102A66] hover:bg-white/90 font-semibold flex gap-2 items-center"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden mt-6 pb-4 space-y-3 border-t border-white/20 pt-4">
            {navigationItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavigation(item.path)}
                className="block w-full text-left py-2 text-white/80 hover:text-white font-medium transition-colors"
              >
                {item.label}
              </button>
            ))}
            <Button
              onClick={onLogout}
              className="w-full bg-white text-[#102A66] hover:bg-white/90 font-semibold mt-4"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
