# QiORA App Técnico — Contexto del Proyecto

## Qué es esto

PWA (Progressive Web App) mobile-first para técnicos de QiORA Conecta. Cada técnico entra y ve sus propios datos: órdenes de la semana, estrellas acumuladas, bono estimado. No se sube a la Play Store — vive en internet y se puede agregar al inicio del celular como bookmark.

MVP = solo visualización. Sin edición de datos.

---

## Empresa: QiORA Conecta

Operador de campo tercerizado para Totalplay. ~900 técnicos en 17 distritos, 5 regiones.

**Regiones y distritos:**
- Bajío: Irapuato, León
- Occidente: Aguascalientes, Colima, Morelia, Tepic
- Guadalajara: GDL Barranca, GDL Estadio, GDL López Mateos, GDL Primavera
- Oriente: Córdoba-Orizaba, Puebla, Veracruz, Xalapa
- Sureste: Cancún, Mérida, Tuxtla

**Tipos de cuadrilla:**
- Planta Interna (Normal): todos los servicios
- Híbridas: mant/hallazgos + planta interna
- Motos: solo recolecciones, meta reducida
- Multidistrito: sin distrito fijo

---

## Sistema de Estrellas (unidad de productividad)

| Servicio | Estrellas |
|---|---|
| Instalación Empresarial | 8 |
| Instalación / Cambio de Domicilio | 6 |
| Soporte Empresarial | 5 |
| Mantenimiento Mayor | 4 |
| Soporte / Mantenimiento | 3 |
| Addons / Cambio de Equipo / Cambio de Plan | 2 |
| Factibilidad / Recolección | 1 |
| No Aplica | 0 |

---

## Sistema de Bonos

### Clasificación de distritos
- **Tipo A:** GDL Barranca, GDL Primavera, GDL Estadio, GDL López Mateos
- **Tipo B:** todos los demás

### Metas semanales
| Distrito | Meta Normal | Meta Moto |
|---|---|---|
| Tipo A (GBA, GES, GPR) | 90 pts | 60–70 pts |
| GDL López Mateos | 75 pts | 60–70 pts |
| Tipo B general | 84 pts | 60–70 pts |
| Irapuato, León, Córdoba-Orizaba | 75 pts | 60–70 pts |

### Bono base semanal
| Alcance de meta | Tipo A | Tipo B |
|---|---|---|
| < 80% | $0 | $0 |
| 80–89% | $500 | $450 |
| 90–99% | $900 | $800 |
| 100% o más | $2,500 | $1,800 |

### Bono extra
- Tipo A: $500 fijos si ≥110% de meta
- Tipo B: $100 por cada bloque de 6 estrellas sobre la meta, tope $500

### Tope absoluto: $3,000/técnico/semana

### Descuento por inasistencia (solo en 7 distritos)
Distritos: Veracruz, Irapuato, León, GDL Barranca, GDL Primavera, GDL Estadio, GDL López Mateos

| Días trabajados | Descuento |
|---|---|
| 6 días | Sin descuento |
| 5 días | 50% del bono |
| ≤4 días | 100% (pierde todo) |

**Fórmula:** Bono Final = Bono Base + Bono Extra − Descuento por Inasistencia

---

## Stack Técnico

- **Frontend:** PWA (web app instalable al home screen)
- **Backend/DB:** Supabase (Auth + Postgres)
- **Auth:** Supabase Auth con usuario FFM como identificador; contraseñas gestionadas por QiORA (Giacomo crea/resetea desde admin)
- **Deploy:** por definir

---

## Diseño (Stitch project: 16819149300151076298)

### Guía de Estilos QiORA Conecta

**Tipografía:** Questrial (única familia)
- Headlines: Regular / Bold
- Body: Regular con opacidad variable
- Cifras destacadas: Bold

**Colores:**
- Full Black: `#000000` — superficies primarias
- White: `#FFFFFF` — fondos de tarjetas
- Verde: `#3F873F` — metas cumplidas
- Azul: `#00B2E3` — instalaciones técnicas
- Naranja: `#FF5F00` — mantenimientos
- Amarillo: `#FFCD00` — servicios financieros
- Morado: `#655DC6` — soluciones especiales
- Celeste: `#87D1E6` — seguros

**Tokens:**
- Border radius: 8px en tarjetas y botones
- Márgenes mobile: 16px
- Separadores: `#DADADA` / `#F3F3F3`
- Arquitectura visual plana (flat)

### Pantallas diseñadas

#### 1. Tablero del Técnico (Home) — pantalla principal
- **Header:** Nombre (ej. "Juan Pérez"), avatar con iniciales, tipo de cuadrilla ("Planta Interna Normal")
- **Info del usuario:** ID técnico, Sucursal, Coordinador
- **Aviso importante:** card de notificación destacada
- **Meta Semanal:** indicador de progreso visual — "68 de 90 Estrellas"
- **Bono Estimado:** monto en MXN + botón "Ver detalle"
- **Servicios Recientes:** lista de órdenes del día con hora, tipo, estrellas

#### 2. Metas y Estrellas (pantalla informativa)
- Tabla de metas semanales por distrito
- Tabla de valor en estrellas por tipo de servicio
- Explicación del sistema de bonos (3 niveles de cumplimiento)

#### 3. Navegación inferior (bottom nav)
- Home (tablero)
- History (historial)
- Profile (perfil)

---

## Usuarios

- **Usuario final:** técnicos de QiORA (~900 personas)
- **Admin:** Giacomo (único admin — crea usuarios, resetea passwords)
- **Autenticación:** usuario FFM + contraseña (gestionados en Supabase)

---

## MVP — Alcance

Solo visualización. Un técnico puede:
1. Iniciar sesión con su usuario FFM y contraseña
2. Ver su tablero de la semana actual (estrellas, bono estimado, órdenes recientes)
3. Ver historial de semanas anteriores
4. Ver su perfil básico

No hay edición de datos, no hay notificaciones push, no hay gestión de usuarios (eso es admin-only y no entra en el MVP).

---

## Estructura del Excel (BASE BONO DIARIO)

Archivo: `BASE BONO DIARIO (1).xls` — 2,437 filas (órdenes), 15 columnas.
Cada fila = una orden completada por un técnico.

| Columna | Descripción | Ejemplo |
|---|---|---|
| FECHA TERMINO | Fecha de la orden (serial Excel) | 2026-05-11 |
| SUCURSAL | Nombre del distrito | CTA-TPI-INT-GBA GDL BARRANCA |
| TIPO CUADRILLA | Tipo de cuadrilla | NORMAL |
| TIPO SERVICIO | Tipo de servicio (col 3 y 4 iguales) | Instalación |
| ESTRELLA | Estrellas de esa orden | 6 |
| NOMBRE | Nombre completo del técnico | RANGEL ESTRADA JESUS ENRIQUE |
| NÚMERO EMPLEADO | ID de empleado | 02189946185 |
| USUARIO FFM | Username de login (identificador) | MEGE3GDLT0756 |
| FECHA INGRESO | Alta del técnico (serial Excel) | — |
| FECHA NACIMIENTO | Fecha nacimiento (serial Excel) | — |
| META ESTRELLAS | Meta semanal en estrellas | 90 |
| TIPO DISTRITO | Tipo A o B | A |
| ALCANCE | % que esa orden aporta a la meta | 6.67% (= 6/90) |
| CONTRATISTA | Contratista (vacío en mayoría) | — |

**Notas:**
- Un técnico tiene N filas por semana (una por orden completada)
- Productividad semanal = SUM(ESTRELLA) por usuario por semana
- % de alcance acumulado = SUM(ESTRELLA) / META_ESTRELLAS × 100
- Bono se calcula sobre el % de alcance acumulado + TIPO DISTRITO
- ~550 usuarios FFM únicos en este archivo (1 día)

## Pestaña History

Lista de semanas pasadas. Por semana muestra:
- Rango de fechas (lun–dom)
- Total de estrellas acumuladas
- % de alcance sobre su meta
- Bono que cobró (o bono estimado si la semana no cerró)

Al tocar una semana → detalle con la lista de órdenes de esa semana (fecha, tipo de servicio, estrellas).

## Proyectos existentes (referencia de stack)

- **SistemaBonos** (`~/SistemaBonos`): HTML/CSS/JS vanilla + Supabase. Dashboard interno de bonos.
- **JAX** (`~/Giacomo AI/`): Next.js 14 + Supabase. Proyecto personal.

## Pendiente

- [ ] Definir qué muestra la pestaña "Profile"
- [ ] Decidir stack de frontend
- [ ] Definir dónde se despliega
- [ ] Esquema de tablas en Supabase
