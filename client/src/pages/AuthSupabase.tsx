import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type AuthMode = "login" | "register" | "forgot-password";

export default function AuthSupabase() {
  const [, setLocation] = useLocation();
  const { signIn, signUp, resetPassword, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Login form
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  // Register form
  const [registerForm, setRegisterForm] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmPassword: "",
    empresa: "",
  });

  // Forgot password form
  const [forgotForm, setForgotForm] = useState({ email: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await signIn(loginForm.email, loginForm.password);

      if (!result.success) {
        setError(result.error || "Error al iniciar sesión");
        return;
      }

      setSuccess("¡Iniciaste sesión exitosamente!");
      setTimeout(() => {
        setLocation("/area-cliente");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validations
    if (!registerForm.nombre.trim()) {
      setError("El nombre es requerido");
      return;
    }

    if (!registerForm.email.includes("@")) {
      setError("El correo electrónico no es válido");
      return;
    }

    if (registerForm.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      const result = await signUp(
        registerForm.email,
        registerForm.password,
        registerForm.nombre,
        registerForm.empresa
      );

      if (!result.success) {
        setError(result.error || "Error al registrarse");
        return;
      }

      setSuccess(
        "¡Registro exitoso! Por favor verifica tu correo electrónico para confirmar tu cuenta."
      );
      setTimeout(() => {
        setMode("login");
        setRegisterForm({
          nombre: "",
          email: "",
          password: "",
          confirmPassword: "",
          empresa: "",
        });
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await resetPassword(forgotForm.email);

      if (!result.success) {
        setError(result.error || "Error al solicitar recuperación de contraseña");
        return;
      }

      setSuccess(
        "Se ha enviado un correo de recuperación. Por favor revisa tu bandeja de entrada."
      );
      setTimeout(() => {
        setMode("login");
        setForgotForm({ email: "" });
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Error al solicitar recuperación de contraseña");
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
            <p className="text-gray-600">
              {mode === "login"
                ? "Inicia sesión en tu cuenta"
                : mode === "register"
                ? "Crea una nueva cuenta"
                : "Recupera tu contraseña"}
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
                  placeholder="tu@email.com"
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
                {loading || authLoading ? "Iniciando sesión..." : "Iniciar sesión"}
              </Button>

              <div className="text-center space-y-2 pt-4">
                <button
                  type="button"
                  onClick={() => setMode("forgot-password")}
                  className="text-sm text-[#1E3A8A] hover:underline"
                  disabled={loading || authLoading}
                >
                  ¿Has olvidado tu contraseña?
                </button>
                <p className="text-sm text-gray-600">
                  ¿No tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="text-[#1E3A8A] hover:underline font-semibold"
                    disabled={loading || authLoading}
                  >
                    Regístrate
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Register Form */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre y apellidos
                </label>
                <Input
                  type="text"
                  placeholder="Juan Pérez"
                  value={registerForm.nombre}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, nombre: e.target.value })
                  }
                  required
                  disabled={loading || authLoading}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Empresa (opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Mi Empresa S.L."
                  value={registerForm.empresa}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, empresa: e.target.value })
                  }
                  disabled={loading || authLoading}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, email: e.target.value })
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
                    value={registerForm.password}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        password: e.target.value,
                      })
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
                <PasswordStrengthIndicator password={registerForm.password} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={registerForm.confirmPassword}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                    disabled={loading || authLoading}
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={loading || authLoading}
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
                className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white font-semibold py-2"
                disabled={loading || authLoading}
              >
                {loading || authLoading ? "Registrando..." : "Registrarse"}
              </Button>

              <p className="text-center text-sm text-gray-600 pt-4">
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-[#1E3A8A] hover:underline font-semibold"
                  disabled={loading || authLoading}
                >
                  Inicia sesión
                </button>
              </p>
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
                  placeholder="tu@email.com"
                  value={forgotForm.email}
                  onChange={(e) =>
                    setForgotForm({ email: e.target.value })
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
                {loading || authLoading
                  ? "Enviando..."
                  : "Enviar enlace de recuperación"}
              </Button>

              <p className="text-center text-sm text-gray-600 pt-4">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-[#1E3A8A] hover:underline font-semibold"
                  disabled={loading || authLoading}
                >
                  Volver al login
                </button>
              </p>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
