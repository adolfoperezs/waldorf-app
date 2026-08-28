-- Las tres consultas de .claude/skills/tenancy-guard/SKILL.md
-- Las tres deben devolver CERO filas. Correr despues de cada migracion.

\echo '== 1. Tablas de dominio sin escuela_id =='
select c.relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and c.relname not in ('escuelas','perfiles','auditoria')
  and not exists (
    select 1 from pg_attribute a
    where a.attrelid = c.oid and a.attname = 'escuela_id' and a.attnum > 0
  );

\echo '== 2. Tablas sin RLS =='
select relname from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

\echo '== 3. Tablas con RLS pero sin politicas =='
select c.relname from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  and not exists (select 1 from pg_policies p where p.tablename = c.relname);
