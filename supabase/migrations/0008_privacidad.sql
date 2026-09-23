-- =====================================================================
-- 0008 — Privacidad: las discrepancias P1 y P2 de docs/MAPA.md
--
-- Lo que el sistema hacia y docs/PRIVACY.md no permite:
--
-- P1  El colegio de maestros veia TODAS las familias y TODOS los ninos,
--     porque las politicas usaban es_gestor (administracion + colegio).
--     PRIVACY.md: ninos (nivel Menor) los ve administracion, el maestro
--     del grupo y su familia; familias (Personal), administracion y el
--     propio titular.
--
-- P2  Cualquier miembro leia nombre, correo y telefono de todos los demas
--     (perfiles_select_companeros). Una familia podia ver el telefono de
--     otra.
--
-- Y un hueco conocido desde 0007: la app lee ninos solo por funciones que
-- registran la lectura, pero la tabla seguia legible entera por la API y
-- esas lecturas no se auditaban.
--
-- Herramienta: privilegios POR COLUMNA ademas de la RLS. La RLS decide que
-- filas; la columna decide que datos de esas filas. Los identificadores
-- siguen visibles (hacen falta para filtrar, actualizar y probar el
-- aislamiento); nombres, fechas y contactos pasan por funciones.
-- =====================================================================


-- ---------------------------------------------------------------------
-- P1 — familias, sus integrantes y ninos
--
-- De paso: la relacion familiar sola ya no alcanza, hace falta ademas una
-- membresia vigente. Sin eso, a quien se le quita la membresia seguiria
-- viendo a los ninos mientras su fila de familia_miembros existiera.
-- ---------------------------------------------------------------------

drop policy familias_select on public.familias;
create policy familias_select on public.familias
  for select to authenticated
  using (
    app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[])
    or (app.es_miembro(escuela_id)
        and id in (select app.familias_del_usuario(escuela_id)))
  );

drop policy familia_miembros_select on public.familia_miembros;
create policy familia_miembros_select on public.familia_miembros
  for select to authenticated
  using (
    app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[])
    or (app.es_miembro(escuela_id)
        and familia_id in (select app.familias_del_usuario(escuela_id)))
  );

drop policy ninos_select on public.ninos;
create policy ninos_select on public.ninos
  for select to authenticated
  using (
    app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[])
    or (grupo_id is not null
        and app.es_miembro(escuela_id)
        and app.es_maestro_de_grupo(grupo_id))
    or (app.es_miembro(escuela_id)
        and familia_id in (select app.familias_del_usuario(escuela_id)))
  );

-- Los datos del nino (nombre, apellidos, fecha de nacimiento...) ya no se
-- leen por la API: solo por ninos_de_mi_familia y ninos_de_escuela, que
-- registran cada lectura (docs/PRIVACY.md, nivel Menor). Quedan legibles
-- los identificadores, que no dicen nada de nadie y hacen falta para que
-- un UPDATE ... WHERE id = ... funcione.
revoke select on public.ninos from authenticated;
grant select (id, escuela_id, familia_id, grupo_id) on public.ninos to authenticated;


-- ---------------------------------------------------------------------
-- P2 — perfiles
--
-- Filas: una persona ve su propio perfil, los gestores ven a quienes son
-- miembros de su escuela (organizar un grupo o una jornada exige saber
-- quien es quien), y los integrantes de una misma familia se ven entre si.
-- Una familia ya no puede listar a toda la comunidad.
--
-- Columnas: el correo y el telefono dejan de leerse por la API, incluso el
-- propio. La administracion los obtiene con contactos_de_escuela.
-- ---------------------------------------------------------------------

create or replace function app.puede_ver_perfil(p_perfil uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_perfil = auth.uid()
      or exists (
        select 1 from public.membresias m
        where m.perfil_id = p_perfil
          and m.activa
          and app.es_gestor(m.escuela_id)
      )
      or exists (
        select 1
        from public.familia_miembros yo
        join public.familia_miembros otro on otro.familia_id = yo.familia_id
        where yo.perfil_id = auth.uid()
          and otro.perfil_id = p_perfil
          and app.es_miembro(yo.escuela_id)
      );
$$;

revoke execute on function app.puede_ver_perfil(uuid) from public, anon;
grant  execute on function app.puede_ver_perfil(uuid) to authenticated;

drop policy perfiles_select_companeros on public.perfiles;
create policy perfiles_select_escuela on public.perfiles
  for select to authenticated
  using (app.puede_ver_perfil(id));

revoke select on public.perfiles from authenticated;
grant select (id, nombre_completo, created_at, updated_at) on public.perfiles to authenticated;


-- Correo y telefono de los miembros de una escuela, para su administracion.
-- SECURITY DEFINER porque la columna ya no es legible por `authenticated`;
-- por eso mismo exige administracion de forma explicita.
create or replace function public.contactos_de_escuela(p_escuela uuid)
returns table (perfil_id uuid, email text, telefono text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct p.id, p.email, p.telefono
  from public.perfiles p
  join public.membresias m
    on m.perfil_id = p.id and m.escuela_id = p_escuela and m.activa
  where app.tiene_rol(p_escuela, array['administracion']::public.rol_escuela[]);
$$;

revoke execute on function public.contactos_de_escuela(uuid) from public, anon;
grant  execute on function public.contactos_de_escuela(uuid) to authenticated;
