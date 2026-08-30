# Sistema de Gestión Waldorf — Instrucciones del Proyecto

> Este archivo se suma al `CLAUDE.md` del SaaS Factory. Donde haya conflicto, manda este.

## Qué estamos construyendo

Un sistema de gestión multi-cliente (SaaS) para escuelas Waldorf. Nace en la Escuela
Waldorf Kimün (Algarrobo, Chile) como socio de diseño, con el objetivo explícito de
venderse a otras escuelas Waldorf en Chile y en el extranjero.

**No es un software escolar convencional adaptado.** El modelo de datos es distinto por
diseño. Antes de escribir cualquier código, lee `docs/DOMAIN.md`. Si una decisión de
implementación contradice el modelo de dominio, la que cede es la implementación.

## Documentos de referencia obligatorios

| Documento | Cuándo leerlo |
|---|---|
| `docs/DOMAIN.md` | Antes de tocar cualquier tabla, tipo o feature. Es el lenguaje ubicuo. |
| `docs/ARCHITECTURE.md` | Antes de crear archivos, carpetas, migraciones o rutas. |
| `docs/PRIVACY.md` | Antes de modelar cualquier dato de una persona. |
| `docs/ROADMAP.md` | Para saber qué está dentro y fuera del alcance actual. |

## Reglas no negociables

### 1. Toda tabla de dominio lleva `escuela_id`

Sin excepción. Es la clave de aislamiento entre clientes. Una tabla sin `escuela_id` es
un bug de seguridad, no una simplificación.

Excepciones únicas y ya creadas: `escuelas`, `perfiles`, `auditoria`.

### 2. Toda tabla nace con RLS activado y política explícita

`alter table ... enable row level security;` en la misma migración que crea la tabla.
Sin política permisiva, Postgres deniega todo — ese es el estado por defecto correcto.
Nunca crees una tabla en una migración y sus políticas en otra.

Ver `.claude/skills/tenancy-guard/SKILL.md` para el patrón exacto.

### 3. Nunca confíes en el filtrado por aplicación

El aislamiento entre escuelas lo hace Postgres vía RLS, no el código TypeScript.
No uses la service role key en código que atiende peticiones de usuarios. Si un
`where escuela_id = ...` en el cliente es lo único que separa a dos colegios, está mal.

### 4. Escribe la migración antes que el código

El esquema es la fuente de verdad. Migración → tipos generados → server actions → UI.
Nunca al revés. Los tipos de TypeScript se generan desde Supabase, no se escriben a mano.

### 5. Nada específico de Chile en el núcleo

RBD, SEP, subvención, SII, boletas y RUT viven en `src/features/cl/`. El núcleo debe
poder correr para una escuela en Perú, Alemania o España sin tocar una línea.
Ver la sección "Tres capas" en `docs/ARCHITECTURE.md`.

### 6. Nada de configuración pedagógica hardcodeada

Cuántas épocas hay, cómo se llaman, qué festividades se celebran, qué tramos de aporte
existen, qué comisiones hay: todo es dato configurable por escuela, nunca constante en
el código. Cada vez que sientas la tentación de escribir un `enum` con nombres de épocas,
es una tabla.

### 7. Datos de menores: mínimo indispensable

Lee `docs/PRIVACY.md` antes de agregar cualquier campo sobre un niño. Si no hay una razón
pedagógica o legal concreta para guardar un dato, no se guarda. Toda escritura sobre
tablas sensibles pasa por auditoría.

## Flujo de trabajo esperado

1. **PRP primero.** Para cualquier feature no trivial, usa el skill `prp` y escribe el
   blueprint en `.claude/PRPs/`. Espera revisión humana antes de implementar.
2. **Migración.** `supabase/migrations/NNNN_nombre.sql`, con RLS y auditoría incluidas.
3. **Tipos.** Regenera los tipos desde el esquema.
4. **Server actions + Zod.** Validación en el borde, siempre.
5. **UI.** Recién ahora.
6. **Registro de decisión.** Si tomaste una decisión de arquitectura, guárdala en
   `.claude/memory/project/` con el skill `memory-manager`.

## Lo que este proyecto NO hace (por ahora)

No construimos libro de clases oficial, contabilidad completa, app móvil nativa ni
mensajería en tiempo real. Las escuelas viven en WhatsApp: integramos, no competimos.
Ver `docs/ROADMAP.md`.

## Design system

Ninguno de los cinco que trae el SaaS Factory. La estética es Waldorf: cálida, terrosa,
orgánica, con mucho aire. Tokens en `src/shared/design/waldorf.ts`.
Ver la sección "Estética" en `docs/ARCHITECTURE.md`.

## Idioma

Código, nombres de tablas, columnas y tipos en **español**, sin tildes ni ñ en los
identificadores (`nino`, `anio_escolar`, `epoca`). El dominio Waldorf tiene vocabulario
propio y traducirlo al inglés pierde precisión. Comentarios y documentación en español.
La UI se internacionaliza desde el inicio: nada de strings literales en los componentes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
