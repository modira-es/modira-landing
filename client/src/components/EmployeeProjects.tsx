import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Loader2,
  AlertCircle,
  Search,
  Filter,
  X,
  Edit2,
  Check,
  User,
  Mail,
  Building2,
  Calendar,
  Plus,
  FileText,
  Upload,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  Settings2,
  Clock,
  MessageSquare,
  CheckCircle2,
  XCircle,
  ClipboardList,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type ProjectStatus =
  | "Pendiente"
  | "Activo"
  | "Pausado"
  | "Entregado"
  | "Completado";

interface ProjectDocument {
  id: string;
  project_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: ProjectStatus;
  fecha_inicio: string;
  fecha_fin: string | null;
  company_id: string;
  user_id: string;
  created_at: string;
  cliente_nombre: string;
  cliente_email: string;
  empresa_nombre: string;

  change_requests_enabled?: boolean;
  change_requests_deadline?: string | null;
}

/**
 * ============================================================
 * SOLICITUD DE CAMBIO
 * ============================================================
 *
 * IMPORTANTE:
 *
 * Antes solamente guardábamos:
 *
 *   project_id
 *   status
 *
 * Ahora guardamos la solicitud completa para poder abrirla
 * desde el área del trabajador.
 */
interface ProjectChangeRequest {
  id: string;
  project_id: string;
  user_id: string;
  company_id: string | null;
  client_id: string | null;

  description: string;

  status:
    | "pending"
    | "in_review"
    | "accepted"
    | "rejected"
    | "completed";

  reviewed_by: string | null;
  reviewed_at: string | null;

  review_notes: string | null;

  accepted_at: string | null;

  completed_by: string | null;
  completed_at: string | null;

  created_at: string;
  updated_at: string;
}

export default function EmployeeProjects({
  onCreateProject,
}: {
  onCreateProject: () => void;
}) {
  const { user } = useAuth();

  // ============================================================
  // PROYECTOS
  // ============================================================

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  // ============================================================
  // FILTROS
  // ============================================================

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<string>("all");

  const [companyFilter, setCompanyFilter] =
    useState<string>("all");

  // ============================================================
  // EDICIÓN DE TÍTULO
  // ============================================================

  const [editingTitleId, setEditingTitleId] =
    useState<string | null>(null);

  const [tempTitle, setTempTitle] =
    useState("");

  // ============================================================
  // DOCUMENTOS PDF
  // ============================================================

  const [projectDocuments, setProjectDocuments] =
    useState<ProjectDocument[]>([]);

  const [loadingDocuments, setLoadingDocuments] =
    useState(false);

  const [uploadingDocumentProjectId, setUploadingDocumentProjectId] =
    useState<string | null>(null);

  const [openingDocumentId, setOpeningDocumentId] =
    useState<string | null>(null);

  const [deletingDocumentId, setDeletingDocumentId] =
    useState<string | null>(null);

  // ============================================================
  // SOLICITUDES DE CAMBIO
  // ============================================================

  const [projectChangeRequests, setProjectChangeRequests] =
    useState<ProjectChangeRequest[]>([]);

  const [loadingProjectChangeRequests, setLoadingProjectChangeRequests] =
    useState(false);

  const [selectedProjectChangeRequest, setSelectedProjectChangeRequest] =
    useState<ProjectChangeRequest | null>(null);

  const [projectChangeReviewNotes, setProjectChangeReviewNotes] =
    useState("");

  const [processingProjectChangeRequest, setProcessingProjectChangeRequest] =
    useState<string | null>(null);

  // ============================================================
  // CONFIGURACIÓN DEL PERIODO DE SOLICITUDES
  // ============================================================

  const [savingChangeRequestConfig, setSavingChangeRequestConfig] =
    useState<string | null>(null);

  const [changeRequestDeadlineDrafts, setChangeRequestDeadlineDrafts] =
    useState<Record<string, string>>({});

  // ============================================================
  // CARGAR PROYECTOS
  // ============================================================

  const fetchProjects = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // ========================================================
      // 1. PROYECTOS MEDIANTE RPC SEGURA
      // ========================================================

      const {
        data: projectsData,
        error: projectsError,
      } = await supabase.rpc(
        "get_worker_projects"
      );

      if (projectsError) {
        throw projectsError;
      }

      const baseProjects: Project[] =
        projectsData || [];

      // ========================================================
      // 2. CONFIGURACIÓN DE SOLICITUDES
      // ========================================================

      if (baseProjects.length > 0) {
        const projectIds =
          baseProjects.map(
            (project) => project.id
          );

        const {
          data: configurationData,
          error: configurationError,
        } = await supabase
          .from("projects")
          .select(
            "id, change_requests_enabled, change_requests_deadline"
          )
          .in("id", projectIds);

        if (configurationError) {
          console.error(
            "[EmployeeProjects] Error loading change request configuration:",
            configurationError
          );
        } else {
          const configurationMap =
            new Map<
              string,
              {
                change_requests_enabled: boolean;
                change_requests_deadline: string | null;
              }
            >();

          (
            configurationData || []
          ).forEach(
            (configuration: any) => {
              configurationMap.set(
                configuration.id,
                {
                  change_requests_enabled:
                    configuration.change_requests_enabled ??
                    false,

                  change_requests_deadline:
                    configuration.change_requests_deadline ??
                    null,
                }
              );
            }
          );

          baseProjects.forEach(
            (project) => {
              const configuration =
                configurationMap.get(
                  project.id
                );

              if (configuration) {
                project.change_requests_enabled =
                  configuration.change_requests_enabled;

                project.change_requests_deadline =
                  configuration.change_requests_deadline;
              }
            }
          );
        }
      }

      setProjects(baseProjects);

      // ========================================================
      // 3. DOCUMENTOS
      // ========================================================

      if (baseProjects.length > 0) {
        const projectIds =
          baseProjects.map(
            (project) => project.id
          );

        const {
          data: documentsData,
          error: documentsError,
        } = await supabase
          .from("project_documents")
          .select(
            `
              id,
              project_id,
              file_name,
              storage_path,
              mime_type,
              file_size,
              uploaded_by,
              created_at,
              updated_at
            `
          )
          .in(
            "project_id",
            projectIds
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (documentsError) {
          console.error(
            "[EmployeeProjects] Error loading project documents:",
            documentsError
          );

          setProjectDocuments([]);
        } else {
          setProjectDocuments(
            documentsData || []
          );
        }
      } else {
        setProjectDocuments([]);
      }

      // ========================================================
      // 4. SOLICITUDES DE CAMBIO
      //
      // IMPORTANTE:
      //
      // Aquí NO reducimos la respuesta a:
      //
      //   { project_id, status }
      //
      // Guardamos TODA la solicitud.
      // ========================================================

      setLoadingProjectChangeRequests(
        true
      );

      const {
        data: changeRequestsData,
        error: changeRequestsError,
      } = await supabase.rpc(
        "get_worker_project_change_requests"
      );

      if (changeRequestsError) {
        console.error(
          "[EmployeeProjects] Error loading project change requests:",
          changeRequestsError
        );

        setProjectChangeRequests([]);
      } else {
        setProjectChangeRequests(
          (changeRequestsData || []) as ProjectChangeRequest[]
        );
      }

      // ========================================================
      // 5. PREPARAR FECHAS
      // ========================================================

      const deadlineDrafts: Record<
        string,
        string
      > = {};

      baseProjects.forEach(
        (project) => {
          if (
            project.change_requests_deadline
          ) {
            deadlineDrafts[
              project.id
            ] =
              toDateTimeLocal(
                project.change_requests_deadline
              );
          } else {
            deadlineDrafts[
              project.id
            ] = "";
          }
        }
      );

      setChangeRequestDeadlineDrafts(
        deadlineDrafts
      );
    } catch (err: any) {
      console.error(
        "[EmployeeProjects] Error fetching projects:",
        err
      );

      setError(
        err?.message ||
          "No se pudieron cargar los proyectos."
      );
    } finally {
      setLoading(false);
      setLoadingProjectChangeRequests(
        false
      );
    }
  };

  // ============================================================
  // CARGA INICIAL
  // ============================================================

  useEffect(() => {
    fetchProjects();
  }, [user]);

  // ============================================================
  // ACTUALIZAR ESTADO DEL PROYECTO
  // ============================================================

  const handleStatusChange = async (
    projectId: string,
    newStatus: string
  ) => {
    try {
      setUpdatingId(projectId);

      const {
        data: updatedProject,
        error: updateError,
      } = await supabase.rpc(
        "update_project_by_worker",
        {
          p_project_id:
            projectId,

          p_nombre: null,

          p_estado:
            newStatus,
        }
      );

      if (updateError) {
        throw updateError;
      }

      if (!updatedProject) {
        throw new Error(
          "No se pudo actualizar el proyecto."
        );
      }

      setProjects(
        (current) =>
          current.map(
            (project) =>
              project.id ===
              projectId
                ? {
                    ...project,
                    estado:
                      newStatus as ProjectStatus,
                  }
                : project
          )
      );

      toast.success(
        "Estado del proyecto actualizado correctamente."
      );
    } catch (err: any) {
      console.error(
        "[EmployeeProjects] Error updating project status:",
        err
      );

      toast.error(
        `Error al actualizar el estado: ${
          err?.message ||
          "Error desconocido"
        }`
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // ============================================================
  // ACTUALIZAR TÍTULO
  // ============================================================

  const handleTitleUpdate = async (
    projectId: string
  ) => {
    if (!tempTitle.trim()) {
      toast.error(
        "El título no puede estar vacío."
      );
      return;
    }

    try {
      setUpdatingId(projectId);

      const {
        data: updatedProject,
        error: updateError,
      } = await supabase.rpc(
        "update_project_by_worker",
        {
          p_project_id:
            projectId,

          p_nombre:
            tempTitle.trim(),

          p_estado: null,
        }
      );

      if (updateError) {
        throw updateError;
      }

      if (!updatedProject) {
        throw new Error(
          "No se pudo actualizar el proyecto."
        );
      }

      setProjects(
        (current) =>
          current.map(
            (project) =>
              project.id ===
              projectId
                ? {
                    ...project,
                    nombre:
                      tempTitle.trim(),
                  }
                : project
          )
      );

      toast.success(
        "Título del proyecto actualizado."
      );

      setEditingTitleId(null);
    } catch (err: any) {
      console.error(
        "[EmployeeProjects] Error updating project title:",
        err
      );

      toast.error(
        `Error al actualizar el título: ${
          err?.message ||
          "Error desconocido"
        }`
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // ============================================================
  // COMENZAR EDICIÓN DE TÍTULO
  // ============================================================

  const startEditingTitle = (
    project: Project
  ) => {
    setEditingTitleId(project.id);
    setTempTitle(project.nombre);
  };

  // ============================================================
  // DOCUMENTOS — REFRESCAR
  // ============================================================

  const refreshProjectDocuments =
    async () => {
      try {
        setLoadingDocuments(true);

        const {
          data,
          error: documentsError,
        } = await supabase
          .from("project_documents")
          .select(
            `
              id,
              project_id,
              file_name,
              storage_path,
              mime_type,
              file_size,
              uploaded_by,
              created_at,
              updated_at
            `
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (documentsError) {
          throw documentsError;
        }

        setProjectDocuments(
          data || []
        );
      } catch (err: any) {
        console.error(
          "[EmployeeProjects] Error refreshing documents:",
          err
        );

        toast.error(
          err?.message ||
            "No se pudieron actualizar los documentos."
        );
      } finally {
        setLoadingDocuments(false);
      }
    };

  // ============================================================
  // SUBIR PDF
  // ============================================================

  const handleUploadDocument =
    async (
      project: Project,
      file: File
    ) => {
      try {
        setUploadingDocumentProjectId(
          project.id
        );

        const isPdf =
          file.type ===
            "application/pdf" ||
          file.name
            .toLowerCase()
            .endsWith(".pdf");

        if (!isPdf) {
          throw new Error(
            "Solo se permiten archivos PDF."
          );
        }

        if (file.size <= 0) {
          throw new Error(
            "El archivo PDF está vacío."
          );
        }

        // ------------------------------------------------------
        // GENERAR ID DEL DOCUMENTO
        // ------------------------------------------------------

        const documentId =
          crypto.randomUUID();

        const storagePath =
          `${project.id}/${documentId}.pdf`;

        // ------------------------------------------------------
        // SUBIR A STORAGE
        // ------------------------------------------------------

        const {
          error: uploadError,
        } = await supabase.storage
          .from(
            "project-documents"
          )
          .upload(
            storagePath,
            file,
            {
              contentType:
                "application/pdf",

              upsert: false,
            }
          );

        if (uploadError) {
          throw uploadError;
        }

        // ------------------------------------------------------
        // REGISTRAR METADATOS
        // ------------------------------------------------------

        const {
          data: documentData,
          error: attachError,
        } = await supabase.rpc(
          "attach_project_document",
          {
            p_project_id:
              project.id,

            p_document_id:
              documentId,

            p_file_name:
              file.name,

            p_file_size:
              file.size,
          }
        );

        if (attachError) {
          // Intentamos eliminar el objeto físico
          // para evitar un archivo huérfano.
          await supabase.storage
            .from(
              "project-documents"
            )
            .remove([
              storagePath,
            ]);

          throw attachError;
        }

        if (!documentData) {
          throw new Error(
            "El documento se subió pero no se pudo registrar."
          );
        }

        setProjectDocuments(
          (current) => [
            documentData,
            ...current.filter(
              (document) =>
                document.id !==
                documentData.id
            ),
          ]
        );

        toast.success(
          "PDF adjuntado al proyecto correctamente."
        );
      } catch (err: any) {
        console.error(
          "[EmployeeProjects] Error uploading project document:",
          err
        );

        toast.error(
          err?.message ||
            "No se pudo adjuntar el PDF."
        );
      } finally {
        setUploadingDocumentProjectId(
          null
        );
      }
    };

  // ============================================================
  // SUSTITUIR PDF
  // ============================================================

  const handleReplaceDocument =
    async (
      project: Project,
      document: ProjectDocument,
      file: File
    ) => {
      try {
        setUploadingDocumentProjectId(
          project.id
        );

        const isPdf =
          file.type ===
            "application/pdf" ||
          file.name
            .toLowerCase()
            .endsWith(".pdf");

        if (!isPdf) {
          throw new Error(
            "Solo se permiten archivos PDF."
          );
        }

        if (file.size <= 0) {
          throw new Error(
            "El archivo PDF está vacío."
          );
        }

        const storagePath =
          `${project.id}/${document.id}.pdf`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from(
            "project-documents"
          )
          .upload(
            storagePath,
            file,
            {
              contentType:
                "application/pdf",

              upsert: true,
            }
          );

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: updatedDocument,
          error: attachError,
        } = await supabase.rpc(
          "attach_project_document",
          {
            p_project_id:
              project.id,

            p_document_id:
              document.id,

            p_file_name:
              file.name,

            p_file_size:
              file.size,
          }
        );

        if (attachError) {
          throw attachError;
        }

        if (!updatedDocument) {
          throw new Error(
            "No se pudo actualizar el registro documental."
          );
        }

        setProjectDocuments(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                document.id
                  ? updatedDocument
                  : item
            )
        );

        toast.success(
          "PDF sustituido correctamente."
        );
      } catch (err: any) {
        console.error(
          "[EmployeeProjects] Error replacing project document:",
          err
        );

        toast.error(
          err?.message ||
            "No se pudo sustituir el PDF."
        );
      } finally {
        setUploadingDocumentProjectId(
          null
        );
      }
    };

  // ============================================================
  // ABRIR PDF PRIVADO
  // ============================================================

  const handleOpenDocument =
    async (
      document: ProjectDocument
    ) => {
      try {
        setOpeningDocumentId(
          document.id
        );

        const {
          data,
          error: signedUrlError,
        } =
          await supabase.storage
            .from(
              "project-documents"
            )
            .createSignedUrl(
              document.storage_path,
              60 * 60
            );

        if (signedUrlError) {
          throw signedUrlError;
        }

        if (!data?.signedUrl) {
          throw new Error(
            "No se pudo generar el enlace seguro del documento."
          );
        }

        window.open(
          data.signedUrl,
          "_blank",
          "noopener,noreferrer"
        );
      } catch (err: any) {
        console.error(
          "[EmployeeProjects] Error opening project document:",
          err
        );

        toast.error(
          err?.message ||
            "No se pudo abrir el PDF."
        );
      } finally {
        setOpeningDocumentId(
          null
        );
      }
    };

  // ============================================================
  // DESCARGAR PDF
  // ============================================================

  const handleDownloadDocument =
    async (
      document: ProjectDocument
    ) => {
      try {
        setOpeningDocumentId(
          document.id
        );

        const {
          data,
          error: signedUrlError,
        } =
          await supabase.storage
            .from(
              "project-documents"
            )
            .createSignedUrl(
              document.storage_path,
              60 * 60
            );

        if (signedUrlError) {
          throw signedUrlError;
        }

        if (!data?.signedUrl) {
          throw new Error(
            "No se pudo generar el enlace seguro del documento."
          );
        }

        const link =
          window.document.createElement(
            "a"
          );

        link.href =
          data.signedUrl;

        link.download =
          document.file_name;

        link.target =
          "_blank";

        link.rel =
          "noopener noreferrer";

        window.document.body.appendChild(
          link
        );

        link.click();

        link.remove();
      } catch (err: any) {
        console.error(
          "[EmployeeProjects] Error downloading project document:",
          err
        );

        toast.error(
          err?.message ||
            "No se pudo descargar el PDF."
        );
      } finally {
        setOpeningDocumentId(
          null
        );
      }
    };

  // ============================================================
  // ELIMINAR PDF
  // ============================================================

  const handleDeleteDocument =
    async (
      document: ProjectDocument
    ) => {
      const confirmed =
        window.confirm(
          `¿Seguro que quieres eliminar el documento "${document.file_name}"?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeletingDocumentId(
          document.id
        );

        // ------------------------------------------------------
        // 1. STORAGE
        // ------------------------------------------------------

        const {
          error: storageError,
        } =
          await supabase.storage
            .from(
              "project-documents"
            )
            .remove([
              document.storage_path,
            ]);

        if (storageError) {
          throw storageError;
        }

        // ------------------------------------------------------
        // 2. METADATA
        // ------------------------------------------------------

        const {
          error: detachError,
        } = await supabase.rpc(
          "detach_project_document",
          {
            p_document_id:
              document.id,
          }
        );

        if (detachError) {
          throw detachError;
        }

        setProjectDocuments(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                document.id
            )
        );

        toast.success(
          "Documento eliminado correctamente."
        );
      } catch (err: any) {
        console.error(
          "[EmployeeProjects] Error deleting project document:",
          err
        );

        toast.error(
          err?.message ||
            "No se pudo eliminar el PDF."
        );
      } finally {
        setDeletingDocumentId(
          null
        );
      }
    };

  // ============================================================
  // CONFIGURAR SOLICITUDES DE CAMBIO
  // ============================================================

  const handleConfigureChangeRequests =
    async (
      project: Project,
      enabled: boolean
    ) => {
      try {
        setSavingChangeRequestConfig(
          project.id
        );

        let deadline:
          | string
          | null =
          null;

        if (enabled) {
          const draft =
            changeRequestDeadlineDrafts[
              project.id
            ];

          if (!draft) {
            throw new Error(
              "Selecciona una fecha límite."
            );
          }

          const deadlineDate =
            new Date(draft);

          if (
            Number.isNaN(
              deadlineDate.getTime()
            )
          ) {
            throw new Error(
              "La fecha límite no es válida."
            );
          }

          if (
            deadlineDate.getTime() <=
            Date.now()
          ) {
            throw new Error(
              "La fecha límite debe ser futura."
            );
          }

          deadline =
            deadlineDate.toISOString();
        }

        const {
          data: updatedProject,
          error: configurationError,
        } =
          await supabase.rpc(
            "configure_project_change_requests",
            {
              p_project_id:
                project.id,

              p_enabled:
                enabled,

              p_deadline:
                deadline,
            }
          );

        if (configurationError) {
          throw configurationError;
        }

        if (!updatedProject) {
          throw new Error(
            "La base de datos no devolvió el proyecto actualizado."
          );
        }

        setProjects(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                project.id
                  ? {
                      ...item,

                      change_requests_enabled:
                        updatedProject.change_requests_enabled,

                      change_requests_deadline:
                        updatedProject.change_requests_deadline,
                    }
                  : item
            )
        );

        if (
          updatedProject.change_requests_deadline
        ) {
          setChangeRequestDeadlineDrafts(
            (current) => ({
              ...current,

              [project.id]:
                toDateTimeLocal(
                  updatedProject.change_requests_deadline
                ),
            })
          );
        } else {
          setChangeRequestDeadlineDrafts(
            (current) => ({
              ...current,

              [project.id]:
                "",
            })
          );
        }

        toast.success(
          enabled
            ? "Periodo de solicitudes de cambio habilitado."
            : "Solicitudes de cambio deshabilitadas."
        );
      } catch (err: any) {
        console.error(
          "[EmployeeProjects] Error configuring change requests:",
          err
        );

        toast.error(
          err?.message ||
            "No se pudo configurar el periodo de solicitudes."
        );
      } finally {
        setSavingChangeRequestConfig(
          null
        );
      }
    };

  // ============================================================
  // ESTADO DE SOLICITUD POR PROYECTO
  // ============================================================

  const getProjectChangeRequest =
    (
      projectId: string
    ) => {
      const requests =
        projectChangeRequests.filter(
          (request) =>
            request.project_id ===
            projectId
        );

      if (
        requests.length ===
        0
      ) {
        return null;
      }

      const activeStatuses =
        [
          "pending",
          "in_review",
          "accepted",
        ];

      const activeRequest =
        requests.find(
          (request) =>
            activeStatuses.includes(
              request.status
            )
        );

      return (
        activeRequest ||
        requests[0]
      );
    };

  const getChangeRequestStatusLabel =
    (
      status:
        | string
        | null
    ) => {
      switch (status) {
        case "pending":
          return "Pendiente";

        case "in_review":
          return "En revisión";

        case "accepted":
          return "Aceptada";

        case "rejected":
          return "Rechazada";

        case "completed":
          return "Completada";

        default:
          return null;
      }
    };

  const getChangeRequestStatusClass =
    (
      status:
        | string
        | null
    ) => {
      switch (status) {
        case "pending":
          return "bg-yellow-100 text-yellow-700 border-yellow-200";

        case "in_review":
          return "bg-blue-100 text-blue-700 border-blue-200";

        case "accepted":
          return "bg-green-100 text-green-700 border-green-200";

        case "rejected":
          return "bg-red-100 text-red-700 border-red-200";

        case "completed":
          return "bg-purple-100 text-purple-700 border-purple-200";

        default:
          return "bg-slate-100 text-slate-700 border-slate-200";
      }
    };

  // ============================================================
  // ABRIR SOLICITUD
  // ============================================================

  const handleOpenProjectChangeRequest =
    (
      request: ProjectChangeRequest
    ) => {
      setSelectedProjectChangeRequest(
        request
      );

      setProjectChangeReviewNotes(
        request.review_notes ||
          ""
      );
    };

  // ============================================================
  // RESOLVER SOLICITUD
  // ============================================================

  const handleResolveProjectChangeRequest =
    async (
      requestId: string,
      action:
        | "in_review"
        | "accepted"
        | "rejected"
        | "completed",
      reviewNotes?: string
    ) => {
      try {
        setProcessingProjectChangeRequest(
          requestId
        );

        const {
          data,
          error:
            resolveError,
        } =
          await supabase.rpc(
            "resolve_project_change_request",
            {
              p_request_id:
                requestId,

              p_action:
                action,

              p_review_notes:
                reviewNotes?.trim() ||
                null,
            }
          );

        if (resolveError) {
          throw resolveError;
        }

        if (!data) {
          throw new Error(
            "La base de datos no devolvió la solicitud actualizada."
          );
        }

        // Actualizamos inmediatamente la solicitud
        // en memoria.
        setProjectChangeRequests(
          (current) =>
            current.map(
              (request) =>
                request.id ===
                requestId
                  ? {
                      ...request,
                      ...data,
                    }
                  : request
            )
        );

        setSelectedProjectChangeRequest(
          null
        );

        setProjectChangeReviewNotes(
          ""
        );

        toast.success(
          "Solicitud actualizada correctamente."
        );

        // Volvemos a cargar para garantizar
        // que la UI queda sincronizada con Supabase.
        await fetchProjects();
      } catch (error: any) {
        console.error(
          "[EmployeeProjects] Error resolving project change request:",
          error
        );

        toast.error(
          error?.message ||
            "No se pudo actualizar la solicitud."
        );
      } finally {
        setProcessingProjectChangeRequest(
          null
        );
      }
    };

  // ============================================================
  // DOCUMENTOS POR PROYECTO
  // ============================================================

  const getProjectDocuments =
    (
      projectId: string
    ) => {
      return projectDocuments.filter(
        (document) =>
          document.project_id ===
          projectId
      );
    };

  // ============================================================
  // FORMATO TAMAÑO
  // ============================================================

  const formatFileSize =
    (
      bytes: number
    ) => {
      if (bytes < 1024) {
        return `${bytes} B`;
      }

      if (
        bytes <
        1024 * 1024
      ) {
        return `${(
          bytes / 1024
        ).toFixed(1)} KB`;
      }

      return `${(
        bytes /
        (1024 * 1024)
      ).toFixed(1)} MB`;
    };

  // ============================================================
  // ESTADOS DE PROYECTOS
  // ============================================================

  const getStatusBadge =
    (
      estado: ProjectStatus
    ) => {
      switch (estado) {
        case "Pendiente":
          return (
            <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-none">
              ⚪ Pendiente
            </Badge>
          );

        case "Activo":
          return (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
              🟢 Activo
            </Badge>
          );

        case "Pausado":
          return (
            <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none">
              🟡 Pausado
            </Badge>
          );

        case "Entregado":
          return (
            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none">
              📦 Entregado
            </Badge>
          );

        case "Completado":
          return (
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
              🔵 Completado
            </Badge>
          );

        default:
          return (
            <Badge variant="outline">
              {estado}
            </Badge>
          );
      }
    };

  // ============================================================
  // ESTILO SELECT ESTADO
  // ============================================================

  const getStatusSelectClass =
    (
      status: string
    ) => {
      switch (status) {
        case "Pendiente":
          return "bg-slate-100 text-slate-700";

        case "Activo":
          return "bg-emerald-100 text-emerald-700";

        case "Pausado":
          return "bg-amber-100 text-amber-700";

        case "Entregado":
          return "bg-blue-100 text-blue-700";

        case "Completado":
          return "bg-purple-100 text-purple-700";

        default:
          return "bg-slate-100 text-slate-700";
      }
    };

  // ============================================================
  // EMPRESAS
  // ============================================================

  const uniqueCompanies =
    useMemo(() => {
      return Array.from(
        new Set(
          projects.map(
            (project) =>
              project.empresa_nombre
          )
        )
      )
        .filter(Boolean)
        .sort();
    }, [projects]);

  // ============================================================
  // FILTRADO
  // ============================================================

  const filteredProjects =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return projects.filter(
        (project) => {
          const matchesSearch =
            !search ||
            project.nombre
              .toLowerCase()
              .includes(search) ||
            (
              project.descripcion ||
              ""
            )
              .toLowerCase()
              .includes(search) ||
            project.cliente_nombre
              .toLowerCase()
              .includes(search) ||
            project.cliente_email
              .toLowerCase()
              .includes(search);

          const matchesStatus =
            statusFilter ===
              "all" ||
            project.estado ===
              statusFilter;

          const matchesCompany =
            companyFilter ===
              "all" ||
            project.empresa_nombre ===
              companyFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesCompany
          );
        }
      );
    }, [
      projects,
      searchTerm,
      statusFilter,
      companyFilter,
    ]);

  // ============================================================
  // LIMPIAR FILTROS
  // ============================================================

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCompanyFilter("all");
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <section className="space-y-6">

        {/* ======================================================
            CABECERA
            ====================================================== */}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div>
            <h2 className="text-2xl font-bold text-[#1E3A8A]">
              Gestión de Proyectos
            </h2>

            <p className="text-sm text-[#52627A]">
              Administra los proyectos de todos los clientes
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">

            <Badge
              variant="outline"
              className="bg-white py-1 px-3 border-[#E8ECF2]"
            >
              {filteredProjects.length} de{" "}
              {projects.length} proyectos
            </Badge>

            <Button
              type="button"
              onClick={
                onCreateProject
              }
              className="bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162D6B]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear proyecto
            </Button>

          </div>
        </div>

        {/* ======================================================
            ERROR
            ====================================================== */}

        {error && (
          <Card className="p-4 border-red-200 bg-red-50 text-red-700 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>
              Error: {error}
            </span>
          </Card>
        )}

        {/* ======================================================
            FILTROS
            ====================================================== */}

        <Card className="p-4 border border-[#E8ECF2] shadow-sm">

          <div className="flex flex-col lg:flex-row gap-4">

            <div className="relative flex-1">

              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52627A]" />

              <Input
                placeholder="Buscar por nombre, descripción, cliente o email..."
                value={
                  searchTerm
                }
                onChange={(
                  event
                ) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                className="pl-10 border-[#E8ECF2]"
              />

            </div>

            <div className="flex flex-wrap gap-3 items-center">

              <div className="flex items-center gap-2">

                <Filter className="h-4 w-4 text-[#52627A]" />

                <Select
                  value={
                    statusFilter
                  }
                  onValueChange={
                    setStatusFilter
                  }
                >
                  <SelectTrigger className="w-[140px] border-[#E8ECF2]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">
                      Todos los estados
                    </SelectItem>

                    <SelectItem value="Pendiente">
                      Pendiente
                    </SelectItem>

                    <SelectItem value="Activo">
                      Activo
                    </SelectItem>

                    <SelectItem value="Pausado">
                      Pausado
                    </SelectItem>

                    <SelectItem value="Entregado">
                      Entregado
                    </SelectItem>

                    <SelectItem value="Completado">
                      Completado
                    </SelectItem>
                  </SelectContent>
                </Select>

              </div>

              <Select
                value={
                  companyFilter
                }
                onValueChange={
                  setCompanyFilter
                }
              >
                <SelectTrigger className="w-[180px] border-[#E8ECF2]">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>

                <SelectContent>

                  <SelectItem value="all">
                    Todas las empresas
                  </SelectItem>

                  {uniqueCompanies.map(
                    (company) => (
                      <SelectItem
                        key={
                          company
                        }
                        value={
                          company
                        }
                      >
                        {company}
                      </SelectItem>
                    )
                  )}

                </SelectContent>
              </Select>

              {(
                searchTerm ||
                statusFilter !==
                  "all" ||
                companyFilter !==
                  "all"
              ) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={
                    clearFilters
                  }
                  className="text-[#52627A] hover:text-[#1E3A8A]"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              )}

            </div>
          </div>
        </Card>

        {/* ======================================================
            CARGANDO
            ====================================================== */}

        {loading ? (

          <Card className="p-12 text-center border-none shadow-md">

            <Loader2 className="h-12 w-12 text-[#1E3A8A] animate-spin mx-auto mb-4" />

            <p className="text-[#52627A]">
              Cargando proyectos...
            </p>

          </Card>

        ) : filteredProjects.length === 0 ? (

          <Card className="p-12 text-center border-none shadow-md bg-[#F8FAFC]">

            <p className="text-[#52627A]">
              No se encontraron proyectos con los filtros seleccionados.
            </p>

            {(
              searchTerm ||
              statusFilter !==
                "all" ||
              companyFilter !==
                "all"
            ) && (
              <Button
                variant="link"
                onClick={
                  clearFilters
                }
                className="mt-2 text-[#1E3A8A]"
              >
                Ver todos los proyectos
              </Button>
            )}

          </Card>

        ) : (

          <div className="space-y-4">

            {filteredProjects.map(
              (project) => {

                const documents =
                  getProjectDocuments(
                    project.id
                  );

                const changeRequest =
                  getProjectChangeRequest(
                    project.id
                  );

                const changeRequestStatus =
                  changeRequest?.status ||
                  null;

                const changeRequestStatusLabel =
                  getChangeRequestStatusLabel(
                    changeRequestStatus
                  );

                const changeRequestStatusClass =
                  getChangeRequestStatusClass(
                    changeRequestStatus
                  );

                const isSavingChangeRequestConfig =
                  savingChangeRequestConfig ===
                  project.id;

                const isProcessingRequest =
                  processingProjectChangeRequest ===
                  changeRequest?.id;

                return (

                  <Card
                    key={
                      project.id
                    }
                    className="p-6 border border-[#E8ECF2] hover:border-[#1E3A8A] hover:shadow-md transition-all duration-300"
                  >

                    <div className="flex flex-col space-y-6">

                      {/* ==================================================
                          PARTE SUPERIOR
                          ================================================== */}

                      <div className="flex flex-col md:flex-row justify-between items-start gap-4">

                        <div className="flex-1 w-full">

                          {editingTitleId ===
                          project.id ? (

                            <div className="flex gap-2 w-full max-w-md">

                              <Input
                                value={
                                  tempTitle
                                }
                                onChange={(
                                  event
                                ) =>
                                  setTempTitle(
                                    event.target.value
                                  )
                                }
                                className="font-bold text-lg text-[#1E3A8A]"
                                autoFocus
                                onKeyDown={(
                                  event
                                ) => {

                                  if (
                                    event.key ===
                                    "Enter"
                                  ) {
                                    handleTitleUpdate(
                                      project.id
                                    );
                                  }

                                  if (
                                    event.key ===
                                    "Escape"
                                  ) {
                                    setEditingTitleId(
                                      null
                                    );
                                  }

                                }}
                              />

                              <Button
                                size="icon"
                                onClick={() =>
                                  handleTitleUpdate(
                                    project.id
                                  )
                                }
                                disabled={
                                  updatingId ===
                                  project.id
                                }
                              >
                                <Check className="h-4 w-4" />
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  setEditingTitleId(
                                    null
                                  )
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>

                            </div>

                          ) : (

                            <div className="flex items-center gap-2 group">

                              <h3 className="text-xl font-bold text-[#1E3A8A]">
                                {
                                  project.nombre
                                }
                              </h3>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() =>
                                  startEditingTitle(
                                    project
                                  )
                                }
                              >
                                <Edit2 className="h-3.5 w-3.5 text-[#52627A]" />
                              </Button>

                            </div>

                          )}

                          <p className="text-[#52627A] mt-2 text-sm leading-relaxed">
                            {
                              project.descripcion ||
                              "Sin descripción."
                            }
                          </p>

                        </div>

                        <Select
                          value={
                            project.estado
                          }
                          onValueChange={(
                            value
                          ) =>
                            handleStatusChange(
                              project.id,
                              value
                            )
                          }
                          disabled={
                            updatingId ===
                            project.id
                          }
                        >

                          <SelectTrigger
                            className={`w-[150px] h-9 text-xs border-[#E8ECF2] ${getStatusSelectClass(
                              project.estado
                            )}`}
                          >
                            <SelectValue placeholder="Cambiar estado" />
                          </SelectTrigger>

                          <SelectContent>

                            <SelectItem value="Pendiente">
                              Pendiente
                            </SelectItem>

                            <SelectItem value="Activo">
                              Activo
                            </SelectItem>

                            <SelectItem value="Pausado">
                              Pausado
                            </SelectItem>

                            <SelectItem value="Entregado">
                              Entregado
                            </SelectItem>

                            <SelectItem value="Completado">
                              Completado
                            </SelectItem>

                          </SelectContent>

                        </Select>

                      </div>

                      {/* ==================================================
                          INFO
                          ================================================== */}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t border-[#F1F5F9]">

                        <div className="space-y-1.5">

                          <div className="flex items-center gap-2 text-[#64748B]">

                            <User className="h-3.5 w-3.5" />

                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              Cliente
                            </span>

                          </div>

                          <p className="text-sm font-semibold text-[#1E293B]">
                            {
                              project.cliente_nombre
                            }
                          </p>

                        </div>

                        <div className="space-y-1.5">

                          <div className="flex items-center gap-2 text-[#64748B]">

                            <Mail className="h-3.5 w-3.5" />

                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              Email
                            </span>

                          </div>

                          <p className="text-sm font-semibold text-[#1E293B] truncate">
                            {
                              project.cliente_email
                            }
                          </p>

                        </div>

                        <div className="space-y-1.5">

                          <div className="flex items-center gap-2 text-[#64748B]">

                            <Building2 className="h-3.5 w-3.5" />

                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              Empresa
                            </span>

                          </div>

                          <p className="text-sm font-semibold text-[#1E293B]">
                            {
                              project.empresa_nombre ||
                              "Sin empresa"
                            }
                          </p>

                        </div>

                        <div className="space-y-1.5">

                          <div className="flex items-center gap-2 text-[#64748B]">

                            <Calendar className="h-3.5 w-3.5" />

                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              Periodo
                            </span>

                          </div>

                          <div className="text-xs font-semibold text-[#1E293B]">

                            {new Date(
                              project.fecha_inicio
                            ).toLocaleDateString(
                              "es-ES"
                            )}

                            {project.fecha_fin
                              ? ` - ${new Date(
                                  project.fecha_fin
                                ).toLocaleDateString(
                                  "es-ES"
                                )}`
                              : " (Sin fin)"}

                          </div>

                        </div>

                      </div>

                      {/* ==================================================
                          SOLICITUDES DE CAMBIO
                          ================================================== */}

                      <div className="rounded-xl border border-[#E8ECF2] bg-[#F8FAFC] p-5">

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">

                          <div>

                            <div className="flex items-center gap-2">

                              <Settings2 className="h-5 w-5 text-[#1E3A8A]" />

                              <h4 className="font-bold text-[#1E293B]">
                                Solicitudes de cambio
                              </h4>

                            </div>

                            <p className="mt-1 text-xs text-[#64748B]">
                              Configura el periodo durante el que el cliente puede solicitar cambios en este proyecto.
                            </p>

                          </div>

                          <div className="flex flex-wrap items-center gap-2">

                            {changeRequestStatusLabel && (
                              <Badge
                                className={`border ${changeRequestStatusClass}`}
                              >
                                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />

                                Solicitud:{" "}
                                {
                                  changeRequestStatusLabel
                                }
                              </Badge>
                            )}

                            {changeRequest && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleOpenProjectChangeRequest(
                                    changeRequest
                                  )
                                }
                                className="border-[#E8ECF2]"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Ver solicitud
                              </Button>
                            )}

                          </div>

                        </div>

                        {/* ==================================================
                            CONFIGURACIÓN
                            ================================================== */}

                        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_280px_auto] gap-4 items-end">

                          <div>

                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#64748B]">
                              Estado del periodo
                            </label>

                            <div
                              className={`rounded-lg border p-3 ${
                                project.change_requests_enabled
                                  ? "border-green-200 bg-green-50"
                                  : "border-slate-200 bg-white"
                              }`}
                            >

                              <div className="flex items-center gap-2">

                                <div
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    project.change_requests_enabled
                                      ? "bg-green-500"
                                      : "bg-slate-400"
                                  }`}
                                />

                                <span className="text-sm font-semibold">

                                  {project.change_requests_enabled
                                    ? "Solicitudes habilitadas"
                                    : "Solicitudes deshabilitadas"}

                                </span>

                              </div>

                            </div>

                          </div>

                          <div>

                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#64748B]">
                              Fecha límite
                            </label>

                            <div className="relative">

                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />

                              <Input
                                type="datetime-local"
                                value={
                                  changeRequestDeadlineDrafts[
                                    project.id
                                  ] || ""
                                }
                                disabled={
                                  isSavingChangeRequestConfig
                                }
                                onChange={(
                                  event
                                ) =>
                                  setChangeRequestDeadlineDrafts(
                                    (
                                      current
                                    ) => ({
                                      ...current,

                                      [project.id]:
                                        event
                                          .target
                                          .value,
                                    })
                                  )
                                }
                                className="pl-10 border-[#E8ECF2]"
                              />

                            </div>

                            {project.change_requests_deadline && (
                              <p className="mt-1 text-[11px] text-[#64748B]">

                                Actual:{" "}

                                {new Date(
                                  project.change_requests_deadline
                                ).toLocaleString(
                                  "es-ES"
                                )}

                              </p>
                            )}

                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            disabled={
                              !project.change_requests_enabled ||
                              isSavingChangeRequestConfig
                            }
                            onClick={() =>
                              handleConfigureChangeRequests(
                                project,
                                true
                              )
                            }
                            className="border-[#E8ECF2]"
                          >

                            {isSavingChangeRequestConfig ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="mr-2 h-4 w-4" />
                            )}

                            Guardar plazo

                          </Button>

                        </div>

                        {/* ==================================================
                            HABILITAR / DESHABILITAR
                            ================================================== */}

                        <div className="mt-4 flex flex-wrap gap-2">

                          <Button
                            type="button"
                            size="sm"
                            variant={
                              project.change_requests_enabled
                                ? "outline"
                                : "default"
                            }
                            disabled={
                              isSavingChangeRequestConfig
                            }
                            onClick={() =>
                              handleConfigureChangeRequests(
                                project,
                                true
                              )
                            }
                            className={
                              !project.change_requests_enabled
                                ? "bg-[#1E3A8A] text-white hover:bg-[#162D6B]"
                                : "border-[#E8ECF2]"
                            }
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Habilitar solicitudes
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              !project.change_requests_enabled ||
                              isSavingChangeRequestConfig
                            }
                            onClick={() =>
                              handleConfigureChangeRequests(
                                project,
                                false
                              )
                            }
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Deshabilitar
                          </Button>

                        </div>

                        {project.change_requests_enabled &&
                          project.change_requests_deadline && (
                            <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 p-3">

                              <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />

                              <p className="text-xs text-blue-700">

                                Los clientes podrán solicitar cambios hasta el{" "}

                                <strong>
                                  {new Date(
                                    project.change_requests_deadline
                                  ).toLocaleString(
                                    "es-ES"
                                  )}
                                </strong>

                                . La validación definitiva del plazo se realiza en la base de datos.

                              </p>

                            </div>
                          )}

                      </div>

                      {/* ==================================================
                          DOCUMENTACIÓN
                          ================================================== */}

                      <div className="rounded-xl border border-[#E8ECF2] bg-[#F8FAFC] p-5">

                        <div className="flex flex-col gap-4">

                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">

                            <div>

                              <div className="flex items-center gap-2">

                                <FileText className="h-5 w-5 text-[#1E3A8A]" />

                                <h4 className="font-bold text-[#1E293B]">
                                  Documentación del proyecto
                                </h4>

                                <Badge
                                  variant="outline"
                                  className="bg-white"
                                >
                                  {
                                    documents.length
                                  }
                                </Badge>

                              </div>

                              <p className="text-xs text-[#64748B] mt-1">
                                PDFs que estarán disponibles para el cliente desde su proyecto.
                              </p>

                            </div>

                            <label
                              className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162D6B] ${
                                uploadingDocumentProjectId ===
                                project.id
                                  ? "cursor-not-allowed opacity-60"
                                  : ""
                              }`}
                            >

                              {uploadingDocumentProjectId ===
                              project.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}

                              Adjuntar PDF

                              <input
                                type="file"
                                accept="application/pdf,.pdf"
                                className="hidden"
                                disabled={
                                  uploadingDocumentProjectId ===
                                  project.id
                                }
                                onChange={(
                                  event
                                ) => {

                                  const file =
                                    event
                                      .target
                                      .files?.[0] ||
                                    null;

                                  event.currentTarget.value =
                                    "";

                                  if (!file) {
                                    return;
                                  }

                                  handleUploadDocument(
                                    project,
                                    file
                                  );
                                }}
                              />

                            </label>

                          </div>

                          {/* ==================================================
                              LISTA DOCUMENTOS
                              ================================================== */}

                          {documents.length ===
                          0 ? (

                            <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-white p-6 text-center">

                              <FileText className="mx-auto h-8 w-8 text-[#94A3B8] mb-2" />

                              <p className="text-sm font-medium text-[#475569]">
                                No hay documentos adjuntos.
                              </p>

                              <p className="mt-1 text-xs text-[#94A3B8]">
                                Puedes adjuntar un PDF para que el cliente pueda consultarlo.
                              </p>

                            </div>

                          ) : (

                            <div className="space-y-2">

                              {documents.map(
                                (
                                  document
                                ) => (

                                  <div
                                    key={
                                      document.id
                                    }
                                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border border-[#E8ECF2] bg-white p-3"
                                  >

                                    <div className="flex items-center gap-3 min-w-0">

                                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-50">

                                        <FileText className="h-5 w-5 text-red-600" />

                                      </div>

                                      <div className="min-w-0">

                                        <p
                                          className="truncate text-sm font-semibold text-[#1E293B]"
                                          title={
                                            document.file_name
                                          }
                                        >
                                          {
                                            document.file_name
                                          }
                                        </p>

                                        <p className="text-xs text-[#64748B]">

                                          {formatFileSize(
                                            document.file_size
                                          )}

                                          {" · "}

                                          {new Date(
                                            document.updated_at ||
                                              document.created_at
                                          ).toLocaleDateString(
                                            "es-ES"
                                          )}

                                        </p>

                                      </div>

                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">

                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleOpenDocument(
                                            document
                                          )
                                        }
                                        disabled={
                                          openingDocumentId ===
                                          document.id
                                        }
                                        className="border-[#E8ECF2]"
                                      >

                                        {openingDocumentId ===
                                        document.id ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                          <Eye className="mr-2 h-4 w-4" />
                                        )}

                                        Ver

                                      </Button>

                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleDownloadDocument(
                                            document
                                          )
                                        }
                                        disabled={
                                          openingDocumentId ===
                                          document.id
                                        }
                                        className="border-[#E8ECF2]"
                                      >
                                        <Download className="mr-2 h-4 w-4" />
                                        Descargar
                                      </Button>

                                      <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-[#E8ECF2] bg-white px-3 py-2 text-sm font-medium text-[#1E3A8A] hover:bg-gray-50">

                                        <RefreshCw className="h-4 w-4" />

                                        Sustituir

                                        <input
                                          type="file"
                                          accept="application/pdf,.pdf"
                                          className="hidden"
                                          disabled={
                                            uploadingDocumentProjectId ===
                                            project.id
                                          }
                                          onChange={(
                                            event
                                          ) => {

                                            const file =
                                              event
                                                .target
                                                .files?.[0] ||
                                              null;

                                            event.currentTarget.value =
                                              "";

                                            if (!file) {
                                              return;
                                            }

                                            handleReplaceDocument(
                                              project,
                                              document,
                                              file
                                            );
                                          }}
                                        />

                                      </label>

                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleDeleteDocument(
                                            document
                                          )
                                        }
                                        disabled={
                                          deletingDocumentId ===
                                          document.id
                                        }
                                        className="border-red-200 text-red-600 hover:bg-red-50"
                                      >

                                        {deletingDocumentId ===
                                        document.id ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="mr-2 h-4 w-4" />
                                        )}

                                        Eliminar

                                      </Button>

                                    </div>

                                  </div>

                                )
                              )}

                            </div>

                          )}

                        </div>

                      </div>

                      {/* ==================================================
                          INFORMACIÓN EXTRA
                          ================================================== */}

                      <div className="flex flex-wrap items-center gap-3 pt-2">

                        {getStatusBadge(
                          project.estado
                        )}

                        {changeRequest && (
                          <Badge
                            variant="outline"
                            className="bg-white"
                          >
                            <ClipboardList className="mr-1.5 h-3.5 w-3.5" />

                            Solicitud de cambio
                          </Badge>
                        )}

                      </div>

                    </div>

                  </Card>

                );
              }
            )}

          </div>

        )}

      </section>

      {/* ========================================================
          MODAL — VER SOLICITUD DE CAMBIO
          ======================================================== */}

      {selectedProjectChangeRequest && (

        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() =>
            setSelectedProjectChangeRequest(
              null
            )
          }
        >

          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            {/* ==================================================
                CABECERA MODAL
                ================================================== */}

            <div className="flex items-start justify-between border-b px-6 py-5">

              <div>

                <div className="flex items-center gap-2">

                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">

                    <MessageSquare className="h-5 w-5 text-[#1E3A8A]" />

                  </div>

                  <div>

                    <h3 className="text-lg font-bold text-[#1E3A8A]">
                      Solicitud de cambio
                    </h3>

                    <p className="text-sm text-[#64748B]">
                      Detalle de la solicitud enviada por el cliente
                    </p>

                  </div>

                </div>

              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setSelectedProjectChangeRequest(
                    null
                  )
                }
              >
                <X className="h-5 w-5" />
              </Button>

            </div>

            <div className="space-y-6 px-6 py-6">

              {/* ==================================================
                  PROYECTO / CLIENTE
                  ================================================== */}

              {(() => {

                const request =
                  selectedProjectChangeRequest;

                const requestProject =
                  projects.find(
                    (project) =>
                      project.id ===
                      request.project_id
                  );

                const statusLabel =
                  getChangeRequestStatusLabel(
                    request.status
                  );

                const statusClass =
                  getChangeRequestStatusClass(
                    request.status
                  );

                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      <div className="rounded-xl border border-[#E8ECF2] bg-[#F8FAFC] p-4">

                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#64748B]">
                          <FileText className="h-4 w-4" />
                          Proyecto
                        </div>

                        <p className="mt-2 text-sm font-semibold text-[#1E293B]">
                          {
                            requestProject?.nombre ||
                            "Proyecto"
                          }
                        </p>

                      </div>

                      <div className="rounded-xl border border-[#E8ECF2] bg-[#F8FAFC] p-4">

                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#64748B]">
                          <User className="h-4 w-4" />
                          Cliente
                        </div>

                        <p className="mt-2 text-sm font-semibold text-[#1E293B]">
                          {
                            requestProject?.cliente_nombre ||
                            "Cliente"
                          }
                        </p>

                        {requestProject?.cliente_email && (
                          <p className="mt-1 text-xs text-[#64748B]">
                            {
                              requestProject.cliente_email
                            }
                          </p>
                        )}

                      </div>

                    </div>

                    {/* ==================================================
                        ESTADO / FECHA
                        ================================================== */}

                    <div className="flex flex-wrap items-center gap-3">

                      <Badge
                        className={`border ${statusClass}`}
                      >
                        {statusLabel}
                      </Badge>

                      <span className="text-xs text-[#64748B]">

                        Solicitud recibida el{" "}

                        {new Date(
                          request.created_at
                        ).toLocaleString(
                          "es-ES"
                        )}

                      </span>

                    </div>

                    {/* ==================================================
                        DESCRIPCIÓN
                        ================================================== */}

                    <div>

                      <div className="mb-2 flex items-center gap-2">

                        <ClipboardList className="h-4 w-4 text-[#1E3A8A]" />

                        <h4 className="text-sm font-bold text-[#1E293B]">
                          Solicitud del cliente
                        </h4>

                      </div>

                      <div className="rounded-xl border border-[#E8ECF2] bg-white p-4">

                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#334155]">
                          {
                            request.description
                          }
                        </p>

                      </div>

                    </div>

                    {/* ==================================================
                        NOTAS PREVIAS
                        ================================================== */}

                    {request.review_notes && (

                      <div>

                        <div className="mb-2 flex items-center gap-2">

                          <MessageSquare className="h-4 w-4 text-[#1E3A8A]" />

                          <h4 className="text-sm font-bold text-[#1E293B]">
                            Notas / respuesta del trabajador
                          </h4>

                        </div>

                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">

                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-blue-900">
                            {
                              request.review_notes
                            }
                          </p>

                        </div>

                      </div>

                    )}

                    {/* ==================================================
                        NOTAS PARA RESOLVER
                        ================================================== */}

                    {(
                      request.status ===
                        "pending" ||
                      request.status ===
                        "in_review" ||
                      request.status ===
                        "accepted"
                    ) && (

                      <div>

                        <label className="mb-2 block text-sm font-semibold text-[#1E293B]">
                          Notas del trabajador
                        </label>

                        <textarea
                          value={
                            projectChangeReviewNotes
                          }
                          onChange={(
                            event
                          ) =>
                            setProjectChangeReviewNotes(
                              event.target.value
                            )
                          }
                          rows={4}
                          maxLength={
                            5000
                          }
                          placeholder="Añade una nota, explicación o respuesta para el cliente..."
                          className="w-full rounded-xl border border-[#E8ECF2] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/10"
                        />

                        <p className="mt-1 text-right text-[11px] text-[#94A3B8]">
                          {
                            projectChangeReviewNotes.length
                          }{" "}
                          / 5000
                        </p>

                      </div>

                    )}

                    {/* ==================================================
                        ACCIONES
                        ================================================== */}

                    <div className="border-t border-[#E8ECF2] pt-5">

                      {request.status ===
                        "pending" && (

                        <div className="flex flex-wrap justify-end gap-2">

                          <Button
                            type="button"
                            variant="outline"
                            disabled={
                              processingProjectChangeRequest ===
                              request.id
                            }
                            onClick={() =>
                              handleResolveProjectChangeRequest(
                                request.id,
                                "in_review",
                                projectChangeReviewNotes
                              )
                            }
                            className="border-blue-200 text-blue-700 hover:bg-blue-50"
                          >

                            {processingProjectChangeRequest ===
                            request.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Clock className="mr-2 h-4 w-4" />
                            )}

                            Poner en revisión

                          </Button>

                          <Button
                            type="button"
                            disabled={
                              processingProjectChangeRequest ===
                              request.id
                            }
                            onClick={() =>
                              handleResolveProjectChangeRequest(
                                request.id,
                                "accepted",
                                projectChangeReviewNotes
                              )
                            }
                            className="bg-green-600 text-white hover:bg-green-700"
                          >

                            <CheckCircle2 className="mr-2 h-4 w-4" />

                            Aceptar

                          </Button>

                          <Button
                            type="button"
                            disabled={
                              processingProjectChangeRequest ===
                              request.id
                            }
                            onClick={() =>
                              handleResolveProjectChangeRequest(
                                request.id,
                                "rejected",
                                projectChangeReviewNotes
                              )
                            }
                            className="bg-red-600 text-white hover:bg-red-700"
                          >

                            <XCircle className="mr-2 h-4 w-4" />

                            Rechazar

                          </Button>

                        </div>

                      )}

                      {request.status ===
                        "in_review" && (

                        <div className="flex flex-wrap justify-end gap-2">

                          <Button
                            type="button"
                            disabled={
                              processingProjectChangeRequest ===
                              request.id
                            }
                            onClick={() =>
                              handleResolveProjectChangeRequest(
                                request.id,
                                "accepted",
                                projectChangeReviewNotes
                              )
                            }
                            className="bg-green-600 text-white hover:bg-green-700"
                          >

                            <CheckCircle2 className="mr-2 h-4 w-4" />

                            Aceptar solicitud

                          </Button>

                          <Button
                            type="button"
                            disabled={
                              processingProjectChangeRequest ===
                              request.id
                            }
                            onClick={() =>
                              handleResolveProjectChangeRequest(
                                request.id,
                                "rejected",
                                projectChangeReviewNotes
                              )
                            }
                            className="bg-red-600 text-white hover:bg-red-700"
                          >

                            <XCircle className="mr-2 h-4 w-4" />

                            Rechazar

                          </Button>

                        </div>

                      )}

                      {request.status ===
                        "accepted" && (

                        <div className="flex flex-wrap justify-end gap-2">

                          <Button
                            type="button"
                            disabled={
                              processingProjectChangeRequest ===
                              request.id
                            }
                            onClick={() =>
                              handleResolveProjectChangeRequest(
                                request.id,
                                "completed",
                                projectChangeReviewNotes
                              )
                            }
                            className="bg-[#1E3A8A] text-white hover:bg-[#162D6B]"
                          >

                            {processingProjectChangeRequest ===
                            request.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}

                            Marcar como completada

                          </Button>

                        </div>

                      )}

                      {(
                        request.status ===
                          "rejected" ||
                        request.status ===
                          "completed"
                      ) && (

                        <div className="flex justify-end">

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              setSelectedProjectChangeRequest(
                                null
                              )
                            }
                          >
                            Cerrar
                          </Button>

                        </div>

                      )}

                    </div>

                  </>
                );

              })()}

            </div>

          </div>

        </div>

      )}

    </>
  );
}

// ============================================================
// HELPERS
// ============================================================

function toDateTimeLocal(
  value: string
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const pad = (
    number: number
  ) =>
    String(number).padStart(
      2,
      "0"
    );

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(
    date.getDate()
  )}T${pad(
    date.getHours()
  )}:${pad(
    date.getMinutes()
  )}`;
}