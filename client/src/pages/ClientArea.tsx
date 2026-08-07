import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  LogOut,
  Menu,
  X,
  FileText,
  Settings,
  HelpCircle,
  FolderOpen,
  Eye,
  Download,
  CreditCard,
  ChevronRight,
  Zap,
} from "lucide-react";

type AuthView = "login" | "register" | "forgot-password" | "dashboard";

export default function ClientArea() {
  const [authView, setAuthView] = useState<AuthView>("login");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí irá la integración con Supabase/backend
    setIsLoggedIn(true);
    setAuthView("dashboard");
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí irá la integración con Supabase/backend
    setIsLoggedIn(true);
    setAuthView("dashboard");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAuthView("login");
    setFormData({ email: "", password: "", name: "", confirmPassword: "" });
  };

  // ============ LOGIN VIEW ============
  if (!isLoggedIn && authView === "login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F7FA] to-white flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-[#1E3A8A] p-3 rounded-xl inline-block mb-4 shadow-lg">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#1E3A8A] mb-2">Modira</h1>
            <p className="text-gray-600">Área Cliente</p>
          </div>

          <Card className="p-8 border-gray-200">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-6">
              Inicia sesión
            </h2>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setAuthView("forgot-password")}
                  className="text-sm text-[#1E3A8A] hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white py-3"
              >
                Iniciar sesión
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-600 mb-3">¿No tienes cuenta?</p>
              <button
                onClick={() => setAuthView("register")}
                className="text-[#1E3A8A] font-semibold hover:underline"
              >
                Crear una nueva cuenta
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ============ REGISTER VIEW ============
  if (!isLoggedIn && authView === "register") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F7FA] to-white flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-[#1E3A8A] p-3 rounded-xl inline-block mb-4 shadow-lg">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#1E3A8A] mb-2">Modira</h1>
            <p className="text-gray-600">Crear cuenta</p>
          </div>

          <Card className="p-8 border-gray-200">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-6">
              Regístrate
            </h2>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white py-3"
              >
                Crear cuenta
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <button
                onClick={() => setAuthView("login")}
                className="text-[#1E3A8A] font-semibold hover:underline"
              >
                Volver al inicio de sesión
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ============ FORGOT PASSWORD VIEW ============
  if (!isLoggedIn && authView === "forgot-password") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F7FA] to-white flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-[#1E3A8A] p-3 rounded-xl inline-block mb-4 shadow-lg">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#1E3A8A] mb-2">Modira</h1>
            <p className="text-gray-600">Recuperar contraseña</p>
          </div>

          <Card className="p-8 border-gray-200">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">
              Recupera tu contraseña
            </h2>
            <p className="text-gray-600 mb-6">
              Ingresa tu email y te enviaremos un enlace para resetear tu contraseña.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Revisa tu email para recuperar tu contraseña");
                setAuthView("login");
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  placeholder="tu@email.com"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white py-3"
              >
                Enviar enlace de recuperación
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <button
                onClick={() => setAuthView("login")}
                className="text-[#1E3A8A] font-semibold hover:underline"
              >
                Volver al inicio de sesión
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ============ DASHBOARD VIEW ============
  if (isLoggedIn && authView === "dashboard") {
    const [activeSection, setActiveSection] = useState("proyectos");

    const menuItems = [
      { id: "proyectos", label: "Mis proyectos", icon: FolderOpen },
      { id: "facturas", label: "Facturas", icon: FileText },
      { id: "documentacion", label: "Documentación", icon: Eye },
      { id: "soporte", label: "Soporte", icon: HelpCircle },
      { id: "configuracion", label: "Configuración", icon: Settings },
    ];

    return (
      <div className="min-h-screen bg-[#F5F7FA]">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 md:px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden text-gray-700"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <div className="flex items-center gap-2">
                <div className="bg-[#1E3A8A] p-1.5 rounded-lg">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-[#1E3A8A]">Modira</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-700 hover:text-[#1E3A8A] transition-colors"
            >
              <LogOut size={20} />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside
            className={`${
              sidebarOpen ? "w-64" : "w-0"
            } bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden md:w-64 md:block`}
          >
            <nav className="p-6 space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeSection === item.id
                      ? "bg-[#1E3A8A] text-white"
                      : "text-gray-700 hover:bg-[#F5F7FA]"
                  }`}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-4 md:p-8">
            {/* Mis Proyectos */}
            {activeSection === "proyectos" && (
              <div>
                <h1 className="text-3xl font-bold text-[#1E3A8A] mb-6">
                  Mis proyectos
                </h1>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      name: "Automatización de formularios",
                      status: "Activo",
                      date: "15 Ago 2024",
                    },
                    {
                      name: "Gestión de clientes",
                      status: "En desarrollo",
                      date: "22 Ago 2024",
                    },
                    {
                      name: "Emails automáticos",
                      status: "Completado",
                      date: "10 Ago 2024",
                    },
                  ].map((project, idx) => (
                    <Card
                      key={idx}
                      className="p-6 border-gray-200 hover:shadow-lg transition-shadow"
                    >
                      <h3 className="font-bold text-[#1E3A8A] mb-2">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Creado: {project.date}
                      </p>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            project.status === "Activo"
                              ? "bg-green-100 text-green-700"
                              : project.status === "En desarrollo"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {project.status}
                        </span>
                        <ChevronRight size={18} className="text-gray-400" />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Facturas */}
            {activeSection === "facturas" && (
              <div>
                <h1 className="text-3xl font-bold text-[#1E3A8A] mb-6">
                  Facturas
                </h1>
                <Card className="border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#F5F7FA] border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                            Factura
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                            Fecha
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                            Concepto
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                            Importe
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                            Estado
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {[
                          {
                            id: "MOD-001",
                            date: "15 Ago 2024",
                            concept: "Automatización de procesos",
                            amount: "490 €",
                            status: "Pagada",
                          },
                          {
                            id: "MOD-002",
                            date: "22 Ago 2024",
                            concept: "Mantenimiento mensual",
                            amount: "149 €",
                            status: "Pendiente",
                          },
                          {
                            id: "MOD-003",
                            date: "01 Sep 2024",
                            concept: "Sistemas avanzados",
                            amount: "1.500 €",
                            status: "Pendiente",
                          },
                        ].map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-[#F5F7FA]">
                            <td className="px-6 py-4 text-sm font-semibold text-[#1E3A8A]">
                              {invoice.id}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {invoice.date}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {invoice.concept}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                              {invoice.amount}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  invoice.status === "Pagada"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {invoice.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex gap-2">
                                <button className="text-gray-600 hover:text-[#1E3A8A] transition-colors">
                                  <Download size={18} />
                                </button>
                                {invoice.status === "Pendiente" && (
                                  <button className="text-[#1E3A8A] hover:text-[#1E3A8A]/80 font-semibold flex items-center gap-1">
                                    <CreditCard size={18} />
                                    <span className="text-xs">Pagar</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* Documentación */}
            {activeSection === "documentacion" && (
              <div>
                <h1 className="text-3xl font-bold text-[#1E3A8A] mb-6">
                  Documentación
                </h1>
                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    {
                      title: "Guía de inicio rápido",
                      description: "Comienza a usar tus automatizaciones en 5 minutos",
                    },
                    {
                      title: "Manual de usuario",
                      description: "Documentación completa de todas las funciones",
                    },
                    {
                      title: "Guía de integración",
                      description: "Cómo conectar tus herramientas favoritas",
                    },
                    {
                      title: "FAQ técnico",
                      description: "Respuestas a preguntas técnicas frecuentes",
                    },
                  ].map((doc, idx) => (
                    <Card
                      key={idx}
                      className="p-6 border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      <FileText className="h-8 w-8 text-[#1E3A8A] mb-4" />
                      <h3 className="font-bold text-[#1E3A8A] mb-2">
                        {doc.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {doc.description}
                      </p>
                      <Button
                        variant="outline"
                        className="w-full border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#1E3A8A]/5"
                      >
                        Descargar
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Soporte */}
            {activeSection === "soporte" && (
              <div>
                <h1 className="text-3xl font-bold text-[#1E3A8A] mb-6">
                  Soporte
                </h1>
                <div className="space-y-6">
                  <Card className="p-6 border-gray-200">
                    <h3 className="text-lg font-bold text-[#1E3A8A] mb-4">
                      Enviar un ticket de soporte
                    </h3>
                    <form className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Asunto
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                          placeholder="Describe tu problema"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Descripción
                        </label>
                        <textarea
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                          placeholder="Cuéntanos más detalles..."
                        />
                      </div>
                      <Button className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white">
                        Enviar ticket
                      </Button>
                    </form>
                  </Card>

                  <Card className="p-6 border-gray-200">
                    <h3 className="text-lg font-bold text-[#1E3A8A] mb-4">
                      Tickets recientes
                    </h3>
                    <div className="space-y-3">
                      {[
                        {
                          id: "TK-001",
                          subject: "Error en integración",
                          status: "Resuelto",
                        },
                        {
                          id: "TK-002",
                          subject: "Consulta sobre funcionalidad",
                          status: "En progreso",
                        },
                      ].map((ticket) => (
                        <div
                          key={ticket.id}
                          className="flex items-center justify-between p-4 bg-[#F5F7FA] rounded-lg"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">
                              {ticket.subject}
                            </p>
                            <p className="text-sm text-gray-600">{ticket.id}</p>
                          </div>
                          <span
                            className={`text-xs font-semibold px-3 py-1 rounded-full ${
                              ticket.status === "Resuelto"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {ticket.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Configuración */}
            {activeSection === "configuracion" && (
              <div>
                <h1 className="text-3xl font-bold text-[#1E3A8A] mb-6">
                  Configuración
                </h1>
                <div className="space-y-6">
                  <Card className="p-6 border-gray-200">
                    <h3 className="text-lg font-bold text-[#1E3A8A] mb-4">
                      Información de la cuenta
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Nombre
                        </label>
                        <input
                          type="text"
                          defaultValue="Juan García"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          defaultValue="juan@empresa.com"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                        />
                      </div>
                      <Button className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white">
                        Guardar cambios
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-6 border-gray-200">
                    <h3 className="text-lg font-bold text-[#1E3A8A] mb-4">
                      Cambiar contraseña
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Contraseña actual
                        </label>
                        <input
                          type="password"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Nueva contraseña
                        </label>
                        <input
                          type="password"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Confirmar contraseña
                        </label>
                        <input
                          type="password"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                        />
                      </div>
                      <Button className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white">
                        Actualizar contraseña
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  return null;
}
