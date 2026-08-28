# PRP-001: Ritmo — el calendario Waldorf

> **Estado**: PENDIENTE
> **Fecha**: 2026-08-28
> **Proyecto**: Sistema de Gestión Waldorf
> **Fase del roadmap**: 1

---

## Objetivo

Que una escuela planifique su año completo en el sistema: años escolares, épocas,
festividades, eventos con inscripción, minuta, y un calendario que una familia pueda
leer desde el teléfono.

La época es el eje temporal del producto. De ella cuelgan contenidos, festividades,
minuta, jornadas y campañas. Esta fase construye la columna vertebral sobre la que se
apoyan la Fase 2 (economía) y la Fase 4 (desarrollo del niño).

## Por Qué

| Problema | Solución |
|---|---|
| El calendario del año vive en la cabeza de la maestra y en mensajes sueltos de WhatsApp | Un año planificado una vez, visible para toda la comunidad |
| Las familias preguntan lo mismo una y otra vez: cuándo es la jornada, qué se come el jueves | Calendario público, móvil primero |
| Reescribir a mano el aviso de cada evento para pegarlo en el grupo | Exportación a texto formateado con enlace profundo |
| Las épocas se solapan o se pierde el orden al planificar | La base lo impide; la interfaz lo explica |

**Valor de negocio**: es la fase que mete a las maestras dentro del sistema. Cuando
llegue la Fase 4 (informes de desarrollo, la funcionalidad que hace el producto
irremplazable) ya estarán dentro por el calendario. Ese orden es deliberado
(`docs/ROADMAP.md`).

## Qué

### Criterios de Éxito

- [ ] Kimün carga su año escolar completo: fechas, todas las épocas, todas las
      festividades, la minuta semanal.
- [ ] Activar un año escolar desactiva el anterior sin dejar jamás dos activos ni cero.
- [ ] Intentar crear una época que se solapa muestra un mensaje humano, no un error de
      Postgres.
- [ ] Una familia ve el calendario en un teléfono de gama media y entiende qué viene.
- [ ] Un evento con inscripción registra quién viene y quién asistió.
- [ ] Un evento con `publico = false` no lo ve una familia. Test que lo demuestre.
- [ ] Cualquier evento o festividad genera un texto listo para pegar en WhatsApp.
- [ ] Test de aislamiento extendido a `epocas`, `eventos` y `minutas`.

### Comportamiento Esperado

La administración crea el año escolar con sus fechas y lo activa. Al activarlo, el
sistema ofrece **materializar la plantilla** de la escuela: convierte los nombres de
épocas, las festividades (mes/día) y la minuta que ya viven en
`supabase/seed/plantillas/` en filas reales de ese año. La escuela ajusta desde ahí:
mueve fechas, renombra, agrega, borra.

El colegio de maestros afina las épocas por grupo. Una familia entra a `/[slug]` y ve
el calendario: la época en curso, lo que viene, las festividades del año y la minuta de
la semana.

---

## Contexto

### Referencias

- `docs/DOMAIN.md` §3 "Ritmo" — el lenguaje ubicuo. `epoca`, nunca `semestre`.
- `docs/ROADMAP.md` Fase 1 — el alcance exacto.
- `supabase/migrations/0002_ritmo.sql` — **las tablas ya existen y están corregidas.**
- `src/features/tenencia/` — patrón a seguir: `schemas/` (Zod) → `actions/` →
  `queries/` → `components/`. Ver `actions/crear-escuela.ts` para el patrón de server
  action con `useActionState` y traducción de errores.
- `src/features/tenencia/lib/plantillas.ts` — el lector de plantillas ya valida épocas,
  festividades y minuta. Esta fase las **consume**.
- `.claude/memory/project/correcciones-migraciones-iniciales.md` — qué se corrigió y
  por qué. **No revertir nada de ahí.**
- `.claude/skills/tenancy-guard/SKILL.md` — obligatorio antes de la migración 0004.

### Arquitectura Propuesta

```
src/features/ritmo/
├── schemas/      anio.ts, epoca.ts, festividad.ts, evento.ts, minuta.ts
├── actions/      crear-anio.ts, activar-anio.ts, materializar-plantilla.ts,
│                 crear-epoca.ts, crear-evento.ts, inscribirse.ts, ...
├── queries/      calendario.ts, anio.ts, epocas.ts
├── components/   calendario-anual.tsx, linea-de-epocas.tsx, tarjeta-evento.tsx,
│                 minuta-semanal.tsx
├── lib/          exportar-whatsapp.ts, fechas.ts
└── types/
```

Rutas nuevas bajo `src/app/(escuela)/[slug]/`: `calendario/`, `anios/`, `epocas/`,
`eventos/`.

### Modelo de Datos

**Las tablas de dominio no cambian**: `0002_ritmo.sql` ya crea `anios_escolares`,
`epocas`, `festividades`, `eventos`, `evento_inscripciones` y `minutas`, todas con
`escuela_id`, RLS, políticas, FK compuestas y auditoría.

Hace falta una **migración `0004_ritmo_rpc.sql`** solo con funciones:

```sql
-- Activar un anio: el indice unico parcial anios_un_activo_por_escuela impide
-- que haya dos activos. Desactivar el anterior y activar el nuevo son dos
-- escrituras que DEBEN ir en la misma transaccion; desde el cliente serian dos
-- llamadas y entre ambas la escuela quedaria sin anio activo.
create or replace function public.activar_anio(p_anio uuid) returns void ...

-- Convierte la plantilla de la escuela en filas reales del anio indicado.
-- Idempotente: si el anio ya tiene epocas, no duplica.
create or replace function public.materializar_plantilla(p_anio uuid, p_plantilla jsonb) returns void ...
```

Ambas `security definer` con `search_path = ''`, y **comprobando `app.es_gestor`
por dentro**: al ser definer se saltan la RLS, así que la autorización deja de ser
implícita y hay que escribirla. Ver
`.claude/memory/project/rpc-en-public-no-en-app.md`.

---

## Blueprint

### Fase 1: Año escolar
**Objetivo**: crear, activar y cerrar años. Migración `0004` con `activar_anio`.
**Validación**: las tres consultas de `tenancy-guard` en cero filas. Test que activa un
año dos veces seguidas y comprueba que nunca hay dos activos ni cero.

### Fase 2: Materializar la plantilla
**Objetivo**: al activar el primer año, volcar épocas, festividades y minuta de
`supabase/seed/plantillas/` a filas reales, con fechas resueltas para ese año.
**Validación**: escuela nueva → año activo → tiene sus 6 épocas encadenadas sin
solaparse, sus 6 festividades y su minuta de 5 días.

### Fase 3: Épocas
**Objetivo**: crear, reordenar y editar épocas, de escuela y de grupo. Traducir los
errores `23P01` (solape) a lenguaje humano.
**Validación**: intentar solapar muestra un mensaje que una maestra entiende, nunca el
texto del error de Postgres (`docs/PRIVACY.md`: sin datos personales en mensajes de
error).

### Fase 4: Festividades y calendario anual
**Objetivo**: la vista de año completo, sensible al hemisferio y a la zona horaria de
la escuela.
**Validación**: dos escuelas, una `sur` y otra `norte`, muestran San Juan en estaciones
distintas.

### Fase 5: Eventos, inscripción y asistencia
**Objetivo**: crear eventos tipados, inscribirse, registrar asistencia.
**Validación**: test de que una `familia` **no** ve un evento con `publico = false`, y
sí ve los públicos. Es la corrección H6 y necesita prueba propia.

### Fase 6: Minuta por época y día
**Objetivo**: editar la minuta de cada época y mostrar la semana en curso.
**Validación**: cambiar de época cambia la minuta que ve la familia.

### Fase 7: Calendario de la familia, móvil primero
**Objetivo**: la vista más usada del sistema. Época en curso, lo que viene, minuta.
**Validación**: Playwright en ventana de teléfono; sin scroll horizontal; legible.

### Fase 8: Exportación a WhatsApp
**Objetivo**: `lib/exportar-whatsapp.ts` genera texto formateado más enlace profundo.
**Validación**: test unitario del formato. Solo salida: **nunca** leer, almacenar ni
procesar mensajes de WhatsApp (`docs/ARCHITECTURE.md`).

### Fase 9: Validación final
- [ ] `npm run typecheck` y `npm run build` limpios
- [ ] `npx playwright test` en verde, con aislamiento extendido a las tablas nuevas
- [ ] Las tres consultas de `tenancy-guard` en cero filas
- [ ] Checklist de `docs/PRIVACY.md` §"antes de cada release"
- [ ] Kimün carga su año real completo

---

## Gotchas

- [ ] **Activar un año no es un `update`.** El índice único parcial
      `anios_un_activo_por_escuela` hace fallar el segundo `activo = true`. Va por RPC
      transaccional, no por dos llamadas del cliente.
- [ ] **`security definer` se salta la RLS.** Toda función nueva de `public` debe
      comprobar `app.es_gestor(...)` por dentro y hacer
      `revoke execute from public, anon` antes del `grant to authenticated`: Postgres
      otorga EXECUTE a PUBLIC por defecto.
- [ ] **Las fechas de la plantilla son mes/día, no fechas.** Hay que resolverlas contra
      el año escolar, que puede cruzar el cambio de año civil en el hemisferio norte.
      Pascua de Resurrección es móvil y no se puede fijar por mes/día: marcarla para
      ajuste manual.
- [ ] **Zona horaria de la escuela, no del navegador.** Todo en `timestamptz`; la
      presentación sale de `escuelas.zona_horaria`.
- [ ] **Épocas de grupo y de escuela son cosas distintas.** `grupo_id` nulo significa
      toda la escuela. Hay dos exclusion constraints, una para cada caso (H9).
- [ ] **No inventar tablas.** `0002_ritmo.sql` ya las tiene. Si algo parece faltar,
      revisar antes de crear.
- [ ] **Nada de `enum` de TypeScript con vocabulario pedagógico.** Nombres de épocas y
      festividades son dato configurable (CLAUDE.md, regla 6).
- [ ] `tramos_aporte` está en `0003` y pertenece a la **Fase 2**, aunque la plantilla ya
      los traiga. No adelantarlo aquí.

## Anti-Patrones

- NO usar `semestre`, `trimestre`, `curso` ni `asignatura`. Ver `waldorf-domain`.
- NO filtrar por `escuela_id` en TypeScript como mecanismo de seguridad. Por
  rendimiento sí; por seguridad, jamás.
- NO usar la `service_role` key en ninguna ruta que atienda usuarios.
- NO volcar errores de Postgres en la interfaz.
- NO dar una feature por terminada sin test de aislamiento sobre sus tablas.

---

## Aprendizajes

> Crece durante la implementación.

---

*PRP pendiente de aprobación. No se ha modificado código de esta fase.*
