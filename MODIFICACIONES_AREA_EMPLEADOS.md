# Documento Técnico: Especificación de Modificaciones para la Implementación del Área de Empleados en Modira

## 1. Introducción y Objetivo General

El presente documento detalla el plan técnico, la arquitectura de código y los requisitos de base de datos necesarios para añadir el **Área de Empleados** al repositorio `modira-es/modira-landing`. El objetivo principal es proporcionar un acceso interno seguro, profesional y estéticamente coherente con el sistema visual actual de **Modira**, permitiendo a los trabajadores autorizados consultar solicitudes de auditoría gratuita, facturas y tickets de soporte sin comprometer la seguridad ni modificar los componentes existentes fuera del alcance estipulado.

La implementación se basa estrictamente en el diseño modular de la aplicación existente, utilizando **Supabase Auth** [1], políticas de seguridad a nivel de fila (**RLS**) mediante la migración `004_worker_dashboard_access.sql` ya presente en el repositorio, y componentes de interfaz basados en **React**, **Tailwind CSS** y **Shadcn UI** [2].

---

## 2. Resumen de Archivos Afectados y Nuevos

Para cumplir con el principio de mínimo impacto y evitar alterar la landing principal, el Área de Clientes o las migraciones fundamentales (`001`, `002`, `003`), las modificaciones se limitarán exclusivamente a los siguientes elementos:

| Tipo | Archivo / Ruta | Descripción de la Modificación |
| :--- | :--- | :--- |
| **Modificación** | `client/src/pages/Home.tsx` | Adición del enlace discreto "Área de empleados" en la sección del footer [3]. |
| **Nuevo Componente** | `client/src/components/EmployeeRoute.tsx` | Guardia de ruta protegida específica para trabajadores (`supabase.auth` + `public.workers` con `is_active = true`). |
| **Nuevo Componente** | `client/src/components/EmployeeAreaHeader.tsx` | Encabezado visual idéntico al de clientes adaptado para el área interna (bienvenida y botón de cierre de sesión). |
| **Nueva Página** | `client/src/pages/EmployeeAuth.tsx` | Pantalla de inicio de sesión y recuperación de contraseña para empleados, visualmente idéntica al sistema de Auth de clientes [4]. |
| **Nueva Página** | `client/src/pages/EmployeeArea.tsx` | Panel principal del empleado estructurado en secciones verticales para auditorías, facturas y soporte. |
| **Modificación** | `client/src/App.tsx` | Registro de las nuevas rutas `/empleados/login`, `/empleados/recuperar` y `/empleados/dashboard` (protegidas por `EmployeeRoute`) [5]. |
| **Base de Datos** | `supabase/migrations/004_worker_dashboard_access.sql` | Migración ya existente en el repositorio que otorga permisos de solo lectura (`SELECT`) a trabajadores activos sobre `audit_requests`, `invoices`, `support_tickets` y `profiles` para la empresa `MODIRA-001` [6]. |

---

## 3. Especificación Detallada por Componente y Módulo

### 3.1. Enlace en el Footer (`client/src/pages/Home.tsx`)
En la sección del pie de página correspondiente al bloque de **Empresa**, se añadirá un enlace discreto que dirija a la ruta de acceso de empleados:

* **Ubicación:** Bloque "Empresa" en el componente `footer` de `Home.tsx`.
* **Texto del enlace:** `"Área de empleados"`.
* **Ruta de destino:** `"/empleados/login"`.
* **Restricción:** No se alterarán los colores institucionales (`bg-[#102A66]`), los espaciados ni el resto de enlaces del footer.

### 3.2. Pantalla de Acceso de Empleados (`client/src/pages/EmployeeAuth.tsx`)
Siguiendo el principio de idéntica estética con el sistema de login del Área Cliente (`Auth.tsx`), esta página mantendrá las mismas clases de Tailwind, tarjetas con bordes redondeados (`Card`), tipografías y comportamiento de campos [4].

* **Campos del formulario:**
  1. **Correo electrónico** (`type="email"`).
  2. **Contraseña** (`type="password"` con alternancia de visibilidad mediante icono).
  3. **Botón de acción principal:** `"Iniciar sesión"`.
  4. **Enlace secundario:** `"_¿Has olvidado tu contraseña?"`.
* **Lógica de Autenticación y Verificación de Trabajador:**
  1. Se ejecuta `supabase.auth.signInWithPassword({ email, password })`.
  2. Una vez autenticado el usuario en `auth.users`, se realiza una consulta adicional a la tabla `public.workers` para verificar la autorización:
     ```typescript
     const { data: workerData, error: workerError } = await supabase
       .from("workers")
       .select("is_active, display_name")
       .eq("auth_user_id", user.id)
       .single();

     if (workerError || !workerData || !workerData.is_active) {
       await supabase.auth.signOut();
       throw new Error("No tienes autorización para acceder al área de empleados.");
     }
     ```
  3. Si la verificación es exitosa, se redirige al usuario a `"/empleados/dashboard"`. En caso contrario, se muestra un mensaje genérico de error por motivos de seguridad, sin revelar la existencia del correo en el sistema.

### 3.3. Recuperación de Contraseña para Empleados
El flujo de recuperación (`reset-password`) utilizará las funciones oficiales de Supabase Auth (`supabase.auth.resetPasswordForEmail`) [7], incorporando una validación previa en el backend o mediante políticas de base de datos para garantizar que el correo introducido pertenezca estrictamente a un registro activo en `public.workers`. Se evitará cualquier respuesta informativa que permita enumerar correos electrónicos de empleados desde el formulario público.

### 3.4. Guardia de Ruta Protegida (`client/src/components/EmployeeRoute.tsx`)
Para garantizar que ningún usuario no autorizado o cliente estándar pueda acceder a las rutas internas:
* Se comprobará la existencia de una sesión activa (`session` y `user`).
* Se validará de forma asíncrona el estado en `public.workers` mediante la función de seguridad o consulta directa con caché de sesión.
* Mientras se verifica el estado, se renderizará un componente de carga estandarizado (Spinner / Skeleton) [8]. Si la validación falla, se redirigirá automáticamente a `"/empleados/login"`.

### 3.5. Panel del Área de Empleados (`client/src/pages/EmployeeArea.tsx`)
La interfaz del panel interno se diseñará con una estructura limpia, vertical y espaciosa, manteniendo la paleta cromática corporativa de Modira (tonos azules `#102A66`, `#1E3A8A` y grises neutros `#F5F7FA`) [9].

#### A. Encabezado (`client/src/components/EmployeeAreaHeader.tsx`)
* Título principal: `"Área de empleados"`.
* Mensaje de bienvenida personalizado: `"Bienvenido, [display_name]"`.
* Botón de cierre de sesión con icono de salida (`LogOut`), que limpiará la sesión de Supabase y redirigirá al inicio de la web [10].

#### B. Sección 1: Solicitudes de Auditoría Gratuita
* **Origen de datos:** Tabla `public.audit_requests` [11].
* **Ordenación:** `created_at ASC` (más antiguas primero) [12].
* **Estructura de tabla:**
  * Nombre
  * Email
  * Empresa
  * Empleados
  * Proceso
  * Estado
  * Fecha de solicitud

#### C. Sección 2: Facturas
* **Origen de datos:** Tabla `public.invoices` [13], con relaciones opcionales a `clients` y `profiles` para mostrar los datos del cliente asociado [14].
* **Ordenación:** `created_at ASC` [15].
* **Estructura de tabla:**
  * Cliente (Nombre/Email relacionado)
  * Número de factura
  * Importe
  * Estado
  * Fecha de emisión
  * Fecha de creación

#### D. Sección 3: Tickets de Soporte
* **Origen de datos:** Tabla `public.support_tickets` [16], vinculada con los perfiles de usuario correspondientes [17].
* **Ordenación:** `created_at ASC` [18].
* **Estructura de tabla:**
  * Cliente / Usuario
  * Título
  * Estado
  * Prioridad
  * Fecha de creación

---

## 4. Requisitos y Verificación de Base de Datos (Supabase)

Tal como se especifica en la migración `004_worker_dashboard_access.sql` ya presente en el directorio `/supabase/migrations/`, la seguridad a nivel de fila (`RLS`) y el acceso de lectura para los trabajadores se fundamentan en los siguientes elementos de base de datos [6]:

1. **Función de Seguridad (`current_user_is_worker()`):**
   Función de tipo `SECURITY DEFINER` que comprueba de forma segura si el usuario autenticado (`auth.uid()`) posee un registro activo (`is_active = TRUE`) en la tabla `public.workers` [19].
2. **Políticas de Solo Lectura (`SELECT`):**
   * **`audit_requests`:** Se sustituye la política abierta anterior por `audit_requests_worker_select`, restringiendo el acceso exclusivamente a trabajadores activos [20].
   * **`invoices` y `support_tickets`:** Se establecen políticas que permiten la lectura únicamente a trabajadores activos y limitadas a la empresa principal `MODIRA-001` (`company_id` correspondiente) [21].
   * **`profiles`:** Se concede acceso de lectura a los perfiles asociados a `MODIRA-001` para permitir la visualización de nombres y correos de clientes en las tablas de facturas y tickets [22].

> **Nota importante:** No se requiere crear nuevas migraciones ni modificar las migraciones `001`, `002` o `003`. La migración `004` ya contempla íntegramente la capa de seguridad requerida en la base de datos [6].

---

## 5. Plan de Ejecución y Verificación

Una vez aprobado este documento técnico, el proceso de desarrollo y despliegue seguirá los siguientes pasos:

1. **Implementación de Rutas y Navegación:** Actualizar `App.tsx` y añadir el enlace en `Home.tsx`.
2. **Creación de Componentes de Autenticación:** Desarrollar `EmployeeAuth.tsx` y `EmployeeRoute.tsx`.
3. **Desarrollo del Panel Interno:** Implementar `EmployeeArea.tsx` y `EmployeeAreaHeader.tsx` conectando las consultas a Supabase con ordenación `created_at ASC`.
4. **Pruebas de Compilación y Tipado:** Ejecutar verificaciones de TypeScript y compilación con Vite para asegurar que no existan errores de tipos ni dependencias rotas [23].
5. **Control de Versiones:** Realizar el commit y push correspondientes al repositorio remoto `modira-es/modira-landing` [24].

---

## Referencias

* [1] Supabase Auth Documentation. https://supabase.com/docs/guides/auth
* [2] Shadcn UI Component Library. https://ui.shadcn.com/
* [3] Repositorio Modira Landing - Archivo `client/src/pages/Home.tsx`.
* [4] Repositorio Modira Landing - Archivo `client/src/pages/Auth.tsx`.
* [5] Repositorio Modira Landing - Archivo `client/src/App.tsx`.
* [6] Repositorio Modira Landing - Migración `supabase/migrations/004_worker_dashboard_access.sql`.
* [7] Supabase Auth Password Reset Guide. https://supabase.com/docs/guides/auth/passwords
* [8] React Protected Routes Pattern. https://reactrouter.com/en/main/route/route
* [9] Tailwind CSS Color Configuration. https://tailwindcss.com/docs/customizing-colors
* [10] Lucide Icons React Library. https://lucide.dev/
* [11] Repositorio Modira Landing - Migración `supabase/migrations/002_create_audit_requests.sql`.
* [12] PostgreSQL Sorting Documentation (`ORDER BY`). https://www.postgresql.org/docs/current/queries-order.html
* [13] Repositorio Modira Landing - Migración `supabase/migrations/001_initial_schema.sql`.
* [14] PostgreSQL Table Joins and Foreign Keys. https://www.postgresql.org/docs/current/tutorial-joins.html
* [15] Supabase Query Filtering and Ordering. https://supabase.com/docs/reference/javascript/order
* [16] Modira Support Tickets Schema Definition.
* [17] Relational Data Modeling in PostgreSQL. https://www.postgresql.org/docs/current/ddl-constraints.html
* [18] Modira Database Schema Design.
* [19] PostgreSQL Security Definer Functions. https://www.postgresql.org/docs/current/sql-createfunction.html
* [20] PostgreSQL Row Level Security Policies. https://www.postgresql.org/docs/current/ddl-rowsecurity.html
* [21] Supabase Row Level Security Guide. https://supabase.com/docs/guides/database/postgres/row-level-security
* [22] Modira Profiles Schema RLS Guidelines.
* [23] Vite Build Tool Documentation. https://vitejs.dev/guide/
* [24] Git Version Control Workflow. https://git-scm.com/doc
