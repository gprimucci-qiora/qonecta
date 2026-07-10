# QiORA App Técnico — Spec de Diseño

**Fecha:** 2026-07-01  
**Estado:** Aprobado para implementación  
**Stack:** Vite + React SPA / PWA + Supabase + Vercel

---

## Resumen

PWA mobile-first para técnicos de QiORA Conecta. Cada técnico inicia sesión con su usuario FFM y ve sus propios datos: órdenes completadas, estrellas acumuladas y nivel de alcance sobre su meta semanal. La app se instala en el home screen del celular desde el navegador (sin Play Store).

MVP = solo visualización. Sin edición de datos, sin push notifications, sin gestión de usuarios.

---

## Usuarios

- **Técnicos (~900):** usuario final. Cada uno ve solo sus propios datos.
- **Admin (Giacomo):** crea cuentas, resetea contraseñas, sube datos desde el Excel. Panel de admin = Supabase Studio (no se construye UI de admin en el MVP).

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Vite + React (SPA) |
| PWA | vite-plugin-pwa (manifest + service worker) |
| Auth | Supabase Auth (usuario FFM como email, contraseña) |
| Base de datos | Supabase Postgres |
| Lógica de datos | Client-side (queries a Supabase, sin cálculos de bono) |
| Deploy | Vercel |
| Estilos | CSS / Tailwind — fuente Questrial |

---

## Esquema de Base de Datos

### `profiles`
Un registro por técnico, vinculado a `auth.users`.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | FK → auth.users.id |
| usuario_ffm | text | identificador de login |
| nombre | text | nombre completo |
| numero_empleado | text | |
| sucursal | text | ej. "GDL BARRANCA" |
| tipo_cuadrilla | text | NORMAL / MOTO / HIBRIDA / MULTIDISTRITO |
| meta_estrellas | int | meta semanal vigente |
| tipo_distrito | text | "A" o "B" |
| coordinador | text | nombre del coordinador |

### `orders`
Una fila por orden completada. Se sube desde el Excel semanalmente (Supabase import o script).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| usuario_ffm | text | FK → profiles.usuario_ffm |
| fecha_termino | date | fecha de la orden |
| tipo_servicio | text | Instalación, Soporte, Mantenimiento Mayor, etc. |
| estrellas | int | valor de esa orden |
| semana_inicio | date | lunes de la semana (calculado al insertar) |
| sucursal | text | |
| tipo_cuadrilla | text | |
| meta_estrellas | int | meta vigente en esa semana |
| tipo_distrito | text | "A" o "B" |

### `announcements` (opcional, MVP)
Para el card de "Aviso Importante" en Home.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | |
| mensaje | text | texto del aviso |
| activo | boolean | solo se muestra si activo = true |
| created_at | timestamptz | |

### Seguridad (Row Level Security)
- `profiles`: cada técnico solo puede leer su propio registro
- `orders`: cada técnico solo puede leer órdenes donde `usuario_ffm` = su usuario
- `announcements`: lectura pública (todos los técnicos autenticados pueden ver)

---

## Pantallas

### 1. Login
- Fondo negro (`#000000`), logo QiORA centrado
- Campo: Usuario FFM
- Campo: Contraseña
- Botón "Entrar"
- Sin opción de registro (Giacomo crea las cuentas)

### 2. Home (Tablero — tab activo por defecto)

**Header**
- Avatar con iniciales del técnico
- Nombre completo
- Etiqueta de tipo de cuadrilla (ej. "Planta Interna Normal")

**Card: Info del técnico**
- Sucursal
- Coordinador

**Card: Aviso importante** *(solo visible si hay un anuncio activo)*
- Texto del anuncio

**Card: Meta semanal**
- Semana actual (ej. "30 Jun – 6 Jul")
- Barra de progreso visual: estrellas acumuladas / meta
- Número: "68 de 90 estrellas"
- Porcentaje de alcance: "75.6%"
- Badge de nivel: `< 80%` / `80–89%` / `90–99%` / `≥ 100%`

**Card: Órdenes recientes**
- Lista de las últimas 5 órdenes de la semana actual, con su fecha y tipo de servicio y estrellas
- Si todas son de hoy, muestra "Hoy"; si son de días distintos, muestra la fecha de cada una
- Enlace "Ver semana completa" → History

**Botón informativo**
- "¿Cómo funciona mi bono?" → abre pantalla de Info

### 3. History (Historial)

**Vista de lista de semanas**
- Lista vertical, más reciente primero
- Por semana: rango de fechas, total de estrellas, % de alcance, badge de nivel

**Vista de detalle de semana** (al tocar una semana)
- Header con rango de fechas y resumen (estrellas, % alcance, nivel)
- Lista de todas las órdenes de esa semana: fecha, tipo de servicio, estrellas
- Botón regresar

### 4. Profile (Perfil)

- Avatar con iniciales (grande)
- Nombre completo
- Usuario FFM
- Número de empleado
- Sucursal
- Tipo de cuadrilla
- Coordinador
- Botón "Cerrar sesión"

### 5. Info de Metas y Bono (pantalla informativa)

Accesible desde el botón en Home.

**Sección 1: Valor de servicios**
Tabla de tipos de servicio y sus estrellas (sin modificar en runtime — datos estáticos en el componente).

**Sección 2: Tu meta semanal**
Muestra la meta del técnico actual y su distrito.

**Sección 3: Esquema de pago**
Tabla explicativa de los niveles (< 80%, 80–89%, 90–99%, ≥ 100%) y lo que significa cada uno, sin mostrar montos. El técnico puede entender en qué nivel se encuentra.

**Sección 4: Descuento por inasistencia**
Explica la regla de días trabajados para los 7 distritos donde aplica.

---

## Navegación

Bottom navigation bar fija con 3 tabs:
- 🏠 **Home** — tablero de la semana actual
- 📋 **Historia** — historial de semanas
- 👤 **Perfil** — datos del técnico

La pantalla de Info y el detalle de semana son sub-pantallas que se navegan dentro de sus respectivas secciones (no reemplazan la bottom nav).

---

## Design System (Guía de Estilos QiORA Conecta)

**Fuente:** Questrial (Google Fonts)

**Colores:**
- Background primario: `#000000`
- Cards / superficies: `#FFFFFF`
- Verde (meta cumplida): `#3F873F`
- Azul (instalaciones): `#00B2E3`
- Naranja (mantenimiento): `#FF5F00`
- Amarillo: `#FFCD00`
- Morado: `#655DC6`
- Celeste: `#87D1E6`
- Separadores: `#DADADA` / `#F3F3F3`

**Tokens:**
- Border radius: 8px
- Margen mobile: 16px
- Arquitectura visual: flat

---

## PWA (Instalabilidad)

- `manifest.json`: nombre "QiORA Técnico", ícono QiORA, display standalone, theme_color `#000000`
- Service worker: cache de assets estáticos para funcionamiento básico offline (no cachea datos de Supabase)
- El técnico puede agregar la app al home screen desde Chrome (Android) o Safari (iOS) con "Agregar a inicio"

---

## Carga de datos

El Excel semanal se sube a Supabase de dos formas posibles:
1. **Supabase Studio:** import CSV directo a la tabla `orders` (requiere convertir .xls a .csv primero)
2. **Script Python:** lectura del .xls con `xlrd` + inserción vía Supabase Python client

La elección del método de carga queda fuera del MVP de la app pero se debe definir antes del lanzamiento.

---

## Fuera de scope (MVP)

- Panel de administración UI
- Push notifications
- Edición de datos por el técnico
- Vista de supervisor / distrital
- Modo offline completo (datos en caché)
- Historial de más de 12 semanas (límite razonable para MVP)
