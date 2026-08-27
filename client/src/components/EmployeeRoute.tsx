import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";

interface EmployeeRouteProps {
  children: React.ReactNode;
}

export default function EmployeeRoute({ children }: EmployeeRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isWorker, setIsWorker] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkWorkerStatus = async () => {
      if (authLoading) return;

      if (!user) {
        setIsWorker(false);
        setLoading(false);
        setLocation("/empleados/login");
        return;
      }

      try {
        // Consultamos si el usuario es un trabajador activo
        const { data, error } = await supabase
          .from("workers")
          .select("is_active")
          .eq("auth_user_id", user.id)
          .single();

        if (error || !data || !data.is_active) {
          setIsWorker(false);
          // Si no es trabajador, redirigimos al login de empleados
          setLocation("/empleados/login");
        } else {
          setIsWorker(true);
        }
      } catch (err) {
        console.error("[EmployeeRoute] Error checking worker status:", err);
        setIsWorker(false);
        setLocation("/empleados/login");
      } finally {
        setLoading(false);
      }
    };

    checkWorkerStatus();
  }, [user, authLoading, setLocation]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-[#F5F7FA] to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2 border-gray-200 shadow-xl">
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A]"></div>
            <p className="mt-4 text-gray-600">Verificando acceso de empleado...</p>
          </div>
        </Card>
      </div>
    );
  }

  return isWorker ? <>{children}</> : null;
}
