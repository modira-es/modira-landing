import { Button } from "@/components/ui/button";
import { LogOut, Zap } from "lucide-react";

interface EmployeeAreaHeaderProps {
  userName: string;
  onLogout: () => void;
}

export default function EmployeeAreaHeader({
  userName,
  onLogout,
}: EmployeeAreaHeaderProps) {
  return (
    <header className="fixed top-0 left-0 w-full h-[80px] bg-gradient-to-r from-[#102A66] to-[#173B8F] text-white z-50 shadow-lg">
      <nav className="container mx-auto h-full pl-10 pr-4 flex items-center justify-between">

        {/* LOGO */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-white/20 p-1.5 rounded-lg">
            <Zap className="h-5 w-5 text-white" />
          </div>

          <span className="text-xl font-bold text-white">
            Modira
          </span>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-4">
          <Button
            onClick={onLogout}
            className="bg-white text-[#102A66] hover:bg-white/90 font-semibold flex gap-2 items-center shadow-md transition-all active:scale-95"
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