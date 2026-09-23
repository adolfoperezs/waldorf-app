-- =====================================================================
-- 0005 — Endurecimiento
--
-- Avisos del asesor de seguridad de Supabase al aplicar 0001-0004 en
-- produccion (2026-09-23). No cambia comportamiento; cierra dos huecos.
--
-- Un tercer aviso queda sin corregir A PROPOSITO:
-- `authenticated_security_definer_function_executable` sobre
-- public.crear_escuela. Es el unico punto del sistema que salta la RLS, y lo
-- hace porque el primer administrador de una escuela todavia no tiene
-- membresia que lo avale. Ver B1 y B2 en 0001_tenencia.sql.
-- =====================================================================


-- set_updated_at era la unica funcion de `app` sin search_path fijo. Con un
-- search_path mutable, quien pudiera crear objetos en un esquema anterior del
-- camino podria sustituir `now()` por una funcion propia y ejecutarla dentro
-- de cada trigger de updated_at.
alter function app.set_updated_at() set search_path = '';


-- btree_gist quedo en `public`, expuesto via API junto a las tablas.
--
-- Moverla no rompe las exclusion constraints de 0002 y 0003: Postgres las
-- guarda apuntando al OID de la clase de operadores, no a su nombre, y la
-- clase por defecto de un tipo se resuelve sin mirar el search_path.
-- Verificado con supabase/verificacion/integridad.sql antes de aplicarla.
alter extension btree_gist set schema extensions;
