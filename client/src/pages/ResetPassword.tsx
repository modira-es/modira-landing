import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const verifyTokenMutation = trpc.auth.verifyResetToken.useQuery(
    { token },
    { enabled: !!token && verifying }
  );

  const resetPasswordMutation = trpc.auth.resetPassword.useMutation();

  // Extract token from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");

    if (!tokenParam) {
      setError("Token no encontrado en la URL");
      setVerifying(false);
      return;
    }

    setToken(tokenParam);
  }, []);

  // Verify token
  useEffect(() => {
    if (verifyTokenMutation.isSuccess && verifyTokenMutation.data?.valid) {
      setTokenValid(true);
      setVerifying(false);
    } else if (verifyTokenMutation.isError) {
      setError("El token es inválido o ha expirado");
      setVerifying(false);
    }
  }, [verifyTokenMutation.isSuccess, verifyTokenMutation.isError, verifyTokenMutation.data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (form.password !== form.confirmPassword) {
        setError("Las contraseñas no coinciden");
        setLoading(false);
        return;
      }

      await resetPasswordMutation.mutateAsync({
        token,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      setSuccess("¡Contraseña restablecida exitosamente!");
      setTimeout(() => {
        setLocation("/auth");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Error al restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-[#F5F7FA] to-white flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-2 border-gray-200 shadow-xl p-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A]"></div>
            <p className="mt-4 text-gray-600">Verificando token...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-[#F5F7FA] to-white flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-2 border-gray-200 shadow-xl">
          <div className="p-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-[#1E3A8A] mb-2">Modira</h1>
              <p className="text-gray-600">Token inválido o expirado</p>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 mb-6">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                {error || "El enlace de recuperación es inválido o ha expirado. Por favor, solicita uno nuevo."}
              </p>
            </div>

            <Button
              onClick={() => setLocation("/auth")}
              className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white"
            >
              Volver al inicio de sesión
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#F5F7FA] to-white flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-2 border-gray-200 shadow-xl">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#1E3A8A] mb-2">Modira</h1>
            <p className="text-gray-600">Establece una nueva contraseña</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nueva contraseña
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Mínimo 8 caracteres, mayúsculas, minúsculas, números y caracteres especiales
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirmar contraseña
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    setForm({ ...form, confirmPassword: e.target.value })
                  }
                  required
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white"
            >
              {loading ? "Restableciendo..." : "Restablecer contraseña"}
            </Button>

            <p className="text-center text-sm text-gray-600 pt-2">
              <button
                type="button"
                onClick={() => setLocation("/auth")}
                className="text-[#1E3A8A] hover:underline font-semibold"
              >
                Volver al inicio de sesión
              </button>
            </p>
          </form>
        </div>
      </Card>
    </div>
  );
}
