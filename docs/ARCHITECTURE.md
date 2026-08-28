# Arquitectura

## Stack

Heredado del SaaS Factory, sin desviaciones:

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 + React 19 + TypeScript |
| Estilos | Tailwind + shadcn/ui |
| Backend | Supabase — Postgres, Auth, RLS, Storage |
| Validación | Zod |
| Estado | Zustand |
| Testing | Playwright |
| Deploy | Vercel |

---

## Las tres capas

La decisión de arquitectura más importante del producto. Si se mezclan, cada cliente
nuevo se convierte en una rama de código y el negocio deja de escalar.

### Núcleo universal

Sirve a cualquier escuela Waldorf del mundo sin modificación. Ritmo, familias, aportes,
comisiones, observaciones, informes. Vive en `src/features/`.

Regla: si una escuela alemana no lo puede usar tal cual, no es núcleo.

### Plantilla configurable

Todo lo que cada escuela hace distinto, expresado como **dato**, no como código: cuántas
épocas y cómo se llaman, qué festividades celebra, qué tramos de aporte usa, qué
comisiones existen, qué etiquetas de observación maneja, qué secciones tiene su informe.

Una escuela nueva clona una plantilla base en el onboarding y la ajusta. Las plantillas
viven en `supabase/seed/plantillas/`.

Regla: cada vez que aparezca un `enum` de TypeScript con vocabulario pedagógico, es una
tabla mal diseñada.

### Plugin país

RBD, SEP, subvención, SII, boletas, formato de RUT. Vive en `src/features/cl/` y se
activa por el campo `pais` de la escuela.

Regla: ningún import desde `src/features/cl/` hacia el núcleo. La dependencia va en un
solo sentido.

---

## Multi-tenancy

**El aislamiento lo hace Postgres, no la aplicación.**

Cada tabla de dominio lleva `escuela_id`. Cada tabla tiene RLS activado. Las políticas
consultan funciones auxiliares en el esquema `app` que resuelven la membresía del usuario
autenticado. Un bug en el código TypeScript no puede filtrar datos entre escuelas, porque
el filtrado no ocurre ahí.

Base única con RLS, no un esquema por cliente. Con menos de cien escuelas, un esquema por
cliente solo agrega dolor operacional en migraciones.

La `service_role` key jamás se usa en código que atiende peticiones de usuarios. Solo en
scripts de migración y tareas administrativas fuera de banda.

El patrón exacto está en `.claude/skills/tenancy-guard/SKILL.md` y debe seguirse
literalmente en cada migración.

---

## Estructura de carpetas

```
src/
├── app/                        # Next.js App Router
│   ├── (public)/               # Landing, login
│   ├── (escuela)/[slug]/       # Todo lo autenticado, con la escuela en la ruta
│   └── api/
├── features/
│   ├── tenencia/               # Escuelas, membresías, roles, onboarding
│   ├── ritmo/                  # Años, épocas, festividades, eventos, minutas
│   ├── comunidad/              # Familias, niños, grupos, comisiones
│   ├── economia/               # Acuerdos, aportes en dinero y horas, campañas
│   ├── desarrollo/             # Observaciones, informes, encuentros (fase 2)
│   ├── privacidad/             # Consentimientos, auditoría, exportación, retención
│   └── cl/                     # Plugin Chile
└── shared/
    ├── design/                 # Tokens Waldorf
    ├── ui/                     # shadcn + componentes propios
    ├── supabase/               # Clientes server y browser, tipos generados
    └── i18n/
```

Cada feature contiene sus propias `actions/`, `queries/`, `schemas/` (Zod),
`components/` y `types/`. Nada de carpetas globales por tipo de archivo.

La escuela va en la URL (`/[slug]/...`) para que el contexto de tenant sea explícito y
el cambio entre escuelas sea trivial para quien pertenece a varias.

---

## Convenciones

**Nombres.** Español sin tildes ni ñ en identificadores: `nino`, `anio_escolar`, `epoca`,
`comision`. Tablas en plural, columnas en singular.

**Migraciones.** Numeradas y secuenciales en `supabase/migrations/`. Una migración crea
la tabla, su RLS, sus políticas, sus índices y su trigger de auditoría. Nunca se separan.
Nunca se edita una migración ya aplicada.

**Tipos.** Generados desde el esquema, jamás escritos a mano.

**Validación.** Zod en el borde de toda server action. El esquema Zod es la única fuente
de validación de entrada; no se duplica en el cliente.

**Fechas.** Todo en `timestamptz`. La zona horaria de presentación sale de la escuela,
no del navegador. El calendario Waldorf es sensible al hemisferio: una escuela chilena
celebra San Juan en invierno y una alemana en verano.

---

## Estética

Ninguno de los cinco design systems del SaaS Factory sirve. Neobrutalism, neumorphism y
liquid glass son lenguaje visual de startup; la comunidad Waldorf lee eso como ajeno.

La base es la paleta del Welcome Kit de Kimün: cremas, marrones cálidos, tonos tierra.
Tipografía serif para títulos, generosa en espacio, sin sombras duras ni gradientes.
Los tokens van en `src/shared/design/waldorf.ts` y se exponen como variables CSS.

Prioridad de accesibilidad alta: el usuario típico es una maestra o un apoderado en un
teléfono de gama media con conexión irregular en la costa. Móvil primero, sin dependencias
pesadas, funcional con poca señal.

---

## Integración con WhatsApp

Las escuelas viven en WhatsApp y no lo van a dejar. No construimos mensajería.

Fase 1: exportar. Un evento, una campaña o un recordatorio de aporte generan un texto
formateado listo para pegar en el grupo, más un enlace profundo al sistema.

Fase 2 (solo si se justifica): notificaciones salientes vía API oficial.

Nunca: leer, almacenar ni procesar mensajes de WhatsApp de la comunidad.
