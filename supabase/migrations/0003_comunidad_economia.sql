-- =====================================================================
-- 0003 — Comunidad y economia
-- Familias, ninos, maestros de grupo, comisiones, acuerdos de aporte,
-- aportes en dinero y en horas, campanias.
-- Clasificacion: personal, menor y economico. Ver docs/PRIVACY.md.
-- =====================================================================


-- ---------------------------------------------------------------------
-- grupo_maestros — la relacion plurianual maestro-grupo
-- ---------------------------------------------------------------------

create type public.tipo_maestro as enum ('guia', 'especialidad');

create table public.grupo_maestros (
  id          uuid primary key default gen_random_uuid(),
  escuela_id  uuid not null references public.escuelas(id) on delete cascade,
  grupo_id    uuid not null,
  perfil_id   uuid not null references public.perfiles(id) on delete cascade,
  tipo        public.tipo_maestro not null,
  materia     text,
  desde       date not null default current_date,
  hasta       date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (hasta is null or hasta >= desde)
);

comment on table public.grupo_maestros is
  'Relacion plurianual. El maestro-guia acompania al grupo varios anios.';

-- Invariante 4: a lo sumo un maestro-guia vigente por grupo.
alter table public.grupo_maestros
  add constraint grupo_un_guia_vigente
  exclude using gist (
    grupo_id with =,
    daterange(desde, coalesce(hasta, 'infinity'::date), '[]') with &&
  )
  where (tipo = 'guia');

create trigger grupo_maestros_updated_at before update on public.grupo_maestros
  for each row execute function app.set_updated_at();


-- Funcion auxiliar: el usuario es maestro de este grupo hoy.
create or replace function app.es_maestro_de_grupo(p_grupo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.grupo_maestros gm
    where gm.grupo_id = p_grupo
      and gm.perfil_id = auth.uid()
      and gm.desde <= current_date
      and (gm.hasta is null or gm.hasta >= current_date)
  );
$$;

grant execute on function app.es_maestro_de_grupo(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- familias — la unidad de participacion
-- ---------------------------------------------------------------------

create table public.familias (
  id          uuid primary key default gen_random_uuid(),
  escuela_id  uuid not null references public.escuelas(id) on delete cascade,
  nombre      text not null,
  activa      boolean not null default true,
  ingreso     date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.familias is 'Unidad de participacion. Clasificacion: personal.';

create trigger familias_updated_at before update on public.familias
  for each row execute function app.set_updated_at();


create table public.familia_miembros (
  id          uuid primary key default gen_random_uuid(),
  escuela_id  uuid not null references public.escuelas(id) on delete cascade,
  familia_id  uuid not null,
  perfil_id   uuid not null references public.perfiles(id) on delete cascade,
  relacion    text,
  principal   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (familia_id, perfil_id)
);


-- Funcion auxiliar: la familia del usuario en esta escuela.
create or replace function app.familias_del_usuario(p_escuela uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select fm.familia_id
  from public.familia_miembros fm
  where fm.perfil_id = auth.uid()
    and fm.escuela_id = p_escuela;
$$;

grant execute on function app.familias_del_usuario(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- ninos — datos minimos. Clasificacion: menor.
-- Antes de agregar un campo aqui, leer la seccion Minimizacion
-- de docs/PRIVACY.md.
-- ---------------------------------------------------------------------

create table public.ninos (
  id                 uuid primary key default gen_random_uuid(),
  escuela_id         uuid not null references public.escuelas(id) on delete cascade,
  familia_id         uuid not null,
  grupo_id           uuid,
  nombre             text not null,
  apellidos          text not null,
  nombre_preferido   text,
  fecha_nacimiento   date not null,
  ingreso            date,
  egreso             date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.ninos is
  'Clasificacion: MENOR. Datos minimos indispensables. Auditar lecturas y escrituras.';

create index ninos_grupo_idx   on public.ninos (grupo_id) where egreso is null;
create index ninos_familia_idx on public.ninos (familia_id);

create trigger ninos_updated_at before update on public.ninos
  for each row execute function app.set_updated_at();


-- ---------------------------------------------------------------------
-- comisiones
-- ---------------------------------------------------------------------

create table public.comisiones (
  id           uuid primary key default gen_random_uuid(),
  escuela_id   uuid not null references public.escuelas(id) on delete cascade,
  nombre       text not null,
  descripcion  text,
  activa       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (escuela_id, nombre)
);

create table public.comision_miembros (
  id           uuid primary key default gen_random_uuid(),
  escuela_id   uuid not null references public.escuelas(id) on delete cascade,
  comision_id  uuid not null,
  perfil_id    uuid not null references public.perfiles(id) on delete cascade,
  coordina     boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (comision_id, perfil_id)
);

create trigger comisiones_updated_at before update on public.comisiones
  for each row execute function app.set_updated_at();


-- ---------------------------------------------------------------------
-- acuerdos_aporte — el compromiso anual de una familia.
-- Es un ACUERDO, no una deuda. El lenguaje de la UI debe reflejarlo.
-- Doble moneda: dinero y horas de trabajo comunitario.
-- ---------------------------------------------------------------------

create table public.tramos_aporte (
  id            uuid primary key default gen_random_uuid(),
  escuela_id    uuid not null references public.escuelas(id) on delete cascade,
  anio_id       uuid not null,
  nombre        text not null,
  monto_sugerido numeric(12,2),
  horas_sugeridas numeric(6,2),
  orden         int not null default 1,
  created_at    timestamptz not null default now(),
  unique (anio_id, nombre)
);

comment on table public.tramos_aporte is
  'Tramos del aporte solidario. Configurables por escuela y por anio. Nunca hardcodear.';


create table public.acuerdos_aporte (
  id              uuid primary key default gen_random_uuid(),
  escuela_id      uuid not null references public.escuelas(id) on delete cascade,
  familia_id      uuid not null,
  anio_id         uuid not null,
  tramo_id        uuid,
  monto_mensual   numeric(12,2) not null default 0,
  horas_mensuales numeric(6,2)  not null default 0,
  notas           text,
  acordado_en     date not null default current_date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Invariante 5
  unique (familia_id, anio_id),
  check (monto_mensual >= 0 and horas_mensuales >= 0)
);

comment on table public.acuerdos_aporte is
  'Clasificacion: economico. Compromiso anual en dinero y horas.';

create trigger acuerdos_updated_at before update on public.acuerdos_aporte
  for each row execute function app.set_updated_at();


-- ---------------------------------------------------------------------
-- aportes — lo efectivamente aportado. Dinero u horas.
-- ---------------------------------------------------------------------

create type public.moneda_aporte as enum ('dinero', 'horas');

create type public.estado_aporte as enum ('registrado', 'confirmado', 'anulado');

create table public.aportes (
  id           uuid primary key default gen_random_uuid(),
  escuela_id   uuid not null references public.escuelas(id) on delete cascade,
  familia_id   uuid not null,
  anio_id      uuid not null,
  moneda       public.moneda_aporte not null,
  monto        numeric(12,2),
  horas        numeric(6,2),
  fecha        date not null default current_date,
  periodo      date,
  comision_id  uuid,
  campana_id   uuid,
  descripcion  text,
  estado       public.estado_aporte not null default 'registrado',
  registrado_por uuid references public.perfiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (
    (moneda = 'dinero' and monto is not null and monto > 0 and horas is null) or
    (moneda = 'horas'  and horas is not null and horas > 0 and monto is null)
  )
);

comment on column public.aportes.periodo is
  'Mes al que se imputa el aporte, normalizado al dia 1.';

-- H11: la normalizacion estaba solo en el comentario. Sin esto, dos aportes
-- del mismo mes con dia distinto no agregan juntos.
alter table public.aportes
  add constraint aportes_periodo_dia_1
  check (periodo is null or extract(day from periodo) = 1);

create index aportes_familia_idx on public.aportes (familia_id, anio_id, fecha desc);
create index aportes_periodo_idx on public.aportes (escuela_id, periodo);

create trigger aportes_updated_at before update on public.aportes
  for each row execute function app.set_updated_at();


-- ---------------------------------------------------------------------
-- campanias — recoleccion, ayuda o apoyo, ancladas al ritmo
-- ---------------------------------------------------------------------

create table public.campanas (
  id           uuid primary key default gen_random_uuid(),
  escuela_id   uuid not null references public.escuelas(id) on delete cascade,
  anio_id      uuid,
  epoca_id     uuid,
  comision_id  uuid,
  nombre       text not null,
  descripcion  text,
  meta_monto   numeric(12,2),
  meta_horas   numeric(6,2),
  inicio       date,
  fin          date,
  activa       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (fin is null or inicio is null or fin >= inicio)
);

create trigger campanas_updated_at before update on public.campanas
  for each row execute function app.set_updated_at();


-- =====================================================================
-- Integridad multi-tenant (B3)
--
-- unique (id, escuela_id) en el padre + FK compuesta en la hija. Ver la
-- explicacion extendida en 0002_ritmo.sql. Las FK opcionales usan
-- `on delete set null (columna)` para no anular escuela_id, que es not null.
-- =====================================================================

alter table public.familias
  add constraint familias_id_escuela_key unique (id, escuela_id);
alter table public.comisiones
  add constraint comisiones_id_escuela_key unique (id, escuela_id);
alter table public.tramos_aporte
  add constraint tramos_id_escuela_key unique (id, escuela_id);
alter table public.campanas
  add constraint campanas_id_escuela_key unique (id, escuela_id);

alter table public.grupo_maestros
  add constraint grupo_maestros_grupo_fk foreign key (grupo_id, escuela_id)
    references public.grupos (id, escuela_id) on delete cascade;

alter table public.familia_miembros
  add constraint familia_miembros_familia_fk foreign key (familia_id, escuela_id)
    references public.familias (id, escuela_id) on delete cascade;

alter table public.ninos
  add constraint ninos_familia_fk foreign key (familia_id, escuela_id)
    references public.familias (id, escuela_id) on delete restrict,
  add constraint ninos_grupo_fk foreign key (grupo_id, escuela_id)
    references public.grupos (id, escuela_id) on delete set null (grupo_id);

alter table public.comision_miembros
  add constraint comision_miembros_comision_fk foreign key (comision_id, escuela_id)
    references public.comisiones (id, escuela_id) on delete cascade;

alter table public.tramos_aporte
  add constraint tramos_anio_fk foreign key (anio_id, escuela_id)
    references public.anios_escolares (id, escuela_id) on delete cascade;

alter table public.acuerdos_aporte
  add constraint acuerdos_familia_fk foreign key (familia_id, escuela_id)
    references public.familias (id, escuela_id) on delete cascade,
  add constraint acuerdos_anio_fk foreign key (anio_id, escuela_id)
    references public.anios_escolares (id, escuela_id) on delete cascade,
  add constraint acuerdos_tramo_fk foreign key (tramo_id, escuela_id)
    references public.tramos_aporte (id, escuela_id) on delete set null (tramo_id);

alter table public.aportes
  add constraint aportes_familia_fk foreign key (familia_id, escuela_id)
    references public.familias (id, escuela_id) on delete cascade,
  add constraint aportes_anio_fk foreign key (anio_id, escuela_id)
    references public.anios_escolares (id, escuela_id) on delete cascade,
  add constraint aportes_comision_fk foreign key (comision_id, escuela_id)
    references public.comisiones (id, escuela_id) on delete set null (comision_id),
  add constraint aportes_campana_fk foreign key (campana_id, escuela_id)
    references public.campanas (id, escuela_id) on delete set null (campana_id);

alter table public.campanas
  add constraint campanas_anio_fk foreign key (anio_id, escuela_id)
    references public.anios_escolares (id, escuela_id) on delete cascade,
  add constraint campanas_epoca_fk foreign key (epoca_id, escuela_id)
    references public.epocas (id, escuela_id) on delete set null (epoca_id),
  add constraint campanas_comision_fk foreign key (comision_id, escuela_id)
    references public.comisiones (id, escuela_id) on delete set null (comision_id);


-- =====================================================================
-- RLS
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'grupo_maestros','familias','familia_miembros','ninos',
    'comisiones','comision_miembros','tramos_aporte',
    'acuerdos_aporte','aportes','campanas'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;


-- Estructura del equipo y comisiones: visible para toda la comunidad.
create policy grupo_maestros_select on public.grupo_maestros
  for select to authenticated using (app.es_miembro(escuela_id));
create policy grupo_maestros_write on public.grupo_maestros
  for all to authenticated
  using (app.es_gestor(escuela_id)) with check (app.es_gestor(escuela_id));

create policy comisiones_select on public.comisiones
  for select to authenticated using (app.es_miembro(escuela_id));
create policy comisiones_write on public.comisiones
  for all to authenticated
  using (app.es_gestor(escuela_id)) with check (app.es_gestor(escuela_id));

create policy comision_miembros_select on public.comision_miembros
  for select to authenticated using (app.es_miembro(escuela_id));
create policy comision_miembros_write on public.comision_miembros
  for all to authenticated
  using (app.es_gestor(escuela_id)) with check (app.es_gestor(escuela_id));

create policy tramos_select on public.tramos_aporte
  for select to authenticated using (app.es_miembro(escuela_id));
create policy tramos_write on public.tramos_aporte
  for all to authenticated
  using (app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[]))
  with check (app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[]));


-- Familias: la propia familia se ve a si misma; la administracion ve todo.
create policy familias_select on public.familias
  for select to authenticated
  using (
    app.es_gestor(escuela_id)
    or id in (select app.familias_del_usuario(escuela_id))
  );

create policy familias_write on public.familias
  for all to authenticated
  using (app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[]))
  with check (app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[]));

create policy familia_miembros_select on public.familia_miembros
  for select to authenticated
  using (
    app.es_gestor(escuela_id)
    or familia_id in (select app.familias_del_usuario(escuela_id))
  );

create policy familia_miembros_write on public.familia_miembros
  for all to authenticated
  using (app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[]))
  with check (app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[]));


-- Ninos: administracion, colegio de maestros, el maestro del grupo, y su familia.
create policy ninos_select on public.ninos
  for select to authenticated
  using (
    app.es_gestor(escuela_id)
    or (grupo_id is not null and app.es_maestro_de_grupo(grupo_id))
    or familia_id in (select app.familias_del_usuario(escuela_id))
  );

-- H13: es_gestor incluye a colegio_maestros. Segun la tabla de roles de
-- docs/DOMAIN.md, familias y ninos son ambito de administracion.
create policy ninos_write on public.ninos
  for all to authenticated
  using (app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[]))
  with check (app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[]));


-- Economia: la familia ve lo suyo, la administracion gestiona.
create policy acuerdos_select on public.acuerdos_aporte
  for select to authenticated
  using (
    app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[])
    or familia_id in (select app.familias_del_usuario(escuela_id))
  );

create policy acuerdos_write on public.acuerdos_aporte
  for all to authenticated
  using (app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[]))
  with check (app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[]));

create policy aportes_select on public.aportes
  for select to authenticated
  using (
    app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[])
    or familia_id in (select app.familias_del_usuario(escuela_id))
  );

create policy aportes_write on public.aportes
  for all to authenticated
  using (app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[]))
  with check (app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[]));

create policy campanas_select on public.campanas
  for select to authenticated using (app.es_miembro(escuela_id));
create policy campanas_write on public.campanas
  for all to authenticated
  using (app.es_gestor(escuela_id)) with check (app.es_gestor(escuela_id));


-- =====================================================================
-- Auditoria
-- Nivel menor y economico: registro completo de escrituras.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'ninos','familias','familia_miembros','acuerdos_aporte','aportes',
    'grupo_maestros','tramos_aporte','campanas'
  ]
  loop
    execute format($f$
      create trigger %1$I_auditoria
        after insert or update or delete on public.%1$I
        for each row execute function app.auditar('completo')
    $f$, t);
  end loop;
end $$;


-- =====================================================================
-- H7 — El rol `comision` tenia alcance en docs/DOMAIN.md pero no aparecia
-- en ninguna politica: un coordinador no podia gestionar su propia campana.
--
-- Alcance acotado a lo que hoy existe en el esquema: su comision y las
-- campanas ancladas a ella. Tareas y presupuesto todavia no se modelan.
-- =====================================================================

create or replace function app.es_miembro_de_comision(p_comision uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
    from public.comision_miembros cm
    where cm.comision_id = p_comision
      and cm.perfil_id = auth.uid()
  );
$fn$;

grant execute on function app.es_miembro_de_comision(uuid) to authenticated;

create policy campanas_comision on public.campanas
  for all to authenticated
  using (
    comision_id is not null
    and app.es_miembro(escuela_id)
    and app.es_miembro_de_comision(comision_id)
  )
  with check (
    comision_id is not null
    and app.es_miembro(escuela_id)
    and app.es_miembro_de_comision(comision_id)
  );


-- =====================================================================
-- H8 — Auditoria faltante en comisiones y sus integrantes (nivel personal)
-- =====================================================================

do $do$
declare t text;
begin
  foreach t in array array['comisiones','comision_miembros']
  loop
    execute format($f$
      create trigger %1$I_auditoria
        after insert or update or delete on public.%1$I
        for each row execute function app.auditar('completo')
    $f$, t);
  end loop;
end $do$;


-- =====================================================================
-- H12 — Privilegios explicitos de tabla
-- =====================================================================

do $do$
declare t text;
begin
  foreach t in array array[
    'grupo_maestros','familias','familia_miembros','ninos',
    'comisiones','comision_miembros','tramos_aporte',
    'acuerdos_aporte','aportes','campanas'
  ]
  loop
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $do$;
