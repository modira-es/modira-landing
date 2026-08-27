import { CheckCircle, XCircle } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const strength = Object.values(checks).filter(Boolean).length;
  const strengthPercentage = (strength / 5) * 100;

  const getStrengthColor = () => {
    if (strength <= 2) return "bg-red-500";
    if (strength <= 3) return "bg-yellow-500";
    if (strength <= 4) return "bg-blue-500";
    return "bg-green-500";
  };

  const getStrengthLabel = () => {
    if (strength <= 2) return "Débil";
    if (strength <= 3) return "Regular";
    if (strength <= 4) return "Fuerte";
    return "Muy fuerte";
  };

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-gray-600">
            Fortaleza de contraseña
          </span>
          <span className="text-xs font-semibold text-gray-600">
            {getStrengthLabel()}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${getStrengthColor()}`}
            style={{ width: `${strengthPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2 items-center">
          {checks.length ? (
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
          )}
          <span className="text-xs text-gray-600">
            Mínimo 8 caracteres
          </span>
        </div>

        <div className="flex gap-2 items-center">
          {checks.uppercase ? (
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
          )}
          <span className="text-xs text-gray-600">
            Al menos una mayúscula
          </span>
        </div>

        <div className="flex gap-2 items-center">
          {checks.lowercase ? (
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
          )}
          <span className="text-xs text-gray-600">
            Al menos una minúscula
          </span>
        </div>

        <div className="flex gap-2 items-center">
          {checks.number ? (
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
          )}
          <span className="text-xs text-gray-600">
            Al menos un número
          </span>
        </div>

        <div className="flex gap-2 items-center">
          {checks.special ? (
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
          )}
          <span className="text-xs text-gray-600">
            Al menos un carácter especial (!@#$%^&*)
          </span>
        </div>
      </div>
    </div>
  );
}
