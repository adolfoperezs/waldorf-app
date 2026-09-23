# PRP-002: El ritmo de cada niño — ciclos, ritmo semanal y onboarding de familias

> **Estado**: EN CURSO
> **Fecha**: 2026-09-23
> **Proyecto**: Sistema de Gestión Waldorf
> **Origen**: `docs/lineamientos/2026-09-especificacion-ux-kimun.md` (lineamiento de
> modificaciones entregado por la escuela). El usuario pidió empezar a implementarlo
> directamente: esta instrucción cuenta como la revisión humana del PRP.

---

## Objetivo

Que cada familia vea **el ritmo de su hijo**, no un ritmo plano de toda la escuela, y que
la maestra lo cargue en segundos. Tres flujos del lineamiento:

1. **Familia**: selector de hijos y una vista que cambia según el ciclo. Jardín (Grupo
   Semilla) ve cuento, actividad y cereal, sin asignaturas. Básica y Media ven la época
   activa con su avance, la clase principal y las materias del día.
2. **Maestra**: "Mi curso": la semana de su grupo en tarjetas. Edita un día con un toque
   y publica el ritmo para las familias.
3. **Administración**: "+ Sumar familia" en un panel lateral. En un solo paso crea la
   familia, sus niños y un enlace de invitación para mandar por WhatsApp. Quien lo abre
   entra con sus hijos ya vinculados.

Además de lo transversal: tokens de color y tipografía del lineamiento, paneles laterales
en vez de formularios fijos en la página, y ortografía correcta en la interfaz ("Años" y
no "Anios").

## Reconciliación con el modelo de dominio

El lineamiento trae un modelo de datos propio (`User`, `Student`, `Course`, `Rhythm`,
`Epoch`). Donde choca con `docs/DOMAIN.md` o con las reglas de `CLAUDE.md`, gana el
proyecto (CLAUDE.md: "si una decisión contradice el modelo de dominio, la que cede es la
implementación"). Su **intención** se cumple entera.

| Lineamiento | Decisión | Por qué |
|---|---|---|
| `Student.guardian_id` → un apoderado | `ninos.familia_id` → `familias` → `familia_miembros` | La familia es la unidad, no el apoderado (DOMAIN §1). Dos padres ven a los mismos hijos sin duplicar nada. |
| `Course` con `name = "3° Básico"` | `grupos`: la cohorte persiste | "El grupo persiste, el curso no" (DOMAIN §1). El nombre lo pone la escuela y puede cambiarlo cada año. |
| `cycle: 'semilla' \| 'basica' \| 'media'` como enum | Tabla `ciclos` por escuela, con `modalidad` estructural (`jardin` / `escolar`) | Regla 6: los nombres son dato. Lo único fijo en el código es la diferencia pedagógica real (primer septenio sin épocas ni materias), que decide qué campos mostrar. |
| Cereales por día escritos en el documento | Siguen en `minutas` (por época y día) y en la plantilla | Regla 6. El ritmo del día puede sobrescribir el cereal. |
| `Rhythm.daily_data` JSONB | `ritmos_semanales` + `ritmo_dias`, columnas explícitas | Postgres primero: validación con CHECK, RLS por fila, auditoría por día. |
| `Epoch.status` guardado | Derivado de las fechas | Un estado guardado se desincroniza del calendario. |
| `role: 'familia' \| 'profesor' \| 'admin'` | Se mantienen los seis roles de DOMAIN §2 | El gobierno colegiado no cabe en tres roles. |
| "Link mágico con token firmado" | La invitación por enlace de 0006 (huella SHA-256, un uso, 7 días) + `familia_id` | Ya existe y es más estricta que un token firmado: se puede revocar. |
| "Publicar con notificación inmediata" | Publicar + texto listo para pegar en WhatsApp | Integramos con WhatsApp, no construimos mensajería (ROADMAP). |
| Colores y tipografía | Se adoptan tal cual | Refinan la estética Waldorf de ARCHITECTURE.md, no la contradicen. |

## Modelo de datos — migración `0007_ciclos_ritmo_familias.sql`

- **`ciclos`** (operacional): `nombre`, `modalidad` (`jardin` | `escolar`), `acento`
  (token de color: `salvia` | `ocre` | `arcilla` | `tierra`), `orden`. Lectura: miembros.
  Escritura: gestores.
- **`grupos.ciclo_id`**: FK compuesta a `ciclos`. Se elimina `grupos.etapa` (texto libre
  sin uso y sin filas en producción): dos fuentes de verdad para lo mismo.
- **`ritmos_semanales`** (operacional): grupo + `semana` (siempre lunes, con CHECK),
  `tema` (cuento o arquetipo en jardín; tema de la clase principal en escolar),
  `recordatorio`, `publicado_en`, `publicado_por`. Única por grupo y semana.
- **`ritmo_dias`**: `dia_semana`, `actividad`, `materias text[]`, `alimento`, `nota`.
  Única por ritmo y día.
- **RLS del ritmo**: edita quien es gestor o maestro vigente del grupo. Lee el borrador
  quien puede editarlo; lo publicado lo lee cualquier miembro (nivel operacional). Los
  días heredan la visibilidad de su semana con un `exists` sobre la tabla padre, que
  también pasa por RLS.
- **`invitaciones.familia_id`**: opcional, solo con rol `familia`. `aceptar_invitacion`
  agrega a la persona a `familia_miembros`. `ver_invitacion` devuelve también el nombre
  de la familia.
- **`sumar_familia(...)`** (invoker): familia, niños e invitación en una transacción.
  Pasa por la RLS normal: solo administración.
- **Lecturas de niños auditadas** (decisión de la Fase 0, ver
  `.claude/memory/project/auditoria-de-lecturas.md`): `ninos_de_mi_familia` y
  `ninos_de_escuela`, security definer, filtran explícitamente y registran cada lectura
  con `app.registrar_lectura`. La app no lee `ninos` directo.

## Pantallas

| Ruta | Para quién | Qué |
|---|---|---|
| `/[slug]` | Todos | Familia con niños: selector de hijos + ritmo según ciclo. Resto: el calendario. |
| `/[slug]/calendario` | Todos | El calendario de la escuela (épocas, festividades, encuentros). Arregla los enlaces de WhatsApp que ya apuntaban aquí. |
| `/[slug]/ritmo` | Gestores y maestros con grupo | "Mi curso": la semana en tarjetas, edición por día en panel lateral, publicar. |
| `/[slug]/grupos` | Gestores | Ciclos, grupos y maestra guía. Carga de ciclos y grupos desde la plantilla. |
| `/[slug]/familias` | Administración | Familias y niños. "+ Sumar familia". Invitar a otro integrante. |

Formularios de crear (año, época, encuentro, invitación) pasan a paneles laterales.

## Fuera de alcance

- Notificaciones push o por correo (no hay SMTP ni app nativa).
- Horario por bloques con horas: "clase principal" es texto, no una grilla.
- Historia de grupo por año (`nino_grupo`, H10): sigue pendiente de decisión.
- Tests de navegador del flujo nuevo: el usuario prueba en el sitio (instrucción del
  2026-09-23). Quedan como deuda.

## Verificación

- Migración probada contra producción dentro de `begin … rollback`, incluidas las
  políticas con `set local role authenticated` y claims simulados.
- Tres consultas de tenancy-guard en cero; asesor de seguridad sin avisos nuevos salvo
  las funciones definer intencionales.
- `tsc` y `build` limpios antes del push. (`lint` no corre: el proyecto no tiene
  `eslint.config.*` todavía; ESLint 9 lo exige.)

## Aprendizajes

- **Ensayo en producción sin tocarla.** La migración y `supabase/verificacion/ritmo-por-nino.sql`
  viajan en una sola consulta a la API de administración dentro de `begin … rollback`.
  Catorce pruebas de RLS con usuarios sintéticos; un 201 es "todo pasó". Después se
  confirma que no quedó rastro y recién ahí `db push`.
- **`String.replace` con texto de reemplazo convierte `$$` en `$`.** Rompió todas las
  funciones plpgsql del ensayo. Con una función de reemplazo no pasa.
- **En Tailwind v4 lo que no está en `@layer` le gana a las utilidades.** Al dar color a
  los títulos desde `globals.css`, un `<h3 class="text-texto-suave">` habría salido del
  color de los títulos. Las reglas base van en `@layer base`.
- **React 19 vacía el formulario** al terminar una acción de `<form action>`, aunque vuelva
  con errores. En "Sumar familia" (varios hijos) eso borraba todo: `useEnvioConservando`.
- **`whatsapp://send` y no `wa.me`**: el mensaje lleva el enlace de invitación y nombres de
  niños, y con wa.me viajaría en la URL de una petición a un tercero.
