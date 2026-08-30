-- Verificacion de las funciones de 0004_ritmo_rpc.sql.
--
-- A diferencia de integridad.sql, esta SI suplanta a un usuario autenticado
-- (`set local role authenticated` + claims JWT). Tiene que ser asi: las dos
-- funciones son `security invoker`, o sea que quien decide es la RLS, y como
-- postgres la RLS no se aplica y no se probaria nada.
--
-- Uso:
--   docker cp supabase/seed/plantillas/kimun-cl.json \
--     supabase_db_<proyecto>:/tmp/plantilla.json
--   docker exec -i supabase_db_<proyecto> psql -U postgres -d postgres -f - \
--     < supabase/verificacion/ritmo.sql

\set ON_ERROR_STOP off

-- La plantilla se lee con el shell del propio psql: pg_read_file es de
-- superusuario y aqui somos `authenticated`. La aplicacion tampoco la lee
-- desde la base: la manda como jsonb ya validado con Zod.
\set plantilla `cat /tmp/plantilla.json`

begin;

-- --- Dos personas: una sera gestora, la otra no tendra ninguna membresia ---
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        raw_user_meta_data, created_at, updated_at)
values ('11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'maestra@ejemplo.cl', 'x',
        '{"nombre_completo":"Maestra de Prueba"}'::jsonb, now(), now());

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        created_at, updated_at)
values ('22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'ajena@ejemplo.cl', 'x', now(), now());

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        created_at, updated_at)
values ('33333333-3333-3333-3333-333333333333',
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'familia@ejemplo.cl', 'x', now(), now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';


\echo ''
\echo '=== Alta de escuela y anio ==='
select public.crear_escuela('kimun', 'Escuela Waldorf Kimun') as escuela_id \gset

insert into public.anios_escolares (escuela_id, nombre, inicio, fin)
values (:'escuela_id', '2026', '2026-03-01', '2026-12-15');


\echo ''
\echo '=== activar_anio ==='
\echo 'activos antes:'
select count(*) filter (where activo) as activos from public.anios_escolares;

select public.activar_anio(id) from public.anios_escolares where nombre = '2026';

\echo 'activos despues:'
select count(*) filter (where activo) as activos from public.anios_escolares;

\echo 'activar dos veces el mismo anio no rompe:'
select public.activar_anio(id) from public.anios_escolares where nombre = '2026';
select count(*) filter (where activo) as activos from public.anios_escolares;

\echo 'un segundo anio: nunca dos activos ni cero'
insert into public.anios_escolares (escuela_id, nombre, inicio, fin)
values (:'escuela_id', '2027', '2027-03-01', '2027-12-15');
select public.activar_anio(id) from public.anios_escolares where nombre = '2027';
select nombre, activo from public.anios_escolares order by nombre;


\echo ''
\echo '=== materializar_plantilla ==='
select public.materializar_plantilla(
  (select id from public.anios_escolares where nombre = '2026'),
  :'plantilla'::jsonb
);

\echo 'epocas encadenadas y sin solapar:'
select orden, nombre, inicio, fin from public.epocas order by orden;

\echo 'festividades resueltas dentro del anio lectivo:'
select nombre, fecha, (epoca_id is not null) as anclada_a_epoca
from public.festividades order by fecha;

\echo 'minuta: 5 dias por cada epoca'
select count(*) as filas_minuta,
       count(distinct epoca_id) as epocas_con_minuta
from public.minutas;

\echo ''
\echo 'idempotencia: materializar dos veces no duplica'
select public.materializar_plantilla(
  (select id from public.anios_escolares where nombre = '2026'),
  :'plantilla'::jsonb
);
select count(*) as epocas_tras_segunda_llamada from public.epocas;


-- El id se captura AHORA, mientras la maestra aun puede verlo. Si se buscara
-- desde las sesiones de abajo, la RLS devolveria cero filas y la funcion ni se
-- llamaria: la prueba pasaria sin probar nada.
select id as anio_2026 from public.anios_escolares where nombre = '2026' \gset

-- Una familia de la escuela: es miembro, pero no gestora.
insert into public.membresias (escuela_id, perfil_id, rol)
values (:'escuela_id', '33333333-3333-3333-3333-333333333333', 'familia');


\echo ''
\echo '=== Negativo A: ajena a la escuela ==='
\echo 'espera "no existe": al ser security invoker, la RLS le oculta el anio.'
\echo 'Mejor que un 403: no revela siquiera que la escuela existe.'
savepoint ajena;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.activar_anio(:'anio_2026');
rollback to savepoint ajena;


\echo ''
\echo '=== Negativo B: miembro pero no gestor -> 42501 ==='
\echo 'Una familia SI ve el anio (es_miembro), pero no puede activarlo.'
savepoint familia;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select public.activar_anio(:'anio_2026');
rollback to savepoint familia;


\echo ''
\echo '=== Negativo C: la familia tampoco materializa la plantilla ==='
savepoint familia2;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select public.materializar_plantilla(:'anio_2026', :'plantilla'::jsonb);
rollback to savepoint familia2;

rollback;
