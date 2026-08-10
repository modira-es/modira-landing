import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";

interface ClientRouteProps {
  children: ReactNode;
}

type AccessStatus = "loading" | "client" | "worker-active" | "worker-inactive";

export default function ClientRoute({ children }: ClientRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [status, setStatus] = useState<AccessStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      if (authLoading) return;

      if (!user) {
        if (!cancelled) {
          setStatus("loading");
          setLocation("/auth");
        }
        return;
      }

      try {
        // 1. Comprobar si la cuenta pertenece a workers.
        const { data: workerAccount, error: workerAccountError } =
          await supabase.rpc("current_user_is_worker_account");

        if (workerAccountError) {
          console.error(
            "[ClientRoute] Error checking worker account:",
            workerAccountError
          );

          // En caso de error no concedemos acceso por defecto.
          if (!cancelled) {
            setStatus("loading");
            setLocation("/auth");
          }

          return;
        }

        // 2. Usuario que NO pertenece a workers:
        //    comportamiento normal del Área Cliente.
        if (!workerAccount) {
          if (!cancelled) {
            setStatus("client");
          }

          return;
        }

        // 3. Existe como trabajador.
        //    Ahora comprobamos si está activo.
        const { data: activeWorker, error: activeWorkerError } =
          await supabase
            .from("workers")
            .select("is_active")
            .eq("auth_user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();

        if (activeWorkerError) {
          console.error(
            "[ClientRoute] Error checking worker status:",
            activeWorkerError
          );

          if (!cancelled) {
            setStatus("loading");
            setLocation("/auth");
          }

          return;
        }

        // 4. Trabajador activo:
        //    NO puede acceder al Área Cliente.
        if (activeWorker) {
          if (!cancelled) {
            setStatus("worker-active");
            setLocation("/area-empleados");
          }

          return;
        }

        // 5. Existe como trabajador pero está inactivo:
        //    NO puede acceder al Área Cliente.
        if (!cancelled) {
          setStatus("worker-inactive");
          setLocation("/empleados/login");
        }
      } catch (error) {
        console.error("[ClientRoute] Unexpected access error:", error);

        if (!cancelled) {
          setStatus("loading");
          setLocation("/auth");
        }
      }
    };

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, setLocation]);

  if (authLoading || status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-[#F5F7FA] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A]"></div>
          <p className="mt-4 text-gray-600">Comprobando acceso...</p>
        </div>
      </div>
    );
  }

  if (status === "worker-active" || status === "worker-inactive") {
    return null;
  }

  return <>{children}</>;
}