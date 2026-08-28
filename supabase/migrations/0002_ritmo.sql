-- =====================================================================
-- 0002 — Ritmo
-- El calendario Waldorf: anios escolares, epocas, festividades, eventos
-- y minutas. Es la columna vertebral de la que cuelga todo lo demas.
-- Clasificacion: operacional.
-- =====================================================================

create extension if not exists btree_gist;


-- ---------------------------------------------------------------------
-- grupos — la cohorte que persiste entre anios
-- Se define aqui porque las epocas pueden ser especificas de un grupo.
-- ---------------------------------------------------------------------

create table public.grupos (
  id            uuid primary key default gen_random_uuid(),
  escuela_id    uuid not null references public.escuelas(id) on delete cascade,
  nombre        text not null,
  anio_cohorte  int not null,
  etapa         text,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (escuela_id, nombre)
);

comment on table public.grupos is
  'Cohorte que acompania al mismo maestro-guia varios anios. No es un curso anual.';

create trigger grupos_updated_at before update on public.grupos
  for each row execute function app.set_updated_at();


-- ---------------------------------------------------------------------
-- anios_escolares
-- ---------------------------------------------------------------------

create table public.anios_escolares (
  id          uuid primary key default gen_random_uuid(),
  escuela_id  uuid not null references public.escuelas(id) on delete cascade,
  nombre      text not null,
  inicio      date not null,
  fin         date not null,
  activo      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (escuela_id, nombre),
  check (fin > inicio)
);

-- Invariante 6: un solo anio activo por escuela.
create unique index anios_un_activo_por_escuela
  on public.anios_escolares (escuela_id)
  where activo;

create trigger anios_updated_at before update on public.anios_escolares
  for each row execute function app.set_updated_at();


-- ---------------------------------------------------------------------
-- epocas — bloques de 3 a 4 semanas. grupo_id nulo = toda la escuela.
-- ---------------------------------------------------------------------

create table public.epocas (
  id          uuid primary key default gen_random_uuid(),
  escuela_id  uuid not null references public.escuelas(id) on delete cascade,
  anio_id     uuid not null references public.anios_escolares(id) on delete cascade,
  grupo_id    uuid references public.grupos(id) on delete cascade,
  nombre      text not null,
  tema        text,
  orden       int  not null default 1,
  inicio      date not null,
  fin         date not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (fin >= inicio)
);

comment on table public.epocas is
  'Bloque tematico. grupo_id nulo significa epoca de toda la escuela.';

-- Invariante 2: las epocas de un mismo grupo no se solapan.
alter table public.epocas
  add constraint epocas_sin_solape
  exclude using gist (
    escuela_id with =,
    grupo_id   with =,
    daterange(inicio, fin, '[]') with &&
  )
  where (grupo_id is not null);

create index epocas_anio_idx on public.epocas (anio_id, inicio);

create trigger epocas_updated_at before update on public.epocas
  for each row execute function app.set_updated_at();


-- ---------------------------------------------------------------------
-- festividades — configurables por escuela, varian por hemisferio y pais
-- ---------------------------------------------------------------------

create table public.festividades (
  id           uuid primary key default gen_random_uuid(),
  escuela_id   uuid not null references public.escuelas(id) on delete cascade,
  anio_id      uuid not null references public.anios_escolares(id) on delete cascade,
  epoca_id     uuid references public.epocas(id) on delete set null,
  nombre       text not null,
  descripcion  text,
  fecha        date not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index festividades_anio_idx on public.festividades (anio_id, fecha);

create trigger festividades_updated_at before update on public.festividades
  for each row execute function app.set_updated_at();


-- ---------------------------------------------------------------------
-- eventos — jornadas, asambleas, encuentros, talleres, reuniones
-- ---------------------------------------------------------------------

create type public.tipo_evento as enum (
  'jornada',
  'asamblea',
  'encuentro_1a1',
  'taller',
  'reunion_comision',
  'festividad',
  'otro'
);

create table public.eventos (
  id             uuid primary key default gen_random_uuid(),
  escuela_id     uuid not null references public.escuelas(id) on delete cascade,
  anio_id        uuid references public.anios_escolares(id) on delete cascade,
  epoca_id       uuid references public.epocas(id) on delete set null,
  grupo_id       uuid references public.grupos(id) on delete set null,
  tipo           public.tipo_evento not null,
  titulo         text not null,
  descripcion    text,
  lugar          text,
  inicio         timestamptz not null,
  fin            timestamptz,
  requiere_inscripcion boolean not null default false,
  cupo           int,
  publico        boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (fin is null or fin >= inicio)
);

comment on column public.eventos.publico is
  'true = visible para toda la comunidad. false = solo equipo.';

create index eventos_escuela_inicio_idx on public.eventos (escuela_id, inicio);

create trigger eventos_updated_at before update on public.eventos
  for each row execute function app.set_updated_at();


create table public.evento_inscripciones (
  id          uuid primary key default gen_random_uuid(),
  escuela_id  uuid not null references public.escuelas(id) on delete cascade,
  evento_id   uuid not null references public.eventos(id) on delete cascade,
  perfil_id   uuid not null references public.perfiles(id) on delete cascade,
  asistio     boolean,
  created_at  timestamptz not null default now(),
  unique (evento_id, perfil_id)
);


-- ---------------------------------------------------------------------
-- minutas — la propuesta de alimentacion, cambia por epoca y dia
-- ---------------------------------------------------------------------

create table public.minutas (
  id          uuid primary key default gen_random_uuid(),
  escuela_id  uuid not null references public.escuelas(id) on delete cascade,
  epoca_id    uuid not null references public.epocas(id) on delete cascade,
  dia_semana  int not null check (dia_semana between 1 and 7),
  plato       text not null,
  notas       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (epoca_id, dia_semana)
);

comment on table public.minutas is
  'Propuesta de alimentacion por epoca y dia. dia_semana: 1=lunes.';

create trigger minutas_updated_at before update on public.minutas
  for each row execute function app.set_updated_at();


-- =====================================================================
-- RLS — patron del modulo ritmo
-- Lectura: cualquier miembro de la escuela.
-- Escritura: gestores (administracion o colegio de maestros).
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'grupos','anios_escolares','epocas','festividades',
    'eventos','evento_inscripciones','minutas'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);

    execute format($f$
      create policy %1$I_select on public.%1$I
        for select to authenticated
        using (app.es_miembro(escuela_id))
    $f$, t);

    execute format($f$
      create policy %1$I_write on public.%1$I
        for all to authenticated
        using (app.es_gestor(escuela_id))
        with check (app.es_gestor(escuela_id))
    $f$, t);

    execute format($f$
      create trigger %1$I_auditoria
        after insert or update or delete on public.%1$I
        for each row execute function app.auditar('completo')
    $f$, t);
  end loop;
end $$;


-- Excepcion: cada persona gestiona su propia inscripcion a un evento.
create policy evento_inscripciones_propia on public.evento_inscripciones
  for all to authenticated
  using (perfil_id = auth.uid() and app.es_miembro(escuela_id))
  with check (perfil_id = auth.uid() and app.es_miembro(escuela_id));
