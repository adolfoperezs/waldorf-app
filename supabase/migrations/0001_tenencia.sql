-- =====================================================================
-- 0001 — Capa de tenencia
-- Escuelas (tenants), perfiles, membresias, funciones de seguridad,
-- auditoria y utilidades comunes.
--
-- Esta migracion debe ser la primera. Todo lo demas depende de ella.
-- =====================================================================

create extension if not exists "pgcrypto";

-- Esquema privado para funciones de seguridad. No se expone via API.
create schema if not exists app;
revoke all on schema app from public, anon, authenticated;
grant usage on schema app to authenticated, service_role;


-- ---------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------

create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- escuelas — el tenant
-- Clasificacion: operacional
-- ---------------------------------------------------------------------

create table public.escuelas (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique
                  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre        text not null,
  pais          char(2) not null default 'CL',
  zona_horaria  text not null default 'America/Santiago',
  idioma        text not null default 'es',
  moneda        char(3) not null default 'CLP',
  hemisferio    text not null default 'sur' check (hemisferio in ('norte','sur')),
  activa        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.escuelas is 'Tenant. Clasificacion: operacional.';

create trigger escuelas_updated_at
  before update on public.escuelas
  for each row execute function app.set_updated_at();


-- ---------------------------------------------------------------------
-- perfiles — una persona, unica aunque pertenezca a varias escuelas
-- Clasificacion: personal
-- ---------------------------------------------------------------------

create table public.perfiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text not null,
  email           text,
  telefono        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.perfiles is 'Persona. Clasificacion: personal.';

create trigger perfiles_updated_at
  before update on public.perfiles
  for each row execute function app.set_updated_at();


-- ---------------------------------------------------------------------
-- membresias — persona + escuela + rol, con vigencia
-- Clasificacion: personal
-- ---------------------------------------------------------------------

create type public.rol_escuela as enum (
  'administracion',
  'colegio_maestros',
  'maestro_guia',
  'maestro_especialidad',
  'comision',
  'familia'
);

create table public.membresias (
  id          uuid primary key default gen_random_uuid(),
  escuela_id  uuid not null references public.escuelas(id) on delete cascade,
  perfil_id   uuid not null references public.perfiles(id) on delete cascade,
  rol         public.rol_escuela not null,
  desde       date not null default current_date,
  hasta       date,
  activa      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (escuela_id, perfil_id, rol),
  check (hasta is null or hasta >= desde)
);

comment on table public.membresias is 'Relacion persona-escuela-rol. Clasificacion: personal.';

create index membresias_perfil_idx  on public.membresias (perfil_id) where activa;
create index membresias_escuela_idx on public.membresias (escuela_id) where activa;

create trigger membresias_updated_at
  before update on public.membresias
  for each row execute function app.set_updated_at();


-- ---------------------------------------------------------------------
-- Funciones de seguridad
--
-- SECURITY DEFINER a proposito: deben poder leer membresias sin quedar
-- atrapadas en la RLS de la propia tabla membresias (recursion infinita).
-- search_path vacio y nombres calificados para evitar secuestro de esquema.
-- ---------------------------------------------------------------------

create or replace function app.escuelas_del_usuario()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct m.escuela_id
  from public.membresias m
  where m.perfil_id = auth.uid()
    and m.activa
    and m.desde <= current_date
    and (m.hasta is null or m.hasta >= current_date);
$$;

create or replace function app.es_miembro(p_escuela uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.membresias m
    where m.escuela_id = p_escuela
      and m.perfil_id = auth.uid()
      and m.activa
      and m.desde <= current_date
      and (m.hasta is null or m.hasta >= current_date)
  );
$$;

create or replace function app.tiene_rol(
  p_escuela uuid,
  p_roles   public.rol_escuela[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.membresias m
    where m.escuela_id = p_escuela
      and m.perfil_id = auth.uid()
      and m.rol = any(p_roles)
      and m.activa
      and m.desde <= current_date
      and (m.hasta is null or m.hasta >= current_date)
  );
$$;

-- Atajo para el caso mas frecuente: quien puede configurar la escuela.
create or replace function app.es_gestor(p_escuela uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.tiene_rol(
    p_escuela,
    array['administracion','colegio_maestros']::public.rol_escuela[]
  );
$$;

grant execute on function
  app.escuelas_del_usuario(),
  app.es_miembro(uuid),
  app.tiene_rol(uuid, public.rol_escuela[]),
  app.es_gestor(uuid)
to authenticated;


-- ---------------------------------------------------------------------
-- auditoria
-- Registra escrituras y, para tablas sensibles, tambien lecturas.
-- Para nivel Sensible se guardan solo metadatos: nunca el contenido.
-- ---------------------------------------------------------------------

create table public.auditoria (
  id            bigint generated always as identity primary key,
  escuela_id    uuid,
  tabla         text not null,
  registro_id   uuid,
  operacion     text not null,
  actor         uuid,
  datos_antes   jsonb,
  datos_despues jsonb,
  ocurrido_en   timestamptz not null default now()
);

comment on table public.auditoria is
  'Bitacora. TG_ARGV[0] = completo | metadatos. En sensibles usar metadatos.';

create index auditoria_escuela_idx on public.auditoria (escuela_id, ocurrido_en desc);
create index auditoria_registro_idx on public.auditoria (tabla, registro_id);

create or replace function app.auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_modo     text := coalesce(tg_argv[0], 'completo');
  v_fila     jsonb;
  v_escuela  uuid;
  v_registro uuid;
begin
  v_fila := to_jsonb(coalesce(new, old));

  begin
    v_escuela := (v_fila ->> 'escuela_id')::uuid;
  exception when others then
    v_escuela := null;
  end;

  begin
    v_registro := (v_fila ->> 'id')::uuid;
  exception when others then
    v_registro := null;
  end;

  insert into public.auditoria (
    escuela_id, tabla, registro_id, operacion, actor, datos_antes, datos_despues
  )
  values (
    v_escuela,
    tg_table_schema || '.' || tg_table_name,
    v_registro,
    tg_op,
    auth.uid(),
    case when v_modo = 'completo' and old is not null then to_jsonb(old) end,
    case when v_modo = 'completo' and new is not null then to_jsonb(new) end
  );

  return coalesce(new, old);
end;
$$;


-- =====================================================================
-- RLS
-- Todo denegado por defecto. Solo lo que una politica permita explicitamente.
-- =====================================================================

alter table public.escuelas   enable row level security;
alter table public.perfiles   enable row level security;
alter table public.membresias enable row level security;
alter table public.auditoria  enable row level security;

revoke all on public.escuelas, public.perfiles, public.membresias, public.auditoria
  from anon;


-- escuelas: se ve la escuela a la que se pertenece; la configura un gestor.
create policy escuelas_select on public.escuelas
  for select to authenticated
  using (app.es_miembro(id));

create policy escuelas_update on public.escuelas
  for update to authenticated
  using (app.es_gestor(id))
  with check (app.es_gestor(id));


-- perfiles: el propio, y los de quienes comparten alguna escuela conmigo.
create policy perfiles_select_propio on public.perfiles
  for select to authenticated
  using (id = auth.uid());

create policy perfiles_select_companeros on public.perfiles
  for select to authenticated
  using (
    exists (
      select 1
      from public.membresias m
      where m.perfil_id = public.perfiles.id
        and m.activa
        and m.escuela_id in (select app.escuelas_del_usuario())
    )
  );

create policy perfiles_update_propio on public.perfiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());


-- membresias: veo las mias; la administracion gestiona las de su escuela.
create policy membresias_select_propias on public.membresias
  for select to authenticated
  using (perfil_id = auth.uid());

create policy membresias_select_gestor on public.membresias
  for select to authenticated
  using (app.es_gestor(escuela_id));

create policy membresias_admin on public.membresias
  for all to authenticated
  using (app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[]))
  with check (app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[]));


-- auditoria: solo lectura, solo administracion, solo de su escuela.
-- Nadie escribe por API: solo los triggers, que son security definer.
create policy auditoria_select on public.auditoria
  for select to authenticated
  using (
    escuela_id is not null
    and app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[])
  );


-- Auditoria sobre la propia capa de tenencia.
create trigger membresias_auditoria
  after insert or update or delete on public.membresias
  for each row execute function app.auditar('completo');

create trigger escuelas_auditoria
  after insert or update or delete on public.escuelas
  for each row execute function app.auditar('completo');


-- ---------------------------------------------------------------------
-- Alta automatica de perfil al registrarse un usuario
-- ---------------------------------------------------------------------

create or replace function app.crear_perfil_al_registrar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre_completo, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre_completo', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger crear_perfil_al_registrar
  after insert on auth.users
  for each row execute function app.crear_perfil_al_registrar();
