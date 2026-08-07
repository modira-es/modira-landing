# Project TODO - Modira Landing

## Cambios Solicitados

- [x] Actualizar planes de mantenimiento (Essential, Growth, Business) con nuevos precios y descripciones
- [x] Cambiar precios de servicios (Automatización, Sistemas avanzados, Presencia digital)
- [x] Centrar estadísticas (80% reducción, 500+ procesos) en la página
- [x] Corregir enlace del botón "ver casos de éxito"


## Sistema de Autenticación Completo

### Base de Datos
- [x] Actualizar esquema de usuarios con campos adicionales (empresa, estado, rol, fechas)
- [x] Crear tabla de tokens de recuperación de contraseña
- [x] Crear tabla de intentos de login fallidos (protección contra fuerza bruta)
- [x] Crear índices en email para búsquedas rápidas

### Backend - Autenticación
- [x] Implementar registro de usuarios con validaciones
- [x] Implementar hash de contraseñas con bcrypt
- [x] Implementar login con validación de credenciales
- [x] Implementar recuperación de contraseña por email
- [x] Implementar protección contra fuerza bruta
- [x] Implementar logout seguro
- [x] Crear helpers para gestión de sesiones

### Frontend - Interfaz de Autenticación
- [x] Crear página de login/registro con toggle
- [x] Formulario de registro con validaciones en cliente
- [x] Formulario de login con validaciones
- [x] Formulario de recuperación de contraseña
- [x] Página de restablecimiento de contraseña
- [x] Mensajes de error y éxito claros
- [x] Integración con estética de la web

### Protección y Seguridad
- [x] Proteger rutas privadas (Área de Clientes)
- [x] Implementar middleware de autenticación
- [x] Cookies seguras (httpOnly, secure, sameSite)
- [x] Protección CSRF
- [x] Validación y sanitización de entradas
- [x] Rate limiting para login

### Área de Clientes
- [x] Crear página principal del área de clientes
- [x] Mostrar información del usuario autenticado
- [x] Preparar estructura para mostrar proyectos, presupuestos, etc.
- [x] Implementar logout desde el área de clientes

### Panel de Administración
- [x] Crear ruta protegida para administrador
- [x] Listar usuarios registrados
- [x] Cambiar rol de usuarios
- [x] Cambiar estado de usuarios (activo, pendiente, bloqueado)
- [x] Ver estadísticas del sistema
- [x] Preparar estructura para gestión futura


## Cambios Completados - Sistema de Autenticación

### Backend
- [x] Crear archivo de autenticación (server/auth.ts) con funciones de registro, login, recuperación
- [x] Crear middleware de sesiones seguras (server/auth-middleware.ts)
- [x] Crear router de autenticación con tRPC (server/routers/auth.ts)
- [x] Integrar autenticación local con contexto de tRPC
- [x] Crear pruebas unitarias para autenticación
- [x] Instalar dependencias (bcryptjs, zod, nodemailer, crypto-random-string)

### Frontend
- [x] Crear página de autenticación (Auth.tsx) con login, registro y recuperación
- [x] Crear página de restablecimiento de contraseña (ResetPassword.tsx)
- [x] Actualizar rutas en App.tsx
- [x] Integrar con hook useAuth existente

### Documentación
- [x] Crear documentación completa del sistema de autenticación (AUTHENTICATION.md)

### Protección de Rutas
- [x] Crear componente ProtectedRoute para proteger rutas privadas
- [x] Crear página del panel de administración (/admin)
- [x] Validar rol de administrador en acceso a panel
