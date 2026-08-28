-- Verificacion de las correcciones B3, B4 y H9.
--
-- Corre como superusuario (postgres), es decir SIN RLS. Eso es a proposito:
-- comprueba que la INTEGRIDAD del esquema aguanta aunque la RLS no filtre.
-- Si esto se sostiene sin RLS, con RLS tambien.
--
-- El aislamiento entre usuarios se prueba aparte, en tests/aislamiento.spec.ts.
--
-- Cada caso que debe fallar va en su propio savepoint: un error aborta la
-- transaccion entera y sin savepoints solo se probaria el primero.
--
-- Uso:
--   docker exec -i supabase_db_<proyecto> psql -U postgres -d postgres -f - \
--     < supabase/verificacion/integridad.sql

\set ON_ERROR_STOP off

begin;

insert into public.escuelas (slug, nombre) values ('escuela-a', 'Escuela A');
insert into public.escuelas (slug, nombre) values ('escuela-b', 'Escuela B');

insert into public.anios_escolares (escuela_id, nombre, inicio, fin)
select id, '2026', '2026-03-01', '2026-12-15'
from public.escuelas where slug in ('escuela-a', 'escuela-b');

insert into public.familias (escuela_id, nombre)
select id, 'Familia B' from public.escuelas where slug = 'escuela-b';


\echo ''
\echo '=== B3.1  Epoca de A colgada del anio de A  ->  debe FUNCIONAR ==='
savepoint s1;
insert into public.epocas (escuela_id, anio_id, nombre, inicio, fin)
select
  (select id from public.escuelas where slug = 'escuela-a'),
  (select a.id from public.anios_escolares a
     join public.escuelas e on e.id = a.escuela_id where e.slug = 'escuela-a'),
  'Numeros', '2026-03-02', '2026-03-27';


\echo ''
\echo '=== B3.2  Epoca de A colgada del anio de B  ->  debe FALLAR 23503 ==='
savepoint s2;
insert into public.epocas (escuela_id, anio_id, nombre, inicio, fin)
select
  (select id from public.escuelas where slug = 'escuela-a'),
  (select a.id from public.anios_escolares a
     join public.escuelas e on e.id = a.escuela_id where e.slug = 'escuela-b'),
  'Epoca robada', '2026-04-06', '2026-05-01';
rollback to savepoint s2;


\echo ''
\echo '=== B3.3  Nino de A en familia de B  ->  debe FALLAR 23503 ==='
savepoint s3;
insert into public.ninos (escuela_id, familia_id, nombre, apellidos, fecha_nacimiento)
select
  (select id from public.escuelas where slug = 'escuela-a'),
  (select f.id from public.familias f
     join public.escuelas e on e.id = f.escuela_id where e.slug = 'escuela-b'),
  'Nombre', 'Apellido', '2018-05-04';
rollback to savepoint s3;


\echo ''
\echo '=== H9  Dos epocas de escuela solapadas  ->  debe FALLAR 23P01 ==='
savepoint s4;
insert into public.epocas (escuela_id, anio_id, nombre, inicio, fin)
select
  (select id from public.escuelas where slug = 'escuela-a'),
  (select a.id from public.anios_escolares a
     join public.escuelas e on e.id = a.escuela_id where e.slug = 'escuela-a'),
  'Solapada', '2026-03-20', '2026-04-10';
rollback to savepoint s4;


\echo ''
\echo '=== H11  Aporte con periodo que no cae dia 1  ->  debe FALLAR 23514 ==='
savepoint s5;
insert into public.aportes (escuela_id, familia_id, anio_id, moneda, monto, periodo)
select
  (select id from public.escuelas where slug = 'escuela-b'),
  (select f.id from public.familias f
     join public.escuelas e on e.id = f.escuela_id where e.slug = 'escuela-b'),
  (select a.id from public.anios_escolares a
     join public.escuelas e on e.id = a.escuela_id where e.slug = 'escuela-b'),
  'dinero', 50000, '2026-04-15';
rollback to savepoint s5;


\echo ''
\echo '=== B4  Auditoria de escuelas: escuela_id no debe ser nulo ==='
select
  tabla,
  operacion,
  (escuela_id is not null)   as tiene_escuela_id,
  (escuela_id = registro_id) as apunta_a_si_misma
from public.auditoria
where tabla = 'public.escuelas'
order by id;

rollback;
