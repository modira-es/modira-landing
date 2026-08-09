import { Button } from "@/components/ui/button";
import { LogOut, Zap } from "lucide-react";

interface EmployeeAreaHeaderProps {
  userName: string;
  onLogout: () => void;
}

export default function EmployeeAreaHeader({ userName, onLogout }: EmployeeAreaHeaderProps) {
  return (
    <header className="bg-gradient-to-r from-[#102A66] to-[#173B8F] text-white sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          {/* Left: Title and Welcome */}
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-2 rounded-lg hidden sm:block">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Área de Empleados</h1>
              <p className="text-white/80 mt-1">Bienvenido, {userName}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button
              onClick={onLogout}
              className="bg-white text-[#102A66] hover:bg-white/90 font-semibold flex gap-2 items-center shadow-md transition-all active:scale-95"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Cerrar sesión</span>
              <span className="sm:hidden">Salir</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
