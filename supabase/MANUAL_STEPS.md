# Manual Steps for Task 2 — Supabase Configuration

The `schema.sql` file has been created and is ready to deploy. Complete the following manual steps in the Supabase dashboard.

## Step 2: Run Schema in Supabase

1. Go to https://supabase.com/dashboard/project/pubcbstrapwwfzuqiklf
2. Click **SQL Editor** (left sidebar)
3. Click **+ New query**
4. Copy the entire contents of `supabase/schema.sql` and paste into the editor
5. Click **Run** (or `Ctrl+Enter`)

**Expected result:** No errors. You should see:
- Tables `profiles`, `orders`, `announcements` appear in the Table Editor
- Index `orders_usuario_semana` created
- RLS policies attached to each table

---

## Step 3: Create Test Technician Auth User

1. In Supabase Dashboard, click **Authentication** (left sidebar)
2. Click **Users**
3. Click **Add user**
4. Fill in:
   - Email: `mege3gdlt0756@qiora.app`
   - Password: `Test1234!`
   - Check "Auto confirm user"
5. Click **Create user**
6. Copy the generated **UUID** (you'll need it for Step 4)

---

## Step 4: Insert Test Profile

1. Go back to **SQL Editor**
2. Click **+ New query**
3. Paste the following SQL, replacing `<UUID>` with the UUID from Step 3:

```sql
INSERT INTO profiles (id, usuario_ffm, nombre, numero_empleado, sucursal, tipo_cuadrilla, meta_estrellas, tipo_distrito, coordinador)
VALUES (
  '<UUID>',
  'MEGE3GDLT0756',
  'Rangel Estrada Jesus Enrique',
  '02189946185',
  'GDL ESTADIO',
  'NORMAL',
  90,
  'A',
  'Ing. Carlos Ruiz'
);
```

4. Click **Run**

**Expected result:** 1 row inserted into `profiles`.

---

## Step 5: Insert Sample Orders

1. In **SQL Editor**, click **+ New query**
2. Paste the following SQL:

```sql
-- Semana actual (ajusta las fechas al lunes de la semana en curso)
INSERT INTO orders (usuario_ffm, fecha_termino, tipo_servicio, estrellas, semana_inicio, sucursal, tipo_cuadrilla, meta_estrellas, tipo_distrito)
VALUES
  ('MEGE3GDLT0756', current_date,     'Instalación',         6, date_trunc('week', current_date)::date, 'GDL ESTADIO', 'NORMAL', 90, 'A'),
  ('MEGE3GDLT0756', current_date,     'Soporte',             3, date_trunc('week', current_date)::date, 'GDL ESTADIO', 'NORMAL', 90, 'A'),
  ('MEGE3GDLT0756', current_date - 1, 'Mantenimiento Mayor', 4, date_trunc('week', current_date)::date, 'GDL ESTADIO', 'NORMAL', 90, 'A'),
  ('MEGE3GDLT0756', current_date - 1, 'Instalación',         6, date_trunc('week', current_date)::date, 'GDL ESTADIO', 'NORMAL', 90, 'A'),
  ('MEGE3GDLT0756', current_date - 2, 'Soporte',             3, date_trunc('week', current_date)::date, 'GDL ESTADIO', 'NORMAL', 90, 'A'),
-- Semana pasada
  ('MEGE3GDLT0756', current_date - 7,  'Instalación',         6, (date_trunc('week', current_date) - interval '7 days')::date, 'GDL ESTADIO', 'NORMAL', 90, 'A'),
  ('MEGE3GDLT0756', current_date - 7,  'Instalación',         6, (date_trunc('week', current_date) - interval '7 days')::date, 'GDL ESTADIO', 'NORMAL', 90, 'A'),
  ('MEGE3GDLT0756', current_date - 8,  'Soporte',             3, (date_trunc('week', current_date) - interval '7 days')::date, 'GDL ESTADIO', 'NORMAL', 90, 'A'),
  ('MEGE3GDLT0756', current_date - 9,  'Mantenimiento Mayor', 4, (date_trunc('week', current_date) - interval '7 days')::date, 'GDL ESTADIO', 'NORMAL', 90, 'A'),
  ('MEGE3GDLT0756', current_date - 10, 'Cambio De Domicilio', 6, (date_trunc('week', current_date) - interval '7 days')::date, 'GDL ESTADIO', 'NORMAL', 90, 'A'),
  ('MEGE3GDLT0756', current_date - 11, 'Soporte',             3, (date_trunc('week', current_date) - interval '7 days')::date, 'GDL ESTADIO', 'NORMAL', 90, 'A'),
  ('MEGE3GDLT0756', current_date - 12, 'Instalación',         6, (date_trunc('week', current_date) - interval '7 days')::date, 'GDL ESTADIO', 'NORMAL', 90, 'A'),
  ('MEGE3GDLT0756', current_date - 13, 'Recolección Pi',      1, (date_trunc('week', current_date) - interval '7 days')::date, 'GDL ESTADIO', 'NORMAL', 90, 'A');
```

3. Click **Run**

**Expected result:** 13 rows inserted into `orders`.

---

## Step 6: Insert Test Announcement

1. In **SQL Editor**, click **+ New query**
2. Paste the following SQL:

```sql
INSERT INTO announcements (mensaje) VALUES ('Recuerda registrar tu asistencia antes de las 8:00 AM.');
```

3. Click **Run**

**Expected result:** 1 row inserted into `announcements`.

---

## Verification

After all steps are complete:
- Check **Table Editor** → `profiles` → should show 1 row (Rangel Estrada Jesus Enrique)
- Check **Table Editor** → `orders` → should show 13 rows
- Check **Table Editor** → `announcements` → should show 1 row
- The app will be able to authenticate and display data with RLS protection enabled
