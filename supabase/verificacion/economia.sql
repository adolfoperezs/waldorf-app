-- Verificacion de 0009_economia.sql y 0010_economia_campanas.sql.
--
-- Mismo formato que ritmo-por-nino.sql y privacidad.sql: sin metacomandos
-- de psql, cada prueba lanza 'FALLO: ...', todo dentro de begin ... rollback.
--
-- Uso local:
--   docker exec -i supabase_db_<proyecto> psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - \
--     < supabase/verificacion/economia.sql

begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        raw_user_meta_data, created_at, updated_at)
values
  ('c0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'admin-0009@ejemplo.cl', 'x',
   '{"nombre_completo":"Administracion 0009"}', now(), now()),
  ('c0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'familia-0009@ejemplo.cl', 'x',
   '{"nombre_completo":"Familia 0009"}', now(), now()),
  ('c0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'comision-0009@ejemplo.cl', 'x',
   '{"nombre_completo":"Comision 0009"}', now(), now()),
  ('c0000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'otra-0009@ejemplo.cl', 'x',
   '{"nombre_completo":"Otra Familia 0009"}', now(), now());

set local role authenticated;


-- === Administracion: escuela, anio, tramo, familia, acuerdo ============

select set_config('request.jwt.claims',
  '{"sub":"c0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select set_config('prueba.escuela',
  public.crear_escuela('prueba-0009', 'Escuela de Prueba 0009')::text, true);

with a as (
  insert into public.anios_escolares (escuela_id, nombre, inicio, fin)
  values (current_setting('prueba.escuela')::uuid, '2026', '2026-03-10', '2026-12-11')
  returning id
)
select set_config('prueba.anio', (select id from a)::text, true);

with t as (
  insert into public.tramos_aporte (escuela_id, anio_id, nombre, monto_sugerido, horas_sugeridas)
  values (current_setting('prueba.escuela')::uuid, current_setting('prueba.anio')::uuid,
          'Tramo B', 95000, 4)
  returning id
)
select set_config('prueba.tramo', (select id from t)::text, true);

with c as (
  insert into public.comisiones (escuela_id, nombre, ve_economia)
  values (current_setting('prueba.escuela')::uuid, 'Economia 0009', true)
  returning id
)
select set_config('prueba.comision', (select id from c)::text, true);

with c as (
  insert into public.campanas (escuela_id, anio_id, nombre, meta_monto)
  values (current_setting('prueba.escuela')::uuid, current_setting('prueba.anio')::uuid,
          'Techo del galpon', 500000)
  returning id
)
select set_config('prueba.campana', (select id from c)::text, true);

insert into public.membresias (escuela_id, perfil_id, rol)
values
  (current_setting('prueba.escuela')::uuid, 'c0000000-0000-4000-8000-000000000002', 'familia'),
  (current_setting('prueba.escuela')::uuid, 'c0000000-0000-4000-8000-000000000003', 'familia'),
  (current_setting('prueba.escuela')::uuid, 'c0000000-0000-4000-8000-000000000004', 'familia');

insert into public.comision_miembros (escuela_id, comision_id, perfil_id)
values (current_setting('prueba.escuela')::uuid, current_setting('prueba.comision')::uuid,
        'c0000000-0000-4000-8000-000000000003');

select set_config('prueba.familia', public.sumar_familia(
  current_setting('prueba.escuela')::uuid,
  'Familia 0009',
  jsonb_build_array(jsonb_build_object(
    'nombre', 'Luz', 'apellidos', 'Prueba', 'fecha_nacimiento', '2019-01-15')),
  encode(sha256(convert_to('codigo-de-prueba-0009', 'UTF8')), 'hex')
)::text, true);

-- Acuerdo desde el inicio del anio: 95.000 y 4 horas al mes.
insert into public.acuerdos_aporte (escuela_id, familia_id, anio_id, tramo_id,
                                    monto_mensual, horas_mensuales, acordado_en)
values (current_setting('prueba.escuela')::uuid, current_setting('prueba.familia')::uuid,
        current_setting('prueba.anio')::uuid, current_setting('prueba.tramo')::uuid,
        95000, 4, '2026-03-10');

-- Marzo pagado en dinero, confirmado por la administracion. Y una donacion
-- a la campana.
insert into public.aportes (escuela_id, familia_id, anio_id, moneda, monto, periodo,
                            estado, registrado_por)
values
  (current_setting('prueba.escuela')::uuid, current_setting('prueba.familia')::uuid,
   current_setting('prueba.anio')::uuid, 'dinero', 95000, '2026-03-01', 'confirmado',
   'c0000000-0000-4000-8000-000000000001');

insert into public.aportes (escuela_id, familia_id, anio_id, moneda, monto, periodo,
                            estado, campana_id, registrado_por)
values
  (current_setting('prueba.escuela')::uuid, current_setting('prueba.familia')::uuid,
   current_setting('prueba.anio')::uuid, 'dinero', 20000, '2026-03-01', 'confirmado',
   current_setting('prueba.campana')::uuid, 'c0000000-0000-4000-8000-000000000001');


-- === La familia acepta y registra sus horas ============================

select set_config('request.jwt.claims',
  '{"sub":"c0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select public.aceptar_invitacion('codigo-de-prueba-0009');

with h as (
  insert into public.aportes (escuela_id, familia_id, anio_id, moneda, horas, periodo,
                              estado, registrado_por, descripcion)
  values (current_setting('prueba.escuela')::uuid, current_setting('prueba.familia')::uuid,
          current_setting('prueba.anio')::uuid, 'horas', 4, '2026-03-01', 'registrado',
          'c0000000-0000-4000-8000-000000000002', 'Minga del huerto')
  returning id
)
select set_config('prueba.horas', (select id from h)::text, true);

do $$
begin
  if (select count(*) from public.acuerdos_aporte) <> 1
     or (select count(*) from public.aportes) <> 3 then
    raise exception 'FALLO: la familia no ve su acuerdo y sus aportes';
  end if;
  if (select count(*) from public.resumen_economico(current_setting('prueba.anio')::uuid)) <> 0 then
    raise exception 'FALLO: una familia sin comision ve el panel economico';
  end if;
  if (select dinero from public.avance_de_campanas(current_setting('prueba.escuela')::uuid)) <> 20000 then
    raise exception 'FALLO: la familia no ve el avance de la campana';
  end if;
end $$;

-- Dinero no: lo registra la administracion.
do $$
begin
  insert into public.aportes (escuela_id, familia_id, anio_id, moneda, monto, periodo,
                              estado, registrado_por)
  values (current_setting('prueba.escuela')::uuid, current_setting('prueba.familia')::uuid,
          current_setting('prueba.anio')::uuid, 'dinero', 1000, '2026-04-01', 'registrado',
          'c0000000-0000-4000-8000-000000000002');
  raise exception 'FALLO: una familia registro dinero';
exception when insufficient_privilege then null;
end $$;

-- Horas ya confirmadas tampoco: confirmar es de la administracion.
do $$
begin
  insert into public.aportes (escuela_id, familia_id, anio_id, moneda, horas, periodo,
                              estado, registrado_por)
  values (current_setting('prueba.escuela')::uuid, current_setting('prueba.familia')::uuid,
          current_setting('prueba.anio')::uuid, 'horas', 10, '2026-04-01', 'confirmado',
          'c0000000-0000-4000-8000-000000000002');
  raise exception 'FALLO: una familia se confirmo sus propias horas';
exception when insufficient_privilege then null;
end $$;

-- Ni cambiar el estado de lo que registro.
do $$
declare n int;
begin
  update public.aportes set estado = 'confirmado' where id = current_setting('prueba.horas')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLO: una familia confirmo sus horas con un UPDATE'; end if;
end $$;


-- === Otra familia: no registra a nombre ajeno ni ve nada ================

select set_config('request.jwt.claims',
  '{"sub":"c0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.aportes) <> 0 or (select count(*) from public.acuerdos_aporte) <> 0 then
    raise exception 'FALLO: una familia ve el acuerdo o los aportes de otra';
  end if;
  insert into public.aportes (escuela_id, familia_id, anio_id, moneda, horas, periodo,
                              estado, registrado_por)
  values (current_setting('prueba.escuela')::uuid, current_setting('prueba.familia')::uuid,
          current_setting('prueba.anio')::uuid, 'horas', 2, '2026-03-01', 'registrado',
          'c0000000-0000-4000-8000-000000000004');
  raise exception 'FALLO: una familia registro horas a nombre de otra';
exception when insufficient_privilege then null;
end $$;


-- === La comision ve sumas, nunca a una familia ==========================

select set_config('request.jwt.claims',
  '{"sub":"c0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $$
declare r record;
begin
  if (select count(*) from public.aportes) <> 0 or (select count(*) from public.acuerdos_aporte) <> 0 then
    raise exception 'FALLO: la comision lee aportes o acuerdos de una familia';
  end if;

  if (select count(*) from public.resumen_economico(current_setting('prueba.anio')::uuid)) <> 10 then
    raise exception 'FALLO: el anio 10-mar a 11-dic deberia tener 10 meses';
  end if;

  select * into r from public.resumen_economico(current_setting('prueba.anio')::uuid)
  where periodo = '2026-03-01';
  -- 95.000 del mes; los 20.000 de la campana son aparte (0010).
  if r.familias_con_acuerdo <> 1 or r.comprometido_dinero <> 95000 or r.comprometido_horas <> 4
     or r.aportado_dinero <> 95000 or r.aportado_horas <> 0 or r.horas_por_confirmar <> 4 then
    raise exception 'FALLO: marzo no cuadra: %', row_to_json(r);
  end if;
  -- Pago el dinero pero las horas siguen por confirmar: todavia no esta al dia.
  if r.familias_al_dia <> 0 then
    raise exception 'FALLO: una familia con horas sin confirmar cuenta como al dia';
  end if;
end $$;


-- === La administracion confirma las horas: ahora si al dia ==============

select set_config('request.jwt.claims',
  '{"sub":"c0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

update public.aportes set estado = 'confirmado' where id = current_setting('prueba.horas')::uuid;

do $$
declare r record;
begin
  select * into r from public.resumen_economico(current_setting('prueba.anio')::uuid)
  where periodo = '2026-03-01';
  if r.familias_al_dia <> 1 or r.aportado_horas <> 4 or r.horas_por_confirmar <> 0 then
    raise exception 'FALLO: marzo tras confirmar no cuadra: %', row_to_json(r);
  end if;
end $$;


-- === La familia retira lo que registro, pero no lo ya confirmado ========

select set_config('request.jwt.claims',
  '{"sub":"c0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
declare n int;
begin
  delete from public.aportes where id = current_setting('prueba.horas')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLO: la familia borro horas ya confirmadas'; end if;
end $$;


reset role;

select 'OK: todas las pruebas de 0009 pasaron' as resultado;

rollback;
