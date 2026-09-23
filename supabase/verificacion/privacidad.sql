-- Verificacion de 0008_privacidad.sql (discrepancias P1 y P2 de docs/MAPA.md).
--
-- Mismo formato que ritmo-por-nino.sql: sin metacomandos de psql, cada
-- prueba lanza 'FALLO: ...', todo dentro de begin ... rollback.
--
-- Uso local:
--   docker exec -i supabase_db_<proyecto> psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - \
--     < supabase/verificacion/privacidad.sql

begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        raw_user_meta_data, created_at, updated_at)
values
  ('b0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'admin-0008@ejemplo.cl', 'x',
   '{"nombre_completo":"Administracion 0008"}', now(), now()),
  ('b0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'colegio-0008@ejemplo.cl', 'x',
   '{"nombre_completo":"Colegio 0008"}', now(), now()),
  ('b0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'maestra-0008@ejemplo.cl', 'x',
   '{"nombre_completo":"Maestra 0008"}', now(), now()),
  ('b0000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'familia-0008@ejemplo.cl', 'x',
   '{"nombre_completo":"Familia 0008"}', now(), now()),
  ('b0000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'otra-0008@ejemplo.cl', 'x',
   '{"nombre_completo":"Otra Familia 0008"}', now(), now());

set local role authenticated;


-- === Administracion arma la escuela ====================================

select set_config('request.jwt.claims',
  '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select set_config('prueba.escuela',
  public.crear_escuela('prueba-0008', 'Escuela de Prueba 0008')::text, true);

with g as (
  insert into public.grupos (escuela_id, nombre, anio_cohorte)
  values (current_setting('prueba.escuela')::uuid, 'Grupo 0008', 2024)
  returning id
)
select set_config('prueba.grupo', (select id from g)::text, true);

insert into public.membresias (escuela_id, perfil_id, rol)
values
  (current_setting('prueba.escuela')::uuid, 'b0000000-0000-4000-8000-000000000002', 'colegio_maestros'),
  (current_setting('prueba.escuela')::uuid, 'b0000000-0000-4000-8000-000000000003', 'maestro_guia'),
  (current_setting('prueba.escuela')::uuid, 'b0000000-0000-4000-8000-000000000004', 'familia'),
  (current_setting('prueba.escuela')::uuid, 'b0000000-0000-4000-8000-000000000005', 'familia');

insert into public.grupo_maestros (escuela_id, grupo_id, perfil_id, tipo)
values (current_setting('prueba.escuela')::uuid, current_setting('prueba.grupo')::uuid,
        'b0000000-0000-4000-8000-000000000003', 'guia');

select set_config('prueba.familia', public.sumar_familia(
  current_setting('prueba.escuela')::uuid,
  'Familia 0008',
  jsonb_build_array(jsonb_build_object(
    'nombre', 'Mateo', 'apellidos', 'Prueba', 'fecha_nacimiento', '2018-04-02',
    'grupo_id', current_setting('prueba.grupo'))),
  encode(sha256(convert_to('codigo-de-prueba-0008', 'UTF8')), 'hex')
)::text, true);

do $$
declare n int;
begin
  if (select count(*) from public.contactos_de_escuela(current_setting('prueba.escuela')::uuid)
      where email like '%-0008@ejemplo.cl') <> 5 then
    raise exception 'FALLO: administracion no ve los contactos de su escuela';
  end if;

  if (select count(*) from public.perfiles where nombre_completo like '%0008') <> 5 then
    raise exception 'FALLO: administracion no ve los nombres de sus miembros';
  end if;

  -- Un UPDATE por id sigue funcionando sin poder leer el nombre del nino.
  update public.ninos set grupo_id = current_setting('prueba.grupo')::uuid
  where familia_id = current_setting('prueba.familia')::uuid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALLO: administracion no puede actualizar un nino'; end if;
end $$;


-- === La familia acepta su invitacion ===================================

select set_config('request.jwt.claims',
  '{"sub":"b0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);

do $$
begin
  perform public.aceptar_invitacion('codigo-de-prueba-0008');

  if (select count(*) from public.ninos_de_mi_familia(current_setting('prueba.escuela')::uuid)) <> 1 then
    raise exception 'FALLO: la familia no ve a su hijo por la funcion auditada';
  end if;
  if (select count(*) from public.familias) <> 1 then
    raise exception 'FALLO: la familia no ve su propia familia';
  end if;
  if (select count(*) from public.perfiles where nombre_completo like '%0008') <> 1 then
    raise exception 'FALLO: una familia ve perfiles de otros miembros';
  end if;
end $$;

-- Ni siquiera su propio correo por la API: sale de la sesion, no de la tabla.
do $$
begin
  perform email from public.perfiles
  where id = 'b0000000-0000-4000-8000-000000000004';
  raise exception 'FALLO: el correo sigue legible por la API';
exception when insufficient_privilege then null;
end $$;

-- El nombre del nino tampoco, aunque sea su hijo: va por ninos_de_mi_familia.
do $$
begin
  perform nombre from public.ninos;
  raise exception 'FALLO: el nombre de un nino se lee directo de la tabla';
exception when insufficient_privilege then null;
end $$;


-- === P1: el colegio de maestros ya no ve familias ni ninos ==============

select set_config('request.jwt.claims',
  '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.familias) <> 0
     or (select count(*) from public.familia_miembros) <> 0
     or (select count(*) from public.ninos) <> 0 then
    raise exception 'FALLO: el colegio de maestros ve familias o ninos';
  end if;
  if (select count(*) from public.contactos_de_escuela(current_setting('prueba.escuela')::uuid)) <> 0 then
    raise exception 'FALLO: el colegio de maestros ve contactos';
  end if;
  -- Nombres si: organiza grupos y jornadas.
  if (select count(*) from public.perfiles where nombre_completo like '%0008') <> 5 then
    raise exception 'FALLO: el colegio de maestros no ve los nombres de la comunidad';
  end if;
end $$;


-- === La maestra ve que su grupo tiene un nino, no quien es ==============

select set_config('request.jwt.claims',
  '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.ninos) <> 1 then
    raise exception 'FALLO: la maestra no ve la fila del nino de su grupo';
  end if;
  if (select count(*) from public.familias) <> 0 then
    raise exception 'FALLO: la maestra ve familias';
  end if;
  if (select count(*) from public.perfiles where nombre_completo like '%0008') <> 1 then
    raise exception 'FALLO: la maestra ve perfiles de otros miembros';
  end if;
end $$;


-- === Otra familia: nada de la primera ===================================

select set_config('request.jwt.claims',
  '{"sub":"b0000000-0000-4000-8000-000000000005","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.ninos) <> 0
     or (select count(*) from public.familias) <> 0
     or (select count(*) from public.ninos_de_mi_familia(current_setting('prueba.escuela')::uuid)) <> 0 then
    raise exception 'FALLO: una familia ve datos de otra';
  end if;
  if (select count(*) from public.perfiles where nombre_completo like '%0008') <> 1 then
    raise exception 'FALLO: una familia lista a la comunidad';
  end if;
end $$;


-- === Una familia dada de baja deja de ver a los ninos ===================

select set_config('request.jwt.claims',
  '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

update public.membresias set activa = false
where perfil_id = 'b0000000-0000-4000-8000-000000000004'
  and escuela_id = current_setting('prueba.escuela')::uuid;

select set_config('request.jwt.claims',
  '{"sub":"b0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.ninos) <> 0 or (select count(*) from public.familias) <> 0 then
    raise exception 'FALLO: una familia sin membresia sigue viendo a sus ninos';
  end if;
end $$;


reset role;

select 'OK: todas las pruebas de 0008 pasaron' as resultado;

rollback;
