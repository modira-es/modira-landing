-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de Proyectos
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'pausado', 'completado')),
  fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  fecha_fin TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Presupuestos (Quotations)
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_presupuesto TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  empresa TEXT,
  titulo TEXT NOT NULL,
  descripcion_detallada TEXT,
  servicios_incluidos JSONB DEFAULT '[]'::jsonb,
  precio_base DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  iva_porcentaje DECIMAL(5, 2) NOT NULL DEFAULT 21.00,
  precio_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  estado TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador', 'pendiente', 'pagado', 'rechazado', 'caducado')),
  fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  fecha_validez TIMESTAMP WITH TIME ZONE,
  notas TEXT,
  stripe_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- Políticas para Projects
CREATE POLICY "Users can view their own projects" 
  ON projects FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all projects" 
  ON projects FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

-- Políticas para Quotations
CREATE POLICY "Users can view their own quotations" 
  ON quotations FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all quotations" 
  ON quotations FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

-- Función para actualizar el updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
