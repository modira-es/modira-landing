# Sistema de Autenticación - Modira

## Descripción General

El sistema de autenticación de Modira proporciona un sistema completo de gestión de usuarios con registro, login, recuperación de contraseña y gestión de sesiones seguras.

## Características

### 1. Registro de Usuarios

**Endpoint**: `POST /api/trpc/auth.register`

**Campos requeridos**:
- `name`: Nombre y apellidos (mínimo 2 caracteres)
- `email`: Correo electrónico válido
- `password`: Contraseña con requisitos de seguridad
- `confirmPassword`: Confirmación de contraseña
- `company`: (Opcional) Nombre de la empresa

**Requisitos de contraseña**:
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número
- Al menos un carácter especial

**Validaciones**:
- El correo no puede estar registrado previamente
- Las contraseñas deben coincidir
- La contraseña debe cumplir requisitos de seguridad

**Respuesta exitosa**:
```json
{
  "success": true,
  "userId": 1,
  "message": "Usuario registrado exitosamente"
}
```

### 2. Inicio de Sesión

**Endpoint**: `POST /api/trpc/auth.login`

**Campos requeridos**:
- `email`: Correo electrónico
- `password`: Contraseña

**Validaciones**:
- Verifica credenciales contra la base de datos
- Protección contra fuerza bruta (máximo 5 intentos en 15 minutos)
- Verifica que el usuario no esté bloqueado

**Respuesta exitosa**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "Juan García",
    "email": "juan@example.com",
    "role": "user",
    "company": "Mi Empresa"
  }
}
```

### 3. Recuperación de Contraseña

**Paso 1 - Solicitar recuperación**:
- **Endpoint**: `POST /api/trpc/auth.requestPasswordReset`
- **Campo**: `email`
- **Respuesta**: Siempre devuelve éxito (para prevenir enumeración de emails)

**Paso 2 - Verificar token** (Desarrollo):
- **Endpoint**: `GET /api/trpc/auth.verifyResetToken`
- **Parámetro**: `token`

**Paso 3 - Restablecer contraseña**:
- **Endpoint**: `POST /api/trpc/auth.resetPassword`
- **Campos**:
  - `token`: Token de recuperación
  - `password`: Nueva contraseña
  - `confirmPassword`: Confirmación de contraseña

### 4. Obtener Usuario Actual

**Endpoint**: `GET /api/trpc/auth.me`

**Respuesta**:
```json
{
  "id": 1,
  "name": "Juan García",
  "email": "juan@example.com",
  "role": "user",
  "company": "Mi Empresa",
  "status": "active"
}
```

### 5. Cerrar Sesión

**Endpoint**: `POST /api/trpc/auth.logout`

**Respuesta**:
```json
{
  "success": true
}
```

## Seguridad

### Almacenamiento de Contraseñas

Las contraseñas se almacenan usando **bcrypt** con 10 rondas de salt. Nunca se almacenan en texto plano.

### Sesiones

Las sesiones se crean mediante cookies seguras con las siguientes características:

- **httpOnly**: Previene acceso desde JavaScript
- **secure**: Solo se envía por HTTPS en producción
- **sameSite**: Protección contra CSRF
- **maxAge**: Expira en 24 horas

### Protección contra Fuerza Bruta

El sistema registra intentos de login fallidos y bloquea después de 5 intentos fallidos en 15 minutos.

### Validación de Entrada

Todas las entradas se validan y sanitizan antes de procesarlas.

## Base de Datos

### Tabla `users`

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openId VARCHAR(64) UNIQUE,
  name TEXT,
  email VARCHAR(320) UNIQUE,
  passwordHash TEXT,
  company TEXT,
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') DEFAULT 'user',
  status ENUM('active', 'pending', 'blocked') DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  lastSignedIn TIMESTAMP,
  INDEX email_idx (email)
);
```

### Tabla `password_reset_tokens`

```sql
CREATE TABLE password_reset_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  usedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW(),
  INDEX user_id_idx (userId),
  INDEX token_idx (token)
);
```

### Tabla `login_attempts`

```sql
CREATE TABLE login_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(320) NOT NULL,
  success TINYINT NOT NULL,
  ipAddress VARCHAR(45),
  userAgent TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  INDEX email_idx (email),
  INDEX created_at_idx (createdAt)
);
```

## Rutas Frontend

### Autenticación

- `/auth` - Página de login/registro
- `/reset-password?token=<token>` - Página de restablecimiento de contraseña

### Área de Clientes

- `/area-cliente` - Dashboard del cliente (requiere autenticación)

## Uso en Componentes

### Hook `useAuth`

```typescript
import { useAuth } from "@/_core/hooks/useAuth";

export function MyComponent() {
  const { user, isAuthenticated, logout, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;
  if (!isAuthenticated) return <div>No autenticado</div>;

  return (
    <div>
      <p>Bienvenido, {user?.name}</p>
      <button onClick={logout}>Cerrar sesión</button>
    </div>
  );
}
```

### Llamadas tRPC

```typescript
import { trpc } from "@/lib/trpc";

// Registro
const registerMutation = trpc.auth.register.useMutation();
await registerMutation.mutateAsync({
  name: "Juan García",
  email: "juan@example.com",
  password: "SecurePass123!",
  confirmPassword: "SecurePass123!",
});

// Login
const loginMutation = trpc.auth.login.useMutation();
await loginMutation.mutateAsync({
  email: "juan@example.com",
  password: "SecurePass123!",
});

// Obtener usuario actual
const { data: user } = trpc.auth.me.useQuery();

// Logout
const logoutMutation = trpc.auth.logout.useMutation();
await logoutMutation.mutateAsync();
```

## Configuración de Producción

### Variables de Entorno

Asegúrate de configurar estas variables en producción:

```env
NODE_ENV=production
DATABASE_URL=<tu-url-de-base-de-datos>
JWT_SECRET=<tu-secreto-jwt>
```

### Seguridad HTTPS

En producción, asegúrate de:

1. Usar HTTPS para todas las conexiones
2. Configurar `secure: true` en las cookies
3. Usar HSTS (HTTP Strict Transport Security)
4. Implementar CORS correctamente

### Envío de Emails

Para la recuperación de contraseña, implementa el envío de emails:

```typescript
// En server/auth.ts, reemplaza el TODO:
const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
await sendPasswordResetEmail(user.email, resetUrl);
```

## Próximas Mejoras

- [ ] Autenticación de dos factores (2FA)
- [ ] Integración con proveedores OAuth (Google, GitHub)
- [ ] Auditoría de intentos de login
- [ ] Bloqueo de cuenta después de múltiples intentos fallidos
- [ ] Notificaciones de cambio de contraseña
- [ ] Sesiones activas múltiples
- [ ] Revocación de sesiones

## Pruebas

Ejecuta las pruebas de autenticación:

```bash
pnpm test server/auth.test.ts
```

## Soporte

Para reportar problemas o sugerencias, contacta al equipo de desarrollo.
