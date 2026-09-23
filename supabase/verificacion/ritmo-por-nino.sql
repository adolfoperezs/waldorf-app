-- Verificacion de 0007_ciclos_ritmo_familias.sql.
--
-- Suplanta a usuarios autenticados (`set local role authenticated` + claims),
-- porque lo que se prueba es la RLS y como postgres no se aplica.
--
-- Sin metacomandos de psql: corre igual por psql que por la API de
-- administracion de Supabase. Cada prueba es un bloque que lanza una
-- excepcion 'FALLO: ...' si no se cumple, asi que llegar al final es pasar.
-- Todo va dentro de begin ... rollback: no deja rastro.
--
-- Uso local:
--   docker exec -i supabase_db_<proyecto> psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - \
--     < supabase/verificacion/ritmo-por-nino.sql

begin;

-- Personas sinteticas. El trigger de auth crea sus perfiles.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        raw_user_meta_data, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'admin-0007@ejemplo.cl', 'x',
   '{"nombre_completo":"Administracion de Prueba"}', now(), now()),
  ('a0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'maestra-jardin-0007@ejemplo.cl', 'x',
   '{"nombre_completo":"Maestra de Jardin"}', now(), now()),
  ('a0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'maestra-basica-0007@ejemplo.cl', 'x',
   '{"nombre_completo":"Maestra de Basica"}', now(), now()),
  ('a0000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'familia-0007@ejemplo.cl', 'x',
   '{"nombre_completo":"Familia Invitada"}', now(), now()),
  ('a0000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'otra-familia-0007@ejemplo.cl', 'x',
   '{"nombre_completo":"Otra Familia"}', now(), now());

set local role authenticated;


-- === Administracion: escuela, ciclos, grupos, maestras =================

select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select set_config('prueba.escuela',
  public.crear_escuela('prueba-0007', 'Escuela de Prueba 0007')::text, true);

with c as (
  insert into public.ciclos (escuela_id, nombre, modalidad, acento, orden)
  values (current_setting('prueba.escuela')::uuid, 'Grupo Semilla', 'jardin', 'salvia', 1)
  returning id
)
select set_config('prueba.ciclo_jardin', (select id from c)::text, true);

with c as (
  insert into public.ciclos (escuela_id, nombre, modalidad, acento, orden)
  values (current_setting('prueba.escuela')::uuid, 'Basica', 'escolar', 'ocre', 2)
  returning id
)
select set_config('prueba.ciclo_escolar', (select id from c)::text, true);

with g as (
  insert into public.grupos (escuela_id, nombre, anio_cohorte, ciclo_id)
  values (current_setting('prueba.escuela')::uuid, 'Semilla', 2026,
          current_setting('prueba.ciclo_jardin')::uuid)
  returning id
)
select set_config('prueba.grupo_jardin', (select id from g)::text, true);

with g as (
  insert into public.grupos (escuela_id, nombre, anio_cohorte, ciclo_id)
  values (current_setting('prueba.escuela')::uuid, '3 basico', 2024,
          current_setting('prueba.ciclo_escolar')::uuid)
  returning id
)
select set_config('prueba.grupo_escolar', (select id from g)::text, true);

insert into public.membresias (escuela_id, perfil_id, rol)
values
  (current_setting('prueba.escuela')::uuid, 'a0000000-0000-4000-8000-000000000002', 'maestro_guia'),
  (current_setting('prueba.escuela')::uuid, 'a0000000-0000-4000-8000-000000000003', 'maestro_guia'),
  (current_setting('prueba.escuela')::uuid, 'a0000000-0000-4000-8000-000000000004', 'familia'),
  (current_setting('prueba.escuela')::uuid, 'a0000000-0000-4000-8000-000000000005', 'familia');

insert into public.grupo_maestros (escuela_id, grupo_id, perfil_id, tipo)
values
  (current_setting('prueba.escuela')::uuid, current_setting('prueba.grupo_jardin')::uuid,
   'a0000000-0000-4000-8000-000000000002', 'guia'),
  (current_setting('prueba.escuela')::uuid, current_setting('prueba.grupo_escolar')::uuid,
   'a0000000-0000-4000-8000-000000000003', 'guia');


-- === sumar_familia: familia, nino e invitacion en un paso ==============

select set_config('prueba.familia', public.sumar_familia(
  current_setting('prueba.escuela')::uuid,
  'Familia de Prueba',
  jsonb_build_array(jsonb_build_object(
    'nombre', 'Isidora', 'apellidos', 'Prueba', 'fecha_nacimiento', '2021-03-01',
    'grupo_id', current_setting('prueba.grupo_jardin'))),
  encode(sha256(convert_to('codigo-de-prueba-0007', 'UTF8')), 'hex')
)::text, true);

do $$
begin
  if (select count(*) from public.ninos_de_escuela(current_setting('prueba.escuela')::uuid)) <> 1 then
    raise exception 'FALLO: administracion no ve al nino recien sumado';
  end if;
  if (select count(*) from public.auditoria
      where tabla = 'ninos' and operacion = 'SELECT'
        and escuela_id = current_setting('prueba.escuela')::uuid) < 1 then
    raise exception 'FALLO: la lectura del nino no quedo en la auditoria';
  end if;
  if (select count(*) from public.invitaciones
      where familia_id = current_setting('prueba.familia')::uuid) <> 1 then
    raise exception 'FALLO: sumar_familia no creo la invitacion';
  end if;
end $$;

-- Una invitacion de familia solo puede ser del rol familia.
do $$
begin
  insert into public.invitaciones (escuela_id, rol, token_hash, familia_id)
  values (current_setting('prueba.escuela')::uuid, 'maestro_guia',
          encode(sha256(convert_to('otro-codigo-0007', 'UTF8')), 'hex'),
          current_setting('prueba.familia')::uuid);
  raise exception 'FALLO: se creo una invitacion de familia con rol de maestra';
exception when check_violation then null;
end $$;

-- sumar_familia sin ninos se rechaza.
do $$
begin
  perform public.sumar_familia(current_setting('prueba.escuela')::uuid, 'Vacia', '[]'::jsonb,
    encode(sha256(convert_to('vacia-0007', 'UTF8')), 'hex'));
  raise exception 'FALLO: sumar_familia acepto una familia sin ninos';
exception when invalid_parameter_value then null;
end $$;


-- === Maestra de jardin: su grupo si, el otro no ========================

select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

with r as (
  insert into public.ritmos_semanales (escuela_id, grupo_id, semana, tema)
  values (current_setting('prueba.escuela')::uuid, current_setting('prueba.grupo_jardin')::uuid,
          '2026-09-21', 'El cuento del gnomo')
  returning id
)
select set_config('prueba.ritmo', (select id from r)::text, true);

insert into public.ritmo_dias (escuela_id, ritmo_id, dia_semana, actividad, alimento)
values (current_setting('prueba.escuela')::uuid, current_setting('prueba.ritmo')::uuid,
        1, 'Panificacion', 'Arroz');

do $$
begin
  insert into public.ritmos_semanales (escuela_id, grupo_id, semana)
  values (current_setting('prueba.escuela')::uuid,
          current_setting('prueba.grupo_escolar')::uuid, '2026-09-21');
  raise exception 'FALLO: la maestra de jardin edito el ritmo de otro grupo';
exception when insufficient_privilege then null;
end $$;

do $$
begin
  insert into public.ritmos_semanales (escuela_id, grupo_id, semana)
  values (current_setting('prueba.escuela')::uuid,
          current_setting('prueba.grupo_jardin')::uuid, '2026-09-23');
  raise exception 'FALLO: se acepto una semana que no empieza en lunes';
exception when check_violation then null;
end $$;

do $$
begin
  if (select count(*) from public.ninos_de_escuela(current_setting('prueba.escuela')::uuid)) <> 0 then
    raise exception 'FALLO: una maestra lee la lista completa de ninos';
  end if;
end $$;


-- === Familia invitada: acepta y ve a su hija, no el borrador ===========

select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.ninos_de_mi_familia(current_setting('prueba.escuela')::uuid)) <> 0 then
    raise exception 'FALLO: la familia ve ninos antes de aceptar la invitacion';
  end if;

  if public.aceptar_invitacion('codigo-de-prueba-0007') <> 'prueba-0007' then
    raise exception 'FALLO: aceptar_invitacion no devolvio el slug';
  end if;

  if (select count(*) from public.ninos_de_mi_familia(current_setting('prueba.escuela')::uuid)) <> 1 then
    raise exception 'FALLO: la familia no ve a su hija despues de aceptar';
  end if;

  if not exists (select 1 from public.familia_miembros
                 where perfil_id = 'a0000000-0000-4000-8000-000000000004' and principal) then
    raise exception 'FALLO: la primera persona de la familia no quedo como principal';
  end if;

  if (select count(*) from public.ritmos_semanales) <> 0 then
    raise exception 'FALLO: la familia ve un ritmo en borrador';
  end if;
end $$;

do $$
begin
  insert into public.ritmo_dias (escuela_id, ritmo_id, dia_semana, actividad)
  values (current_setting('prueba.escuela')::uuid, current_setting('prueba.ritmo')::uuid,
          2, 'Intruso');
  raise exception 'FALLO: una familia escribio en el ritmo';
exception when insufficient_privilege then null;
end $$;


-- === La maestra publica; ahora la comunidad lo ve =======================

select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
declare n int;
begin
  update public.ritmos_semanales set publicado_en = now()
  where id = current_setting('prueba.ritmo')::uuid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALLO: la maestra no pudo publicar'; end if;
end $$;

select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);

do $$
declare n int;
begin
  if (select count(*) from public.ritmos_semanales) <> 1
     or (select count(*) from public.ritmo_dias) <> 1 then
    raise exception 'FALLO: la familia no ve el ritmo publicado';
  end if;

  update public.ritmo_dias set actividad = 'Cambiado por la familia';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLO: una familia modifico un ritmo publicado'; end if;
end $$;


-- === Otra familia: ve lo publicado, no a los ninos ajenos ===============

select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000005","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.ninos_de_mi_familia(current_setting('prueba.escuela')::uuid)) <> 0 then
    raise exception 'FALLO: una familia ve ninos de otra familia';
  end if;

  if (select count(*) from public.ritmos_semanales) <> 1 then
    raise exception 'FALLO: un miembro no ve un ritmo publicado de su escuela';
  end if;

  perform public.aceptar_invitacion('codigo-de-prueba-0007');
  raise exception 'FALLO: una invitacion usada se acepto dos veces';
exception when no_data_found then null;
end $$;


-- === Maestra de basica: no toca el grupo de jardin ======================

select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $$
declare n int;
begin
  update public.ritmos_semanales set tema = 'Intruso'
  where id = current_setting('prueba.ritmo')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLO: una maestra edito el ritmo de otro grupo'; end if;
end $$;


-- === Tenancy guard ======================================================

reset role;

do $$
begin
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relname not in ('escuelas', 'perfiles', 'auditoria')
      and not exists (select 1 from pg_attribute a
                      where a.attrelid = c.oid and a.attname = 'escuela_id' and a.attnum > 0)
  ) then raise exception 'FALLO: tabla de dominio sin escuela_id'; end if;

  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  ) then raise exception 'FALLO: tabla sin RLS'; end if;

  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and not exists (select 1 from pg_policies p
                      where p.schemaname = 'public' and p.tablename = c.relname)
  ) then raise exception 'FALLO: tabla con RLS y sin politicas'; end if;
end $$;

select 'OK: todas las pruebas de 0007 pasaron' as resultado;

rollback;
