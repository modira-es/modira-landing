import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useState, useEffect } from "react";

interface EmployeeAreaHeaderProps {
  userName: string;
  onLogout: () => void;
}

export default function EmployeeAreaHeader({
  userName,
  onLogout,
}: EmployeeAreaHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full h-[80px] z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-[#102A66]/10"
          : "bg-gradient-to-r from-[#102A66] to-[#173B8F] shadow-lg"
      }`}
    >
      <nav className="container mx-auto h-full pl-10 pr-4 flex items-center justify-between">

        {/* LOGO */}
        <div className="flex items-center gap-3 shrink-0 h-full">
          <img
            src={
              isScrolled
                ? import.meta.env.VITE_APP_LOGO_DARK
                : import.meta.env.VITE_APP_LOGO
            }
            alt="Modira"
            className="h-8 w-auto object-contain"
          />

          <span
            className={`modira-font text-xl leading-none flex items-center translate-y-[2px] transition-colors duration-300 ${
              isScrolled ? "text-[#102A66]" : "text-white"
            }`}
          >
            MODIRA EMPLOYEE AREA
          </span>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-4">
          <Button
            onClick={onLogout}
            className={`font-semibold flex gap-2 items-center shadow-md transition-all active:scale-95 ${
              isScrolled
                ? "bg-[#102A66] text-white hover:bg-[#173B8F]"
                : "bg-white text-[#102A66] hover:bg-white/90"
            }`}
          >
            <LogOut className="h-4 w-4" />

            <span className="hidden sm:inline">
              Cerrar sesión
            </span>

            <span className="sm:hidden">
              Salir
            </span>
          </Button>
        </div>

      </nav>
    </header>
  );
}