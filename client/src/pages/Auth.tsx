import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

type AuthMode = "login" | "register" | "forgot-password" | "reset-password";

export default function Auth() {
  const [, setLocation] = useLocation();
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
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    company: "",
  });

  // Forgot password form
  const [forgotForm, setForgotForm] = useState({ email: "" });

  // Reset password form
  const [resetForm, setResetForm] = useState({
    token: "",
    password: "",
    confirmPassword: "",
  });

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();
  const forgotPasswordMutation = trpc.auth.requestPasswordReset.useMutation();
  const resetPasswordMutation = trpc.auth.resetPassword.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await loginMutation.mutateAsync({
        email: loginForm.email,
        password: loginForm.password,
      });

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
    setLoading(true);

    try {
      const result = await registerMutation.mutateAsync({
        name: registerForm.name,
        email: registerForm.email,
        password: registerForm.password,
        confirmPassword: registerForm.confirmPassword,
        company: registerForm.company || undefined,
      });

      setSuccess("¡Cuenta creada exitosamente! Redirigiendo...");
      setTimeout(() => {
        setLocation("/area-cliente");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Error al registrar la cuenta");
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
      await forgotPasswordMutation.mutateAsync({
        email: forgotForm.email,
      });

      setSuccess(
        "Si el correo existe, recibirás un enlace para restablecer tu contraseña"
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await resetPasswordMutation.mutateAsync({
        token: resetForm.token,
        password: resetForm.password,
        confirmPassword: resetForm.confirmPassword,
      });

      setSuccess("¡Contraseña restablecida exitosamente!");
      setTimeout(() => {
        setMode("login");
        setResetForm({ token: "", password: "", confirmPassword: "" });
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Error al restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#F5F7FA] to-white flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-2 border-gray-200 shadow-xl">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#1E3A8A] mb-2">Modira</h1>
            <p className="text-gray-600">
              {mode === "login" && "Inicia sesión en tu cuenta"}
              {mode === "register" && "Crea una nueva cuenta"}
              {mode === "forgot-password" && "Recupera tu contraseña"}
              {mode === "reset-password" && "Establece una nueva contraseña"}
            </p>
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
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white"
              >
                {loading ? "Iniciando sesión..." : "Iniciar sesión"}
              </Button>

              <div className="text-center space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode("forgot-password")}
                  className="text-sm text-[#1E3A8A] hover:underline block w-full"
                >
                  ¿Has olvidado tu contraseña?
                </button>
                <p className="text-sm text-gray-600">
                  ¿No tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="text-[#1E3A8A] hover:underline font-semibold"
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
                  placeholder="Juan García"
                  value={registerForm.name}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, name: e.target.value })
                  }
                  required
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
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Empresa (opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Tu empresa"
                  value={registerForm.company}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      company: e.target.value,
                    })
                  }
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
                {loading ? "Registrando..." : "Crear cuenta"}
              </Button>

              <p className="text-center text-sm text-gray-600 pt-2">
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-[#1E3A8A] hover:underline font-semibold"
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
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Recibirás un enlace para restablecer tu contraseña
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white"
              >
                {loading ? "Enviando..." : "Enviar enlace"}
              </Button>

              <p className="text-center text-sm text-gray-600 pt-2">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-[#1E3A8A] hover:underline font-semibold"
                >
                  Volver al inicio de sesión
                </button>
              </p>
            </form>
          )}

          {/* Reset Password Form */}
          {mode === "reset-password" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Token
                </label>
                <Input
                  type="text"
                  placeholder="Token del enlace de recuperación"
                  value={resetForm.token}
                  onChange={(e) =>
                    setResetForm({ ...resetForm, token: e.target.value })
                  }
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={resetForm.password}
                    onChange={(e) =>
                      setResetForm({
                        ...resetForm,
                        password: e.target.value,
                      })
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
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={resetForm.confirmPassword}
                    onChange={(e) =>
                      setResetForm({
                        ...resetForm,
                        confirmPassword: e.target.value,
                      })
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
                  onClick={() => setMode("login")}
                  className="text-[#1E3A8A] hover:underline font-semibold"
                >
                  Volver al inicio de sesión
                </button>
              </p>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
