import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Users,
  LogOut,
  Settings,
  BarChart3,
  AlertCircle,
  ChevronDown,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function AdminPanel() {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("usuarios");
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "user" | "admin">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "pending" | "blocked">("all");

  // Queries
  const usersQuery = trpc.admin.getUsers.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });
  const statsQuery = trpc.admin.getStatistics.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  // Mutations
  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      usersQuery.refetch();
    },
  });
  const updateStatusMutation = trpc.admin.updateUserStatus.useMutation({
    onSuccess: () => {
      usersQuery.refetch();
    },
  });

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== "admin")) {
      setLocation("/");
    }
  }, [isAuthenticated, loading, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-[#F5F7FA] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A]"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const handleRoleChange = async (userId: number, newRole: "user" | "admin") => {
    try {
      await updateRoleMutation.mutateAsync({
        userId,
        role: newRole,
      });
    } catch (error) {
      console.error("Error al cambiar rol:", error);
    }
  };

  const handleStatusChange = async (
    userId: number,
    newStatus: "active" | "pending" | "blocked"
  ) => {
    try {
      await updateStatusMutation.mutateAsync({
        userId,
        status: newStatus,
      });
    } catch (error) {
      console.error("Error al cambiar estado:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "blocked":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Activo";
      case "pending":
        return "Pendiente";
      case "blocked":
        return "Bloqueado";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#F5F7FA] to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#1E3A8A]">
              Panel de Administración
            </h1>
            <p className="text-gray-600 mt-1">Bienvenido, {user?.name}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex gap-2 items-center"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("usuarios")}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === "usuarios"
                ? "border-[#1E3A8A] text-[#1E3A8A]"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Users className="inline h-5 w-5 mr-2" />
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab("estadisticas")}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === "estadisticas"
                ? "border-[#1E3A8A] text-[#1E3A8A]"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <BarChart3 className="inline h-5 w-5 mr-2" />
            Estadísticas
          </button>
          <button
            onClick={() => setActiveTab("configuracion")}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === "configuracion"
                ? "border-[#1E3A8A] text-[#1E3A8A]"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Settings className="inline h-5 w-5 mr-2" />
            Configuración
          </button>
        </div>

        {/* Usuarios Tab */}
        {activeTab === "usuarios" && (
          <div>
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-6">
              Gestión de Usuarios
            </h2>

            {usersQuery.isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A]"></div>
                <p className="mt-4 text-gray-600">Cargando usuarios...</p>
              </div>
            ) : usersQuery.error ? (
              <Card className="p-6 border-2 border-red-200 bg-red-50">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700">
                    Error al cargar usuarios: {usersQuery.error.message}
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Búsqueda y Filtros */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  />
                  <div className="flex gap-4 flex-wrap">
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    >
                      <option value="all">Todos los roles</option>
                      <option value="user">Usuario</option>
                      <option value="admin">Administrador</option>
                    </select>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    >
                      <option value="all">Todos los estados</option>
                      <option value="active">Activo</option>
                      <option value="pending">Pendiente</option>
                      <option value="blocked">Bloqueado</option>
                    </select>
                  </div>
                </div>

                {/* Lista de Usuarios Filtrada */}
                {usersQuery.data
                  ?.filter((u) => {
                    const matchesSearch =
                      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesRole = filterRole === "all" || u.role === filterRole;
                    const matchesStatus =
                      filterStatus === "all" || u.status === filterStatus;
                    return matchesSearch && matchesRole && matchesStatus;
                  })
                  .map((u) => (
                  <Card
                    key={u.id}
                    className="p-6 border-2 border-gray-200 hover:border-[#1E3A8A] transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-[#1E3A8A]">
                            {u.name}
                          </h3>
                          <span
                            className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(
                              u.status || "active"
                            )}`}
                          >
                            {getStatusLabel(u.status || "active")}
                          </span>
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                            {u.role === "admin" ? "Administrador" : "Usuario"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{u.email}</p>
                        {u.company && (
                          <p className="text-sm text-gray-600">
                            Empresa: {u.company}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Registrado:{" "}
                          {new Date(u.createdAt).toLocaleDateString("es-ES")}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setExpandedUser(
                            expandedUser === u.id ? null : u.id
                          )
                        }
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <ChevronDown
                          className={`h-5 w-5 transition-transform ${
                            expandedUser === u.id ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>

                    {expandedUser === u.id && (
                      <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Cambiar Rol
                          </label>
                          <div className="flex gap-2">
                            <Button
                              onClick={() =>
                                handleRoleChange(u.id, "user")
                              }
                              variant={
                                u.role === "user" ? "default" : "outline"
                              }
                              className={
                                u.role === "user"
                                  ? "bg-[#1E3A8A]"
                                  : ""
                              }
                              disabled={
                                updateRoleMutation.isPending
                              }
                            >
                              Usuario
                            </Button>
                            <Button
                              onClick={() =>
                                handleRoleChange(u.id, "admin")
                              }
                              variant={
                                u.role === "admin"
                                  ? "default"
                                  : "outline"
                              }
                              className={
                                u.role === "admin"
                                  ? "bg-[#1E3A8A]"
                                  : ""
                              }
                              disabled={
                                updateRoleMutation.isPending
                              }
                            >
                              Administrador
                            </Button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Cambiar Estado
                          </label>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              onClick={() =>
                                handleStatusChange(u.id, "active")
                              }
                              variant={
                                u.status === "active"
                                  ? "default"
                                  : "outline"
                              }
                              className={
                                u.status === "active"
                                  ? "bg-green-600"
                                  : ""
                              }
                              disabled={
                                updateStatusMutation.isPending
                              }
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Activo
                            </Button>
                            <Button
                              onClick={() =>
                                handleStatusChange(u.id, "pending")
                              }
                              variant={
                                u.status === "pending"
                                  ? "default"
                                  : "outline"
                              }
                              className={
                                u.status === "pending"
                                  ? "bg-yellow-600"
                                  : ""
                              }
                              disabled={
                                updateStatusMutation.isPending
                              }
                            >
                              Pendiente
                            </Button>
                            <Button
                              onClick={() =>
                                handleStatusChange(u.id, "blocked")
                              }
                              variant={
                                u.status === "blocked"
                                  ? "default"
                                  : "outline"
                              }
                              className={
                                u.status === "blocked"
                                  ? "bg-red-600"
                                  : ""
                              }
                              disabled={
                                updateStatusMutation.isPending
                              }
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Bloqueado
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Estadísticas Tab */}
        {activeTab === "estadisticas" && (
          <div>
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-6">
              Estadísticas del Sistema
            </h2>

            {statsQuery.isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A]"></div>
                <p className="mt-4 text-gray-600">Cargando estadísticas...</p>
              </div>
            ) : statsQuery.data ? (
              <div className="grid md:grid-cols-4 gap-6">
                <Card className="p-6 border-2 border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">
                    Total de Usuarios
                  </p>
                  <p className="text-4xl font-bold text-[#1E3A8A]">
                    {statsQuery.data.totalUsers}
                  </p>
                </Card>
                <Card className="p-6 border-2 border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Usuarios Activos</p>
                  <p className="text-4xl font-bold text-green-600">
                    {statsQuery.data.activeUsers}
                  </p>
                </Card>
                <Card className="p-6 border-2 border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">
                    Usuarios Bloqueados
                  </p>
                  <p className="text-4xl font-bold text-red-600">
                    {statsQuery.data.blockedUsers}
                  </p>
                </Card>
                <Card className="p-6 border-2 border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Administradores</p>
                  <p className="text-4xl font-bold text-blue-600">
                    {statsQuery.data.adminUsers}
                  </p>
                </Card>
              </div>
            ) : null}
          </div>
        )}

        {/* Configuración Tab */}
        {activeTab === "configuracion" && (
          <div>
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-6">
              Configuración del Sistema
            </h2>

            <Card className="p-6 border-2 border-gray-200">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">
                    Opciones de configuración
                  </p>
                  <p className="text-sm text-gray-600">
                    Las opciones avanzadas de configuración del sistema estarán
                    disponibles pronto.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
