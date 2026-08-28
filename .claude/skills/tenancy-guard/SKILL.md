---
name: tenancy-guard
description: Patrón obligatorio de multi-tenancy, RLS y auditoría. Activar SIEMPRE antes de crear o modificar una migración, una tabla, una política de seguridad, una server action o un cliente de Supabase.
user-invocable: true
context: fork
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Tenancy guard

El aislamiento entre escuelas lo hace Postgres, no el código TypeScript. Un bug en la
aplicación no puede filtrar datos entre clientes porque el filtrado no ocurre ahí.

Este skill es de aplicación literal. No es una guía de estilo.

## Plantilla obligatoria para toda tabla nueva

```sql
create table public.NOMBRE (
  id          uuid primary key default gen_random_uuid(),
  escuela_id  uuid not null references public.escuelas(id) on delete cascade,
  -- ... columnas del dominio ...
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.NOMBRE is 'Clasificacion: operacional | personal | economico | menor | sensible.';

create trigger NOMBRE_updated_at before update on public.NOMBRE
  for each row execute function app.set_updated_at();

alter table public.NOMBRE enable row level security;
revoke all on public.NOMBRE from anon;

create policy NOMBRE_select on public.NOMBRE
  for select to authenticated
  using (app.es_miembro(escuela_id));

create policy NOMBRE_write on public.NOMBRE
  for all to authenticated
  using (app.es_gestor(escuela_id))
  with check (app.es_gestor(escuela_id));

create trigger NOMBRE_auditoria
  after insert or update or delete on public.NOMBRE
  for each row execute function app.auditar('completo');
```

Tabla, RLS, políticas, índices y auditoría van en **la misma migración**. Nunca separadas.

## Funciones de seguridad disponibles

| Función | Qué responde |
|---|---|
| `app.es_miembro(escuela_id)` | ¿Pertenece el usuario a esta escuela? |
| `app.es_gestor(escuela_id)` | ¿Es administración o colegio de maestros? |
| `app.tiene_rol(escuela_id, roles[])` | ¿Tiene alguno de estos roles? |
| `app.es_maestro_de_grupo(grupo_id)` | ¿Es maestro vigente de este grupo? |
| `app.familias_del_usuario(escuela_id)` | Familias a las que pertenece |
| `app.escuelas_del_usuario()` | Escuelas donde tiene membresía vigente |

Todas son `stable security definer` con `search_path = ''`. Si necesitas una nueva,
sigue exactamente ese patrón: sin `security definer` habría recursión infinita al
consultar `membresias` desde la RLS de `membresias`.

## Nivel de auditoría por clasificación

| Clasificación | Auditoría |
|---|---|
| operacional | `app.auditar('completo')` en escrituras |
| personal, económico, menor | `app.auditar('completo')` en escrituras |
| **sensible** | `app.auditar('metadatos')` — nunca el contenido |

Duplicar una observación sobre un niño dentro de la bitácora multiplica la exposición
en vez de reducirla. En nivel sensible se registra quién, cuándo y sobre qué registro.

## Errores que bloquean el merge

- Tabla de dominio sin `escuela_id`.
- Tabla sin `enable row level security`.
- Tabla con RLS pero sin política: queda inaccesible y alguien la "arreglará" con
  service role.
- Uso de `service_role` key en cualquier ruta, server action o handler que atienda a
  un usuario. Solo scripts de migración y tareas fuera de banda.
- Confiar en un `.eq('escuela_id', x)` del cliente como mecanismo de aislamiento.
  Puede estar por rendimiento, jamás por seguridad.
- Políticas escritas con `using (true)`.
- Un bucket de Storage sin política equivalente a la de su tabla.
- Datos personales en URLs, parámetros de consulta, logs o mensajes de error.

## Verificación antes de dar por terminada una migración

```sql
-- Tablas de dominio sin escuela_id
select c.relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and c.relname not in ('escuelas','perfiles','auditoria')
  and not exists (
    select 1 from pg_attribute a
    where a.attrelid = c.oid and a.attname = 'escuela_id' and a.attnum > 0
  );

-- Tablas sin RLS
select relname from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- Tablas con RLS pero sin politicas
select c.relname from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  and not exists (select 1 from pg_policies p where p.tablename = c.relname);
```

Las tres consultas deben devolver cero filas. Corre esto después de cada migración.

## Prueba obligatoria por feature

Cada feature necesita un test que cree dos escuelas con datos, autentique como miembro
de la primera, e intente leer datos de la segunda. Debe devolver cero filas, no un error
de permisos. Si el test no existe, la feature no está terminada.
