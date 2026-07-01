-- profiles: one row per technician, linked to auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  usuario_ffm text UNIQUE NOT NULL,
  nombre      text NOT NULL,
  numero_empleado text,
  sucursal    text,
  tipo_cuadrilla text,
  meta_estrellas int,
  tipo_distrito  text CHECK (tipo_distrito IN ('A', 'B')),
  coordinador    text,
  created_at     timestamptz DEFAULT now()
);

-- orders: one row per completed order (uploaded from Excel weekly)
CREATE TABLE IF NOT EXISTS orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_ffm    text NOT NULL REFERENCES profiles(usuario_ffm) ON DELETE CASCADE,
  fecha_termino  date NOT NULL,
  tipo_servicio  text NOT NULL,
  estrellas      int  NOT NULL,
  semana_inicio  date NOT NULL,  -- Monday of the week (calculated on upload)
  sucursal       text,
  tipo_cuadrilla text,
  meta_estrellas int,
  tipo_distrito  text,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_usuario_semana ON orders (usuario_ffm, semana_inicio);

-- announcements: admin-managed notices shown on Home
CREATE TABLE IF NOT EXISTS announcements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mensaje    text NOT NULL,
  activo     boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Each technician reads only their own profile
CREATE POLICY "profiles_own_select" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Each technician reads only their own orders
CREATE POLICY "orders_own_select" ON orders
  FOR SELECT USING (
    usuario_ffm = (SELECT usuario_ffm FROM profiles WHERE id = auth.uid())
  );

-- All authenticated users can read active announcements
CREATE POLICY "announcements_authenticated_select" ON announcements
  FOR SELECT TO authenticated USING (activo = true);
