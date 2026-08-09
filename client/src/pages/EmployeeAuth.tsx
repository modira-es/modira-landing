import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type AuthMode = "login" | "forgot-password";

export default function EmployeeAuth() {
  const [, setLocation] = useLocation();
  const { signIn, resetPassword, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Login form
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  // Forgot password form
  const [forgotForm, setForgotForm] = useState({ email: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // 1. Autenticación básica con Supabase Auth
      const result = await signIn(loginForm.email, loginForm.password);

      if (!result.success) {
        setError(result.error || "Error al iniciar sesión");
        setLoading(false);
        return;
      }

      // 2. Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError("No se pudo obtener la información del usuario");
        setLoading(false);
        return;
      }

      // 3. Verificar si es un trabajador activo
      const { data: workerData, error: workerError } = await supabase
        .from("workers")
        .select("is_active")
        .eq("auth_user_id", user.id)
        .single();

      if (workerError || !workerData || !workerData.is_active) {
        // Si no es un trabajador activo, cerramos la sesión inmediatamente
        await supabase.auth.signOut();
        setError("No tienes autorización para acceder al área de empleados.");
        setLoading(false);
        return;
      }

      setSuccess("¡Acceso concedido! Redirigiendo al área interna...");
      setTimeout(() => {
        setLocation("/area-empleados");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // 1. Verificación previa de seguridad: ¿Es un trabajador activo?
      // Nota: Hacemos esto antes de llamar a resetPassword para cumplir con el requisito de seguridad.
      const { data: workerData, error: workerError } = await supabase
        .from("workers")
        .select("id")
        .eq("is_active", true)
        // No podemos filtrar por email directamente en workers si no está la columna, 
        // pero la tabla auth.users sí está vinculada. 
        // Usamos una consulta que verifique la existencia en workers para ese email vía rpc o subconsulta si fuera posible,
        // pero dado que no queremos exponer si el email existe, simplemente procedemos con el flujo de Supabase
        // y confiamos en que solo los trabajadores activos recibirán el correo útil si configuramos la redirección.
        
        // Para ser estrictos con "verificar que el email corresponde a un trabajador":
        // Intentamos buscar el profile asociado que tenga el mismo email y sea worker.
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", forgotForm.email)
          .single();
          
        if (profileData) {
          const { data: isWorker } = await supabase
            .from("workers")
            .select("is_active")
            .eq("auth_user_id", profileData.id)
            .eq("is_active", true)
            .single();
            
          if (!isWorker) {
            // No revelamos que no es trabajador, simplemente mostramos el mismo mensaje de éxito
            setSuccess("Si el correo electrónico existe en nuestra base de datos de empleados, recibirás un enlace de recuperación.");
            setLoading(false);
            return;
          }
        }

      const result = await resetPassword(forgotForm.email);

      if (!result.success) {
        // Incluso si falla, mostramos el mismo mensaje por seguridad si es un error de "user not found"
        if (result.error?.includes("not found") || result.error?.includes("invalid")) {
          setSuccess("Si el correo electrónico existe en nuestra base de datos de empleados, recibirás un enlace de recuperación.");
        } else {
          setError(result.error || "Error al solicitar recuperación de contraseña");
        }
        setLoading(false);
        return;
      }

      setSuccess(
        "Se ha enviado un correo de recuperación. Por favor revisa tu bandeja de entrada."
      );
      setTimeout(() => {
        setMode("login");
        setForgotForm({ email: "" });
      }, 3000);
    } catch (err: any) {
      // Mensaje genérico por seguridad
      setSuccess("Si el correo electrónico existe en nuestra base de datos de empleados, recibirás un enlace de recuperación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#F5F7FA] to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-gray-200 shadow-xl">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-[#1E3A8A] mb-2">Modira</h1>
            <h2 className="text-xl font-semibold text-gray-800 mb-1">Área de Empleados</h2>
            <p className="text-gray-600">
              {mode === "login"
                ? "Inicia sesión con tus credenciales internas"
                : "Recupera tu acceso de trabajador"}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <Input
                  type="email"
                  placeholder="empleado@modira.es"
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                  required
                  disabled={loading || authLoading}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }
                    required
                    disabled={loading || authLoading}
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={loading || authLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white font-semibold py-2"
                disabled={loading || authLoading}
              >
                {loading || authLoading ? "Verificando..." : "Iniciar sesión"}
              </Button>

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => setMode("forgot-password")}
                  className="text-sm text-[#1E3A8A] hover:underline"
                  disabled={loading || authLoading}
                >
                  ¿Has olvidado tu contraseña?
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === "forgot-password" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <Input
                  type="email"
                  placeholder="empleado@modira.es"
                  value={forgotForm.email}
                  onChange={(e) =>
                    setForgotForm({ ...forgotForm, email: e.target.value })
                  }
                  required
                  disabled={loading || authLoading}
                  className="w-full"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white font-semibold py-2"
                disabled={loading || authLoading}
              >
                {loading || authLoading ? "Procesando..." : "Solicitar recuperación"}
              </Button>

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-sm text-[#1E3A8A] hover:underline"
                  disabled={loading || authLoading}
                >
                  Volver al inicio de sesión
                </button>
              </div>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
