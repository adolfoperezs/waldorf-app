-- =====================================================================
-- 0007 — Ciclos, ritmo semanal por grupo y familias invitadas
--
-- Lineamiento: docs/lineamientos/2026-09-especificacion-ux-kimun.md
-- Blueprint:   .claude/PRPs/PRP-002-ritmo-por-nino.md
--
-- El ritmo deja de ser plano para toda la escuela. Un apoderado con un hijo
-- en jardin y otro en basica necesita informacion distinta, y la maestra
-- necesita cargar la semana de SU grupo.
-- =====================================================================


-- ---------------------------------------------------------------------
-- ciclos — etapas de la escuela (Grupo Semilla, Basica, Media...)
--
-- Los NOMBRES son dato de cada escuela (CLAUDE.md, regla 6). Lo unico fijo
-- es la modalidad, que es la diferencia pedagogica real y decide que campos
-- muestra la interfaz:
--   jardin  — primer septenio. Imitacion, juego, cuento. Sin epocas ni
--             materias.
--   escolar — segundo y tercer septenio. Clase principal por epocas y
--             materias especiales.
--
-- `acento` es el nombre de un token del sistema de diseno, no un color
-- libre: la paleta la controla globals.css.
--
-- Clasificacion: operacional.
-- ---------------------------------------------------------------------

create type public.modalidad_ciclo as enum ('jardin', 'escolar');

create table public.ciclos (
  id          uuid primary key default gen_random_uuid(),
  escuela_id  uuid not null references public.escuelas(id) on delete cascade,
  nombre      text not null check (char_length(btrim(nombre)) between 2 and 60),
  modalidad   public.modalidad_ciclo not null,
  acento      text not null default 'tierra'
                check (acento in ('salvia', 'ocre', 'arcilla', 'tierra')),
  orden       int  not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (escuela_id, nombre),
  unique (id, escuela_id)
);

comment on table public.ciclos is
  'Etapa de la escuela. Nombre configurable; modalidad estructural (jardin o escolar). Clasificacion: operacional.';

create trigger ciclos_updated_at before update on public.ciclos
  for each row execute function app.set_updated_at();


-- grupos.etapa era texto libre, sin uso y sin filas en produccion. Con
-- ciclo_id serian dos fuentes de verdad para lo mismo.
alter table public.grupos drop column etapa;

alter table public.grupos
  add column ciclo_id uuid,
  add constraint grupos_ciclo_fk foreign key (ciclo_id, escuela_id)
    references public.ciclos (id, escuela_id) on delete set null (ciclo_id);


-- ---------------------------------------------------------------------
-- ritmos_semanales — la semana de un grupo, tal como la carga su maestra
--
-- `tema`: en jardin, el cuento, la ronda o el arquetipo de la semana; en
-- escolar, el tema de la clase principal. Un solo campo porque cumple el
-- mismo papel: el hilo de la semana.
--
-- `publicado_en` nulo = borrador. Las familias solo ven lo publicado.
--
-- Clasificacion: operacional. Es informacion del grupo, no de un nino.
-- ---------------------------------------------------------------------

create table public.ritmos_semanales (
  id             uuid primary key default gen_random_uuid(),
  escuela_id     uuid not null references public.escuelas(id) on delete cascade,
  grupo_id       uuid not null,
  semana         date not null check (extract(isodow from semana) = 1),
  tema           text check (tema is null or char_length(tema) <= 300),
  recordatorio   text check (recordatorio is null or char_length(recordatorio) <= 1000),
  publicado_en   timestamptz,
  publicado_por  uuid references public.perfiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (grupo_id, semana),
  unique (id, escuela_id),
  foreign key (grupo_id, escuela_id)
    references public.grupos (id, escuela_id) on delete cascade
);

comment on table public.ritmos_semanales is
  'Semana de un grupo. semana = lunes. publicado_en nulo = borrador. Clasificacion: operacional.';

create trigger ritmos_semanales_updated_at before update on public.ritmos_semanales
  for each row execute function app.set_updated_at();


create table public.ritmo_dias (
  id          uuid primary key default gen_random_uuid(),
  escuela_id  uuid not null references public.escuelas(id) on delete cascade,
  ritmo_id    uuid not null,
  dia_semana  int  not null check (dia_semana between 1 and 7),
  actividad   text check (actividad is null or char_length(actividad) <= 500),
  materias    text[] not null default '{}' check (cardinality(materias) <= 12),
  alimento    text check (alimento is null or char_length(alimento) <= 200),
  nota        text check (nota is null or char_length(nota) <= 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (ritmo_id, dia_semana),
  foreign key (ritmo_id, escuela_id)
    references public.ritmos_semanales (id, escuela_id) on delete cascade
);

comment on table public.ritmo_dias is
  'Un dia de la semana de un grupo. dia_semana: 1=lunes. alimento nulo = el de la minuta. Clasificacion: operacional.';

create trigger ritmo_dias_updated_at before update on public.ritmo_dias
  for each row execute function app.set_updated_at();


-- Quien edita el ritmo de un grupo: gestores, o su maestro vigente con
-- membresia activa. Sin es_miembro, una maestra dada de baja seguiria
-- editando mientras su fila de grupo_maestros no tuviera fecha de termino.
create or replace function app.puede_editar_ritmo(p_escuela uuid, p_grupo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.es_gestor(p_escuela)
      or (app.es_miembro(p_escuela) and app.es_maestro_de_grupo(p_grupo));
$$;

revoke execute on function app.puede_editar_ritmo(uuid, uuid) from public, anon;
grant  execute on function app.puede_editar_ritmo(uuid, uuid) to authenticated;


-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.ciclos            enable row level security;
alter table public.ritmos_semanales  enable row level security;
alter table public.ritmo_dias        enable row level security;

revoke all on public.ciclos           from anon;
revoke all on public.ritmos_semanales from anon;
revoke all on public.ritmo_dias       from anon;

grant select, insert, update, delete on public.ciclos           to authenticated;
grant select, insert, update, delete on public.ritmos_semanales to authenticated;
grant select, insert, update, delete on public.ritmo_dias       to authenticated;

-- Ciclos: como el resto de la configuracion pedagogica.
create policy ciclos_select on public.ciclos
  for select to authenticated using (app.es_miembro(escuela_id));
create policy ciclos_write on public.ciclos
  for all to authenticated
  using (app.es_gestor(escuela_id)) with check (app.es_gestor(escuela_id));

-- Semana: el borrador lo ve quien puede editarlo; lo publicado, la comunidad.
create policy ritmos_semanales_select on public.ritmos_semanales
  for select to authenticated
  using (
    app.es_miembro(escuela_id)
    and (publicado_en is not null or app.puede_editar_ritmo(escuela_id, grupo_id))
  );

create policy ritmos_semanales_write on public.ritmos_semanales
  for all to authenticated
  using (app.puede_editar_ritmo(escuela_id, grupo_id))
  with check (app.puede_editar_ritmo(escuela_id, grupo_id));

-- Dias: heredan la visibilidad de su semana. El `exists` corre con la RLS de
-- quien consulta, asi que un dia de un borrador ajeno no aparece.
create policy ritmo_dias_select on public.ritmo_dias
  for select to authenticated
  using (
    exists (
      select 1 from public.ritmos_semanales r
      where r.id = ritmo_dias.ritmo_id and r.escuela_id = ritmo_dias.escuela_id
    )
  );

create policy ritmo_dias_write on public.ritmo_dias
  for all to authenticated
  using (
    exists (
      select 1 from public.ritmos_semanales r
      where r.id = ritmo_dias.ritmo_id
        and r.escuela_id = ritmo_dias.escuela_id
        and app.puede_editar_ritmo(r.escuela_id, r.grupo_id)
    )
  )
  with check (
    exists (
      select 1 from public.ritmos_semanales r
      where r.id = ritmo_dias.ritmo_id
        and r.escuela_id = ritmo_dias.escuela_id
        and app.puede_editar_ritmo(r.escuela_id, r.grupo_id)
    )
  );

create trigger ciclos_auditoria
  after insert or update or delete on public.ciclos
  for each row execute function app.auditar('completo');
create trigger ritmos_semanales_auditoria
  after insert or update or delete on public.ritmos_semanales
  for each row execute function app.auditar('completo');
create trigger ritmo_dias_auditoria
  after insert or update or delete on public.ritmo_dias
  for each row execute function app.auditar('completo');


-- =====================================================================
-- Familias invitadas
--
-- "+ Sumar familia": la administracion crea la familia y sus ninos, y manda
-- un enlace. Quien lo acepta queda en familia_miembros y entra viendo a sus
-- hijos. Es la misma invitacion de 0006 con un dato mas.
-- =====================================================================

alter table public.invitaciones
  add column familia_id uuid,
  add constraint invitaciones_familia_fk foreign key (familia_id, escuela_id)
    references public.familias (id, escuela_id) on delete cascade,
  add constraint invitaciones_familia_rol
    check (familia_id is null or rol = 'familia');


-- ver_invitacion cambia su tipo de retorno (agrega familia_nombre): hay que
-- borrarla y crearla. No hay nada que dependa de ella en la base.
drop function public.ver_invitacion(text);

create function public.ver_invitacion(p_token text)
returns table (
  escuela_nombre  text,
  escuela_slug    text,
  rol             public.rol_escuela,
  estado          text,
  requiere_correo boolean,
  correo_coincide boolean,
  familia_nombre  text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.nombre,
    e.slug,
    i.rol,
    case
      when i.revocada_en is not null then 'revocada'
      when i.aceptada_en is not null then 'usada'
      when i.expira_en <= now()       then 'expirada'
      else 'vigente'
    end,
    i.email is not null,
    i.email is null
      or i.email = (select lower(u.email) from auth.users u where u.id = auth.uid()),
    f.nombre
  from public.invitaciones i
  join public.escuelas e on e.id = i.escuela_id
  left join public.familias f on f.id = i.familia_id
  where i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and auth.uid() is not null;
$$;

revoke execute on function public.ver_invitacion(text) from public, anon;
grant  execute on function public.ver_invitacion(text) to authenticated;


-- Igual que en 0006, mas el paso de la familia. La primera persona que entra
-- a una familia queda como principal.
create or replace function public.aceptar_invitacion(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor  uuid := auth.uid();
  v_correo text;
  v_inv    public.invitaciones%rowtype;
  v_slug   text;
begin
  if v_actor is null then
    raise exception 'Se requiere una sesion iniciada' using errcode = '42501';
  end if;

  select * into v_inv
  from public.invitaciones i
  where i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
  for update;

  if not found
     or v_inv.revocada_en is not null
     or v_inv.aceptada_en is not null
     or v_inv.expira_en <= now() then
    raise exception 'La invitacion no es valida, ya se uso o caduco'
      using errcode = 'P0002';
  end if;

  if v_inv.email is not null then
    select lower(u.email) into v_correo from auth.users u where u.id = v_actor;
    if v_correo is distinct from v_inv.email then
      raise exception 'Esta invitacion es para otra direccion de correo'
        using errcode = '42501';
    end if;
  end if;

  insert into public.membresias (escuela_id, perfil_id, rol)
  values (v_inv.escuela_id, v_actor, v_inv.rol)
  on conflict (escuela_id, perfil_id, rol)
  do update set activa = true, hasta = null;

  if v_inv.familia_id is not null then
    insert into public.familia_miembros (escuela_id, familia_id, perfil_id, principal)
    values (
      v_inv.escuela_id,
      v_inv.familia_id,
      v_actor,
      not exists (
        select 1 from public.familia_miembros fm where fm.familia_id = v_inv.familia_id
      )
    )
    on conflict (familia_id, perfil_id) do nothing;
  end if;

  update public.invitaciones
     set aceptada_por = v_actor,
         aceptada_en  = now()
   where id = v_inv.id;

  select e.slug into v_slug from public.escuelas e where e.id = v_inv.escuela_id;
  return v_slug;
end;
$$;

revoke execute on function public.aceptar_invitacion(text) from public, anon;
grant  execute on function public.aceptar_invitacion(text) to authenticated;


-- ---------------------------------------------------------------------
-- sumar_familia — familia, ninos e invitacion en una sola transaccion
--
-- SECURITY INVOKER: no se salta nada. Cada insercion pasa por la RLS de
-- quien llama (familias_write, ninos_write, invitaciones_admin), que exigen
-- administracion. Existe por atomicidad: hecho desde la app en tres pasos,
-- una falla a la mitad deja una familia sin ninos o sin enlace.
--
-- p_ninos: [{ "nombre", "apellidos", "fecha_nacimiento", "grupo_id"? }]
-- La huella del codigo la calcula la app; el codigo nunca llega aqui.
-- ---------------------------------------------------------------------

create or replace function public.sumar_familia(
  p_escuela     uuid,
  p_nombre      text,
  p_ninos       jsonb,
  p_token_hash  text,
  p_email       text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_familia uuid;
  v_hoy     date;
  v_nino    jsonb;
begin
  if jsonb_typeof(p_ninos) is distinct from 'array'
     or jsonb_array_length(p_ninos) = 0
     or jsonb_array_length(p_ninos) > 8 then
    raise exception 'Hace falta al menos un nino' using errcode = '22023';
  end if;

  -- El dia de ingreso es el de la escuela, no el del servidor en UTC.
  select (now() at time zone e.zona_horaria)::date into v_hoy
  from public.escuelas e where e.id = p_escuela;

  insert into public.familias (escuela_id, nombre, ingreso)
  values (p_escuela, btrim(p_nombre), v_hoy)
  returning id into v_familia;

  for v_nino in select value from jsonb_array_elements(p_ninos)
  loop
    insert into public.ninos (
      escuela_id, familia_id, grupo_id, nombre, apellidos, fecha_nacimiento, ingreso
    )
    values (
      p_escuela,
      v_familia,
      nullif(v_nino ->> 'grupo_id', '')::uuid,
      btrim(v_nino ->> 'nombre'),
      btrim(v_nino ->> 'apellidos'),
      (v_nino ->> 'fecha_nacimiento')::date,
      v_hoy
    );
  end loop;

  insert into public.invitaciones (
    escuela_id, rol, email, token_hash, creada_por, familia_id
  )
  values (
    p_escuela, 'familia', nullif(lower(btrim(p_email)), ''), p_token_hash,
    auth.uid(), v_familia
  );

  return v_familia;
end;
$$;

revoke execute on function public.sumar_familia(uuid, text, jsonb, text, text) from public, anon;
grant  execute on function public.sumar_familia(uuid, text, jsonb, text, text) to authenticated;


-- =====================================================================
-- Lecturas de ninos, auditadas
--
-- docs/PRIVACY.md: el nivel Menor audita tambien las LECTURAS, y Postgres no
-- dispara triggers en SELECT. Decidido en la Fase 0: las lecturas de ninos
-- pasan por funciones que consultan y registran en el mismo paso
-- (.claude/memory/project/auditoria-de-lecturas.md).
--
-- SECURITY DEFINER porque app.registrar_lectura no es ejecutable por
-- `authenticated` (asi nadie ensucia la bitacora). Como se saltan la RLS,
-- cada una filtra EXPLICITAMENTE y de forma mas estrecha que ninos_select:
--   ninos_de_mi_familia — solo los ninos de las familias de quien llama.
--   ninos_de_escuela    — todos, solo para administracion.
-- Devuelven lo minimo que usa cada pantalla.
-- =====================================================================

create or replace function public.ninos_de_mi_familia(p_escuela uuid)
returns table (id uuid, nombre text, grupo_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nino record;
begin
  if not app.es_miembro(p_escuela) then
    return;
  end if;

  for v_nino in
    select n.id, coalesce(n.nombre_preferido, n.nombre) as nombre, n.grupo_id
    from public.ninos n
    where n.escuela_id = p_escuela
      and n.egreso is null
      and n.familia_id in (select app.familias_del_usuario(p_escuela))
    order by n.fecha_nacimiento
  loop
    perform app.registrar_lectura('ninos', v_nino.id, p_escuela);
    id := v_nino.id;
    nombre := v_nino.nombre;
    grupo_id := v_nino.grupo_id;
    return next;
  end loop;
end;
$$;

revoke execute on function public.ninos_de_mi_familia(uuid) from public, anon;
grant  execute on function public.ninos_de_mi_familia(uuid) to authenticated;


create or replace function public.ninos_de_escuela(p_escuela uuid)
returns table (
  id                uuid,
  familia_id        uuid,
  grupo_id          uuid,
  nombre            text,
  apellidos         text,
  nombre_preferido  text,
  fecha_nacimiento  date
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nino record;
begin
  if not app.tiene_rol(p_escuela, array['administracion']::public.rol_escuela[]) then
    return;
  end if;

  for v_nino in
    select n.id, n.familia_id, n.grupo_id, n.nombre, n.apellidos,
           n.nombre_preferido, n.fecha_nacimiento
    from public.ninos n
    where n.escuela_id = p_escuela
      and n.egreso is null
    order by n.apellidos, n.nombre
  loop
    perform app.registrar_lectura('ninos', v_nino.id, p_escuela);
    id := v_nino.id;
    familia_id := v_nino.familia_id;
    grupo_id := v_nino.grupo_id;
    nombre := v_nino.nombre;
    apellidos := v_nino.apellidos;
    nombre_preferido := v_nino.nombre_preferido;
    fecha_nacimiento := v_nino.fecha_nacimiento;
    return next;
  end loop;
end;
$$;

revoke execute on function public.ninos_de_escuela(uuid) from public, anon;
grant  execute on function public.ninos_de_escuela(uuid) to authenticated;
