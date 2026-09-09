import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface ClientRouteProps {
  children: ReactNode;
}

type AccessStatus =
  | "loading"
  | "client"
  | "worker-active"
  | "worker-inactive";

export default function ClientRoute({
  children,
}: ClientRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [status, setStatus] =
    useState<AccessStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      if (authLoading) {
        return;
      }

      if (!user) {
        if (!cancelled) {
          setStatus("loading");
          setLocation("/auth");
        }

        return;
      }

      try {
        /*
         * Primero comprobamos si la cuenta pertenece a un worker.
         *
         * Esta RPC comprueba únicamente si existe un registro
         * en public.workers para el usuario autenticado.
         *
         * Es necesaria porque la RLS de public.workers limita
         * el SELECT a cuentas activas. Por tanto, una consulta
         * directa a workers no permite distinguir correctamente
         * entre "no es worker" y "es worker pero está inactivo".
         */
        const {
          data: isWorkerAccount,
          error: workerAccountError,
        } = await supabase.rpc(
          "current_user_is_worker_account"
        );

        if (workerAccountError) {
          console.error(
            "[ClientRoute] Error checking worker account:",
            workerAccountError
          );

          if (!cancelled) {
            setStatus("loading");
            setLocation("/auth");
          }

          return;
        }

        /*
         * No es worker:
         * acceso normal al Área Cliente.
         */
        if (!isWorkerAccount) {
          if (!cancelled) {
            setStatus("client");
          }

          return;
        }

        /*
         * Es worker.
         *
         * La consulta directa a workers queda protegida por RLS.
         * Para una cuenta activa, la propia fila será visible.
         *
         * Si la cuenta worker está inactiva/bloqueada, la RLS
         * puede impedir que la fila sea visible. En ese caso
         * tratamos la ausencia de fila como worker inactivo.
         */
        const {
          data: worker,
          error: workerError,
        } = await supabase
          .from("workers")
          .select("is_active")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (workerError) {
          console.error(
            "[ClientRoute] Error checking worker status:",
            workerError
          );

          /*
           * Si sabemos que es worker pero no podemos determinar
           * su estado mediante la consulta protegida, no damos
           * acceso al Área Cliente.
           */
          if (!cancelled) {
            setStatus("worker-inactive");
            setLocation("/empleados/login");
          }

          return;
        }

        /*
         * Worker activo.
         */
        if (worker?.is_active === true) {
          if (!cancelled) {
            setStatus("worker-active");
            setLocation("/area-empleados");
          }

          return;
        }

        /*
         * Worker inactivo o sin fila visible por RLS.
         */
        if (!cancelled) {
          setStatus("worker-inactive");
          setLocation("/empleados/login");
        }
      } catch (error) {
        console.error(
          "[ClientRoute] Unexpected access error:",
          error
        );

        /*
         * Fail closed ante cualquier error inesperado.
         */
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

  if (
    authLoading ||
    status === "loading"
  ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-[#F5F7FA] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A]" />

          <p className="mt-4 text-gray-600">
            Comprobando acceso...
          </p>
        </div>
      </div>
    );
  }

  if (
    status === "worker-active" ||
    status === "worker-inactive"
  ) {
    return null;
  }

  return <>{children}</>;
}