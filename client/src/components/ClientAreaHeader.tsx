import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, Zap } from "lucide-react";
import { useState } from "react";
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
    <header className="fixed top-0 left-0 w-full h-[80px] bg-gradient-to-r from-[#102A66] to-[#173B8F] text-white z-50 shadow-lg">
      <nav className="container mx-auto h-full pl-10 pr-4 flex items-center justify-between">

        
       {/* LOGO */}
<div className="flex items-center gap-2 shrink-0">
  <img
    src={import.meta.env.VITE_APP_LOGO}
    alt=""
    className="h-8 w-auto object-contain"
  />

  <span className="text-xl font-bold text-white">
    Modira
  </span>
</div>

        {/* DESKTOP NAVIGATION */}
        <div className="hidden md:flex items-center gap-6">

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
            className="bg-white text-[#102A66] hover:bg-white/90 font-semibold flex gap-2 items-center shadow-md"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>

        {/* MOBILE MENU */}
        <button
          className="md:hidden text-white"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* MOBILE NAVIGATION */}
      {isOpen && (
        <div className="md:hidden absolute top-[72px] left-0 w-full bg-[#102A66] border-b border-white/20 px-4 py-4 space-y-3 shadow-lg">

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
            className="w-full bg-white text-[#102A66] hover:bg-white/90 font-semibold mt-2"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      )}
    </header>
  );
}