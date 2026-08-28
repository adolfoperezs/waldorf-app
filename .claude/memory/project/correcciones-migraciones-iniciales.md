# Correcciones a las migraciones 0001-0003

**Aplicado:** 2026-08-28, antes del primer `supabase db push`.

Las migraciones venian escritas pero nunca aplicadas. Se corrigieron EN SU SITIO
aprovechando esa ventana: en cuanto corren, docs/ARCHITECTURE.md las vuelve inmutables.

**No revertir ninguna de estas sin entender por que existe.**

## Bloqueantes

- **B1 — `escuelas` no tiene politica de INSERT, y es a proposito.** Crear un tenant
  no es una escritura mas. Se hace con `public.crear_escuela`, security definer.
- **B2 — El primer administrador no podia existir.** `membresias_admin` exige ser ya
  administracion de la escuela para insertar la primera membresia de administracion.
  `public.crear_escuela` hace las dos escrituras en una sola transaccion. Es el UNICO
  punto del sistema donde se salta la RLS.
- **B3 — Las FK cruzaban la frontera entre escuelas.** Unas 20 llaves foraneas
  permitian que una fila declarara `escuela_id = A` y colgara de un padre de B.
  Patron aplicado: `unique (id, escuela_id)` en el padre, FK compuesta
  `(col_id, escuela_id)` en la hija. En las opcionales,
  `on delete set null (columna)` (Postgres 15+) para no anular `escuela_id`, que es
  not null. **Toda tabla nueva con un padre de dominio sigue este patron.**
- **B4 — La auditoria de `escuelas` era invisible.** `app.auditar` leia `escuela_id`
  de la fila y `escuelas` no tiene esa columna: quedaba nulo, y `auditoria_select`
  exige not null. Corregido con un coalesce contra `id`.

## Menores

H5 auditoria de lecturas (ver [auditoria-de-lecturas]), H6 `eventos.publico` ahora lo
aplica la RLS, H7 el rol `comision` puede gestionar sus campanas, H8 auditoria en
`perfiles`, `comisiones` y `comision_miembros`, H9 las epocas de escuela tampoco se
solapan entre si, H11 `aportes.periodo` normalizado al dia 1 por CHECK, H12
privilegios de tabla explicitos a `authenticated`, H13 el alta de ninos es de
`administracion` y no de todo `es_gestor`.

## Lo que quedo pendiente y por que

- **H10**: la invariante "un nino a lo sumo un grupo POR ANIO ESCOLAR" no tiene
  dimension temporal. `ninos.grupo_id` es una columna suelta, sin historia. La vista
  longitudinal de la Fase 4 va a necesitar una tabla
  `nino_grupo (nino_id, grupo_id, anio_id, desde, hasta)`. Decidirlo en la Fase 2:
  es barato ahora y caro con datos dentro.
- El rol `comision` solo tiene poder sobre campanas. `tareas` y `presupuesto` que
  menciona docs/DOMAIN.md todavia no se modelan.
