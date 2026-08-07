# CONTEXT.md - Modira: Automatización Inteligente para PYMEs

## 📋 Resumen Ejecutivo

**Modira** es una plataforma SaaS de automatización de procesos empresariales diseñada para pequeñas y medianas empresas (PYMEs). El sitio web combina una landing page moderna con un sistema completo de autenticación, área de clientes privada y preparación para futuras funcionalidades de gestión de proyectos, presupuestos, facturas y tickets de soporte.

**Estado Actual**: Sistema de autenticación funcional con Supabase. Landing page completa. Área de clientes con sistema de presupuestos y pagos Stripe integrado.

---

## 🎯 Objetivo del Proyecto

Crear una plataforma SaaS completa que permita a las PYMEs:
1. Automatizar procesos repetitivos (recuperar 10-30 horas semanales)
2. Conectar herramientas existentes sin código
3. Crear flujos inteligentes adaptados a su negocio
4. Gestionar automatizaciones, proyectos, presupuestos y facturas en un único lugar

**Propuesta de Valor**:
- 80% reducción de trabajo manual
- 500+ procesos automatizados
- Planes escalables (Essential, Growth, Business)
- Soporte dedicado según plan

---

## 🏗️ Decisiones de Arquitectura

### Stack Tecnológico

| Capa | Tecnología | Razón |
|------|-----------|-------|
| **Frontend** | React 19 + TypeScript | Componentes modernos, type-safe |
| **Styling** | Tailwind CSS 4 + shadcn/ui | Diseño consistente, componentes reutilizables |
| **Routing** | Wouter | Lightweight, sin dependencias pesadas |
| **Backend** | Express.js + tRPC | Type-safe RPC, sin REST boilerplate |
| **Database** | PostgreSQL (Supabase) | Escalable, RLS integrado, serverless |
| **Auth** | Supabase Authentication | OAuth, email/password, recuperación segura |
| **Build** | Vite + esbuild | Fast refresh, bundling rápido |
| **Testing** | Vitest | Unit tests rápidos |

### Decisiones Clave

1. **Supabase en lugar de backend personalizado**: 
   - RLS nativo para seguridad de datos
   - Autenticación manejada
   - Escalable sin gestión de servidores
   - PostgreSQL completo

2. **tRPC en lugar de REST**:
   - Type safety end-to-end
   - Sin duplicación de tipos
   - Menor boilerplate
   - Mejor DX

3. **Tailwind + shadcn/ui en lugar de CSS personalizado**:
   - Consistencia visual garantizada
   - Componentes accesibles
   - Mantenimiento más fácil
   - Temas escalables

4. **Autenticación local + Supabase**:
   - Email/contraseña para registro directo
   - Sesiones persistentes
   - Recuperación de contraseña
   - Preparado para OAuth futuro

---

## 🗂️ Estructura de Carpetas

```
modira-landing/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx                    # Landing page principal
│   │   │   ├── AuthSupabase.tsx            # Login/registro/recuperación
│   │   │   ├── ResetPasswordSupabase.tsx   # Restablecimiento de contraseña
│   │   │   ├── ClientAreaSupabase.tsx      # Área privada del cliente
│   │   │   ├── AdminPanel.tsx              # Panel de administración (base)
│   │   │   ├── Billing.tsx                 # Página de facturación
│   │   │   ├── PrivacyPolicy.tsx           # Política de privacidad
│   │   │   ├── CookiePolicy.tsx            # Política de cookies
│   │   │   ├── TermsOfService.tsx          # Términos de servicio
│   │   │   ├── LegalNotice.tsx             # Aviso legal
│   │   │   └── NotFound.tsx                # Página 404
│   │   ├── components/
│   │   │   ├── Header.tsx                  # Navegación principal
│   │   │   ├── Footer.tsx                  # Pie de página
│   │   │   ├── CookieBanner.tsx            # Banner de cookies
│   │   │   ├── ErrorBoundary.tsx           # Manejo de errores
│   │   │   ├── ProtectedRouteSupabase.tsx  # Protección de rutas
│   │   │   ├── PasswordStrengthIndicator.tsx # Indicador de fortaleza
│   │   │   ├── DashboardLayout.tsx         # Layout de dashboard
│   │   │   ├── AIChatBox.tsx               # Chat de IA (no usado)
│   │   │   ├── Map.tsx                     # Integración Google Maps
│   │   │   └── ui/                         # shadcn/ui components
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx             # Contexto de autenticación
│   │   │   └── ThemeContext.tsx            # Contexto de tema
│   │   ├── hooks/
│   │   │   └── useAuth.ts                  # Hook de autenticación
│   │   ├── lib/
│   │   │   ├── trpc.ts                     # Cliente tRPC
│   │   │   └── supabase.ts                 # Cliente Supabase
│   │   ├── App.tsx                         # Rutas principales
│   │   ├── main.tsx                        # Entry point
│   │   └── index.css                       # Estilos globales
│   ├── public/
│   │   ├── favicon.ico
│   │   └── robots.txt
│   ├── index.html
│   └── vite.config.ts
├── server/
│   ├── routers/
│   │   ├── auth.ts                         # Procedimientos de autenticación
│   │   └── admin.ts                        # Procedimientos de administración
│   ├── routers.ts                          # Router principal
│   ├── db.ts                               # Helpers de base de datos
│   ├── auth.ts                             # Funciones de autenticación
│   ├── auth.test.ts                        # Tests de autenticación
│   └── _core/
│       ├── index.ts                        # Servidor Express
│       ├── context.ts                      # Contexto de tRPC
│       ├── trpc.ts                         # Configuración tRPC
│       ├── cookies.ts                      # Manejo de cookies
│       ├── env.ts                          # Variables de entorno
│       └── systemRouter.ts                 # Router de sistema
├── drizzle/
│   ├── schema.ts                           # Schema de base de datos (DEPRECATED)
│   └── migrations/
│       └── *.sql                           # Migraciones (DEPRECATED)
├── supabase/
│   └── migrations/
│       ├── 001_create_profiles_table.sql   # Schema inicial
│       └── 002_fix_handle_new_user_simple.sql # Corrección de trigger
├── storage/
│   └── index.ts                            # Helpers de S3
├── shared/
│   ├── const.ts                            # Constantes compartidas
│   └── types.ts                            # Tipos compartidos
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
├── CONTEXT.md                              # Este archivo
├── AUTHENTICATION.md                       # Documentación de autenticación
└── todo-qc7nnq03.md                        # Tareas pendientes
```

---

## 🔐 Sistema de Autenticación

### Flujo de Registro

```
1. Usuario accede a /auth
2. Completa formulario de registro (nombre, email, contraseña, empresa)
3. Frontend valida:
   - Email válido
   - Contraseña >= 8 caracteres
   - Contraseñas coinciden
   - Indicador de fortaleza (5 requisitos)
4. Se envía a Supabase Auth
5. Supabase crea usuario en auth.users
6. Trigger on_auth_user_created crea perfil automáticamente en profiles
7. Usuario recibe confirmación de email
8. Usuario puede iniciar sesión
```

### Flujo de Login

```
1. Usuario accede a /auth
2. Ingresa email y contraseña
3. Supabase valida credenciales
4. Si es correcto:
   - Se crea sesión
   - Se actualiza fecha_ultimo_login en profiles
   - Se redirige a /area-cliente
5. Si es incorrecto:
   - Mensaje genérico (no revela si email existe)
```

### Flujo de Recuperación de Contraseña

```
1. Usuario hace clic en "¿Has olvidado tu contraseña?"
2. Ingresa email
3. Supabase envía email con enlace de recuperación
4. Usuario hace clic en enlace
5. Se verifica token y se muestra página de restablecimiento
6. Usuario ingresa nueva contraseña
7. Se actualiza en Supabase
8. Se redirige a login
```

### Tabla de Usuarios (Supabase)

**auth.users** (manejada por Supabase):
- id (UUID)
- email
- encrypted_password
- created_at
- last_sign_in_at

**profiles** (tabla personalizada):
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  nombre TEXT NOT NULL,
  empresa TEXT,
  telefono TEXT,
  rol TEXT DEFAULT 'user' ('user' | 'admin'),
  fecha_registro TIMESTAMP,
  fecha_ultimo_login TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Row Level Security (RLS)

**Políticas implementadas**:
- `Users can read their own profile`: SELECT WHERE auth.uid() = id
- `Users can update their own profile`: UPDATE WHERE auth.uid() = id
- `Users can insert their own profile`: INSERT WHERE auth.uid() = id
- `Admins can read all profiles`: SELECT (si rol = 'admin')
- `Admins can update any profile`: UPDATE (si rol = 'admin')

---

## 🎨 Decisiones de Diseño Visual

### Paleta de Colores

| Elemento | Color | Uso |
|----------|-------|-----|
| Primario | #1E3A8A (Azul oscuro) | Botones, headers, títulos |
| Fondo | #F5F7FA (Gris claro) | Fondos de secciones |
| Blanco | #FFFFFF | Tarjetas, fondos principales |
| Texto | #1F2937 (Gris oscuro) | Texto principal |
| Texto secundario | #6B7280 (Gris) | Descripciones |
| Éxito | #10B981 (Verde) | Confirmaciones |
| Error | #EF4444 (Rojo) | Errores |
| Advertencia | #F59E0B (Naranja) | Advertencias |

### Tipografía

- **Font**: Sistema de fuentes del navegador (Inter vía Tailwind)
- **Tamaños**:
  - H1: 3xl (30px) - Títulos principales
  - H2: 2xl (24px) - Subtítulos
  - H3: xl (20px) - Títulos de secciones
  - Body: base (16px) - Texto principal
  - Small: sm (14px) - Texto secundario

### Componentes shadcn/ui Utilizados

- Button (variantes: default, outline, ghost)
- Card (contenedores principales)
- Input (campos de texto)
- Dialog (modales)
- Tabs (navegación por pestañas)
- Select (dropdowns)
- Checkbox (casillas de verificación)
- Radio (botones de radio)
- Toast (notificaciones)
- Tooltip (información adicional)

### Animaciones

- **Transiciones**: 150-300ms ease-out
- **Hover**: scale(1.02) + cambio de color
- **Carga**: Spinner animado
- **Modales**: Fade in + scale
- **Botones**: Active state con scale(0.97)

---

## 📱 Estructura de Páginas

### Home (Landing Page)

**Secciones**:
1. Hero: Propuesta de valor + CTA
2. Estadísticas: 80% reducción, 500+ procesos (CENTRADO)
3. Servicios: 3 opciones con precios
   - Automatización de procesos: 590€
   - Sistemas avanzados: 1.590€
   - Presencia digital: 1.890€
4. Planes de mantenimiento: Essential, Growth, Business
5. Casos de éxito: (placeholder)
6. FAQ: Preguntas frecuentes
7. CTA final: Solicitar auditoría gratuita
8. Footer: Links legales

**Componentes**: Header, Footer, CookieBanner

### Auth (/auth)

**Modos**:
1. Login (por defecto)
   - Email
   - Contraseña
   - "¿Has olvidado tu contraseña?"
   - "¿No tienes cuenta? Regístrate"

2. Registro
   - Nombre y apellidos
   - Empresa (opcional)
   - Email
   - Contraseña (con indicador de fortaleza)
   - Confirmar contraseña
   - Validaciones en tiempo real

3. Recuperación
   - Email
   - Envía enlace de recuperación

### Reset Password (/auth/reset-password)

- Verifica token válido
- Formulario de nueva contraseña
- Indicador de fortaleza
- Confirmación de contraseña

### Área de Clientes (/area-cliente)

**Protegida**: Solo usuarios autenticados

**Secciones**:
1. Header: Nombre del usuario + botón logout
2. Mi Perfil: Nombre, email, empresa, teléfono, rol, fechas
3. Información: Fecha de registro, último acceso
4. Placeholders:
   - Proyectos
   - Presupuestos
   - Facturas
   - Soporte

---

## 🔧 Componentes Creados

### AuthContext.tsx
- Gestiona estado de autenticación
- Proporciona funciones: signUp, signIn, signOut, resetPassword, updatePassword
- Listener de cambios de sesión
- Recuperación de sesión al cargar

### AuthSupabase.tsx
- Página de autenticación con 3 modos
- Formularios con validaciones
- Manejo de errores
- Indicador de fortaleza de contraseña
- Toggle de visibilidad de contraseña

### ResetPasswordSupabase.tsx
- Verifica token de recuperación
- Formulario de nueva contraseña
- Validaciones
- Indicador de fortaleza

### ClientAreaSupabase.tsx
- Área privada del usuario
- Muestra perfil desde Supabase
- Logs detallados para diagnóstico
- Placeholder para futuras funcionalidades

### ProtectedRouteSupabase.tsx
- Componente de protección de rutas
- Redirige a /auth si no hay usuario
- Muestra spinner mientras carga
- Usa useEffect para evitar errores de React

### PasswordStrengthIndicator.tsx
- Valida 5 requisitos de contraseña
- Barra de progreso visual
- Colores según fortaleza
- Feedback en tiempo real

---

## 📊 Tablas de Base de Datos

### profiles
```sql
id (UUID) - PK, FK auth.users
nombre (TEXT) - Nombre del usuario
empresa (TEXT) - Nombre de empresa (opcional)
telefono (TEXT) - Teléfono (opcional)
rol (ENUM) - 'user' o 'admin'
fecha_registro (TIMESTAMP) - Cuando se registró
fecha_ultimo_login (TIMESTAMP) - Último acceso
created_at (TIMESTAMP) - Creado en
updated_at (TIMESTAMP) - Actualizado en
```

### projects (preparada para futuro)
```sql
id (UUID) - PK
user_id (UUID) - FK profiles
nombre (TEXT)
descripcion (TEXT)
estado (ENUM) - 'activo', 'pausado', 'completado'
fecha_inicio (TIMESTAMP)
fecha_fin (TIMESTAMP)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### budgets (preparada para futuro)
```sql
id (UUID) - PK
user_id (UUID) - FK profiles
project_id (UUID) - FK projects
monto (DECIMAL)
descripcion (TEXT)
estado (ENUM) - 'pendiente', 'aprobado', 'rechazado'
fecha_creacion (TIMESTAMP)
fecha_aprobacion (TIMESTAMP)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### invoices (preparada para futuro)
```sql
id (UUID) - PK
user_id (UUID) - FK profiles
project_id (UUID) - FK projects
numero_factura (TEXT) - UNIQUE
monto (DECIMAL)
estado (ENUM) - 'pendiente', 'pagada', 'vencida'
fecha_emision (TIMESTAMP)
fecha_vencimiento (TIMESTAMP)
fecha_pago (TIMESTAMP)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### support_tickets (preparada para futuro)
```sql
id (UUID) - PK
user_id (UUID) - FK profiles
titulo (TEXT)
descripcion (TEXT)
estado (ENUM) - 'abierto', 'en_progreso', 'cerrado'
prioridad (ENUM) - 'baja', 'normal', 'alta', 'urgente'
fecha_creacion (TIMESTAMP)
fecha_cierre (TIMESTAMP)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### automations (preparada para futuro)
```sql
id (UUID) - PK
user_id (UUID) - FK profiles
nombre (TEXT)
descripcion (TEXT)
estado (ENUM) - 'activa', 'pausada', 'inactiva'
tipo (TEXT)
configuracion (JSONB)
fecha_creacion (TIMESTAMP)
fecha_ultima_ejecucion (TIMESTAMP)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

---

## 🔄 Procedimientos tRPC

### auth.register
```typescript
Input: {
  email: string
  password: string
  nombre: string
  empresa?: string
}
Output: { success: boolean; error?: string }
```

### auth.login
```typescript
Input: {
  email: string
  password: string
}
Output: { success: boolean; error?: string }
```

### auth.logout
```typescript
Output: { success: true }
```

### auth.requestPasswordReset
```typescript
Input: { email: string }
Output: { success: boolean; error?: string }
```

### auth.resetPassword
```typescript
Input: {
  token: string
  newPassword: string
}
Output: { success: boolean; error?: string }
```

### admin.getAllUsers
```typescript
Output: UserProfile[]
```

### admin.updateUserRole
```typescript
Input: {
  userId: string
  role: 'user' | 'admin'
}
Output: { success: boolean; error?: string }
```

### admin.updateUserStatus
```typescript
Input: {
  userId: string
  status: 'activo' | 'pendiente' | 'bloqueado'
}
Output: { success: boolean; error?: string }
```

---

## 🌍 Variables de Entorno

### Frontend (.env)

```env
# Supabase
VITE_SUPABASE_URL=https://ddjlsuceyqhhfhuiexat.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_veYMkmpyUXD8cXctQZpXdA_lxR92N5S

# Analytics (Manus)
VITE_ANALYTICS_ENDPOINT=https://analytics.manus.im
VITE_ANALYTICS_WEBSITE_ID=your-website-id

# OAuth (Manus)
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
VITE_APP_ID=your-app-id

# Forge API (Manus)
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your-api-key

# App Config
VITE_APP_TITLE=Modira
VITE_APP_LOGO=https://your-cdn.com/logo.png
```

### Backend (.env)

```env
# Database
DATABASE_URL=your-database-url

# JWT
JWT_SECRET=your-jwt-secret

# OAuth (Manus)
OAUTH_SERVER_URL=https://oauth.manus.im
VITE_APP_ID=your-app-id

# Owner Info
OWNER_OPEN_ID=your-owner-id
OWNER_NAME=Your Name

# Forge API (Manus)
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-api-key
```

---

## 🐛 Bugs Conocidos y Soluciones

### 1. Error: "record 'new' has no field 'user_metadata'"
**Causa**: Función `handle_new_user()` intentaba acceder a campo que no existe en auth.users
**Solución**: Actualizar función para usar solo `new.id` y `new.email`
**Estado**: ✅ RESUELTO

**Script SQL ejecutado**:
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, rol, fecha_registro, fecha_ultimo_login)
  VALUES (new.id, COALESCE(new.email, 'Usuario'), 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 2. Error: "Cannot update a component while rendering a different component"
**Causa**: ProtectedRouteSupabase llamaba `setLocation()` durante render
**Solución**: Mover `setLocation()` a `useEffect`
**Estado**: ✅ RESUELTO

### 3. Error: "Error fetching profile: [object Object]"
**Causa**: Usuario null al acceder a /area-cliente O RLS bloqueando consulta
**Solución**: Agregar logs detallados para diagnosticar
**Estado**: ⚠️ EN DIAGNÓSTICO

**Próximos pasos para resolver**:
1. Revisar consola del navegador para ver logs detallados
2. Verificar que RLS en Supabase permite lectura de perfil propio
3. Confirmar que trigger creó el perfil automáticamente
4. Si es necesario, crear perfil manualmente en Supabase

---

## ✅ Funcionalidades Implementadas

- [x] Landing page completa con todas las secciones
- [x] Sistema de autenticación con Supabase
- [x] Registro de usuarios con validaciones
- [x] Login con email/contraseña
- [x] Recuperación de contraseña
- [x] Restablecimiento de contraseña
- [x] Indicador de fortaleza de contraseña
- [x] Sesiones persistentes
- [x] Protección de rutas privadas
- [x] Área de clientes (estructura base)
- [x] Perfil de usuario
- [x] Panel de administración (estructura base)
- [x] RLS en todas las tablas
- [x] Trigger automático de creación de perfil
- [x] Actualización de fecha_ultimo_login
- [x] Manejo de errores mejorado
- [x] Logs detallados para diagnóstico

---

## ⏳ Funcionalidades Pendientes

### Alta Prioridad
- [ ] Verificación de email en registro
- [ ] Envío de emails (Supabase Email Templates)
- [ ] Dashboard de proyectos (CRUD completo)
- [ ] Sistema de presupuestos
- [ ] Sistema de facturas
- [ ] Sistema de tickets de soporte
- [ ] Integración de Stripe para pagos
- [ ] Suscripciones a planes (Essential, Growth, Business)

### Media Prioridad
- [ ] Panel de administración completo (gestión de usuarios)
- [ ] Búsqueda y filtros en panel admin
- [ ] Exportar datos de usuarios (CSV)
- [ ] Logs de auditoría (quién cambió qué)
- [ ] Autenticación de dos factores (2FA)
- [ ] OAuth con Google/GitHub
- [ ] Webhooks para integraciones
- [ ] API pública para desarrolladores

### Baja Prioridad
- [ ] Soporte multiidioma
- [ ] Tema oscuro
- [ ] Notificaciones en tiempo real
- [ ] Chat de soporte en vivo
- [ ] Análisis y reportes
- [ ] Automatizaciones avanzadas

---

## 🎯 Criterios de UX

### Principios de Diseño

1. **Claridad**: Cada elemento tiene un propósito claro
2. **Consistencia**: Mismo estilo en toda la aplicación
3. **Feedback**: El usuario siempre sabe qué está pasando
4. **Accesibilidad**: Contraste suficiente, navegación por teclado
5. **Velocidad**: Carga rápida, sin bloqueos
6. **Seguridad**: Validaciones claras, mensajes genéricos en errores

### Validaciones de Formularios

- **Email**: Debe contener @ y dominio válido
- **Contraseña**: 
  - Mínimo 8 caracteres
  - Al menos 1 mayúscula
  - Al menos 1 minúscula
  - Al menos 1 número
  - Al menos 1 carácter especial
- **Confirmación**: Debe coincidir exactamente
- **Nombre**: No puede estar vacío
- **Empresa**: Opcional

### Mensajes de Error

- **Genéricos en login**: "Email o contraseña incorrectos" (no revela si existe)
- **Específicos en registro**: "Este email ya está registrado"
- **Detallados en desarrollo**: Logs en consola con código de error

### Estados de Carga

- Spinner centrado durante carga
- Botones deshabilitados durante procesamiento
- Mensajes de confirmación después de acciones
- Redirecciones automáticas después de login/logout

---

## 🚀 Próximos Pasos Inmediatos

### 1. Resolver Error de Perfil (BLOQUEANTE)
```
Acción: Diagnosticar por qué no se carga el perfil en /area-cliente
Pasos:
1. Abrir consola del navegador (F12)
2. Registrar un nuevo usuario
3. Iniciar sesión
4. Ir a /area-cliente
5. Revisar logs [ClientArea] en consola
6. Verificar código de error de Supabase
7. Si es RLS: revisar políticas en Supabase
8. Si es trigger: verificar que se ejecutó correctamente
```

### 2. Implementar Verificación de Email
```
Acción: Agregar confirmación de email en registro
Pasos:
1. Habilitar email templates en Supabase
2. Configurar URL de confirmación
3. Crear página de confirmación
4. Agregar lógica de reintento
```

### 3. Implementar Stripe
```
Acción: Integrar pagos para planes
Pasos:
1. Crear cuenta en Stripe
2. Instalar @stripe/react-stripe-js
3. Crear página de planes con opciones de pago
4. Implementar webhooks para confirmación
5. Guardar subscription_id en profiles
6. Limitar funcionalidades según plan
```

### 4. Dashboard de Proyectos
```
Acción: Implementar CRUD de proyectos (En curso)
Estado: Esquema de base de datos listo, tipos compartidos creados.
```

### 5. Sistema de Presupuestos y Pagos (NUEVO)
```
Acción: Gestión profesional de presupuestos con Stripe
Estado: ✅ COMPLETADO
Funcionalidades:
- Panel Admin: /admin/presupuestos (Visualización y filtros)
- Área Cliente: /presupuesto/:id (Interfaz premium e interactiva)
- Pagos: Integración con Stripe Checkout
- Base de Datos: Tablas 'projects' y 'quotations' en Supabase
```

---

## 📚 Archivos de Documentación

- **AUTHENTICATION.md**: Detalles del sistema de autenticación
- **CONTEXT.md**: Este archivo
- **todo-qc7nnq03.md**: Tareas pendientes y completadas

---

## 🔗 Enlaces Importantes

- **Supabase Dashboard**: https://app.supabase.com
- **Proyecto Supabase**: https://ddjlsuceyqhhfhuiexat.supabase.co
- **GitHub**: (A configurar)
- **Manus Dashboard**: (A configurar)

---

## 📝 Notas para Próximos Desarrolladores

### Convenciones de Código

- **Componentes**: PascalCase, un componente por archivo
- **Funciones**: camelCase
- **Constantes**: UPPER_SNAKE_CASE
- **Tipos**: PascalCase con sufijo Type o Interface
- **Archivos**: kebab-case para archivos de utilidad, PascalCase para componentes

### Commits

Usar formato convencional:
```
feat: agregar dashboard de proyectos
fix: resolver error de RLS en profiles
docs: actualizar CONTEXT.md
test: agregar tests para autenticación
```

### Testing

- Crear tests en `*.test.ts` junto al archivo
- Usar Vitest para unit tests
- Mínimo 80% de cobertura en funciones críticas
- Ejecutar con `pnpm test`

### Deployment

- Usar `pnpm build` para compilar
- Ejecutar `pnpm check` antes de hacer push
- Crear checkpoint antes de publicar
- Usar GitHub para versionado

---

## 🎓 Recursos de Aprendizaje

- [Supabase Docs](https://supabase.com/docs)
- [tRPC Docs](https://trpc.io)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Wouter](https://github.com/molefrog/wouter)

---

**Última actualización**: 2026-08-07
**Estado del proyecto**: Autenticación funcional, landing page completa, área de clientes en desarrollo
**Versión actual**: 51fa7ea7
