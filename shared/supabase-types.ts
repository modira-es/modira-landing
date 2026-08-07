export type Profile = {
  id: string;
  nombre: string;
  empresa: string | null;
  telefono: string | null;
  rol: 'user' | 'admin';
  fecha_registro: string;
  fecha_ultimo_login: string;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  nombre: string;
  descripcion: string | null;
  estado: 'activo' | 'pausado' | 'completado';
  fecha_inicio: string;
  fecha_fin: string | null;
  created_at: string;
  updated_at: string;
};

export type QuotationService = {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
};

export type Quotation = {
  id: string;
  numero_presupuesto: string;
  user_id: string;
  project_id: string | null;
  empresa: string | null;
  titulo: string;
  descripcion_detallada: string | null;
  servicios_incluidos: QuotationService[];
  precio_base: number;
  iva_porcentaje: number;
  precio_total: number;
  estado: 'borrador' | 'pendiente' | 'pagado' | 'rechazado' | 'caducado';
  fecha_emision: string;
  fecha_validez: string | null;
  notas: string | null;
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
};
