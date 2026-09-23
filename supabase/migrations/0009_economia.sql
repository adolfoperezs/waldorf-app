-- =====================================================================
-- 0009 — Economia: lo que faltaba para que la Comision de Economia deje
-- las planillas. Blueprint: .claude/PRPs/PRP-004-economia.md
--
-- Las tablas son de 0003 (tramos, acuerdos, aportes, campanas). Aqui se
-- agrega quien ve que, y dos funciones de agregados.
--
-- Tono (waldorf-domain): es un ACUERDO, no una deuda. Nada en el esquema
-- habla de mora ni de atraso.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Que comision ve el panel economico
--
-- Es dato, no una constante: cada escuela decide cual (CLAUDE.md, regla
-- 6). La comision es mixta (familias y equipo), asi que ve AGREGADOS: el
-- dato economico de cada familia es de la administracion y de la propia
-- familia (docs/PRIVACY.md, nivel Economico).
-- ---------------------------------------------------------------------

alter table public.comisiones
  add column ve_economia boolean not null default false;

comment on column public.comisiones.ve_economia is
  'Sus integrantes ven el panel economico: agregados por mes, nunca el detalle de una familia.';

create or replace function app.ve_economia(p_escuela uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.tiene_rol(p_escuela, array['administracion']::public.rol_escuela[])
      or (
        app.es_miembro(p_escuela)
        and exists (
          select 1
          from public.comision_miembros cm
          join public.comisiones c on c.id = cm.comision_id
          where cm.perfil_id = auth.uid()
            and c.escuela_id = p_escuela
            and c.activa
            and c.ve_economia
        )
      );
$$;

revoke execute on function app.ve_economia(uuid) from public, anon;
grant  execute on function app.ve_economia(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- La rama "mi familia" exige membresia vigente, como en 0008: a quien se
-- le quita la membresia deja de ver el acuerdo y los aportes.
-- ---------------------------------------------------------------------

drop policy acuerdos_select on public.acuerdos_aporte;
create policy acuerdos_select on public.acuerdos_aporte
  for select to authenticated
  using (
    app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[])
    or (app.es_miembro(escuela_id)
        and familia_id in (select app.familias_del_usuario(escuela_id)))
  );

drop policy aportes_select on public.aportes;
create policy aportes_select on public.aportes
  for select to authenticated
  using (
    app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[])
    or (app.es_miembro(escuela_id)
        and familia_id in (select app.familias_del_usuario(escuela_id)))
  );


-- ---------------------------------------------------------------------
-- La familia registra sus propias horas
--
-- Solo horas (el dinero pasa por la cuenta de la escuela y lo registra la
-- administracion), solo de su familia, y siempre como `registrado`: la
-- administracion lo confirma o lo anula. Puede retirar lo que registro
-- mientras nadie lo haya confirmado. No puede editar: retira y vuelve a
-- registrar, y la auditoria guarda las dos cosas.
-- ---------------------------------------------------------------------

create policy aportes_familia_registra on public.aportes
  for insert to authenticated
  with check (
    moneda = 'horas'
    and estado = 'registrado'
    and registrado_por = auth.uid()
    and app.es_miembro(escuela_id)
    and familia_id in (select app.familias_del_usuario(escuela_id))
  );

create policy aportes_familia_retira on public.aportes
  for delete to authenticated
  using (
    moneda = 'horas'
    and estado = 'registrado'
    and registrado_por = auth.uid()
    and app.es_miembro(escuela_id)
    and familia_id in (select app.familias_del_usuario(escuela_id))
  );


-- ---------------------------------------------------------------------
-- resumen_economico — el panel de la comision
--
-- Por mes del anio escolar: cuanto se comprometio y cuanto se aporto, en
-- las dos monedas; horas por confirmar; cuantas familias con acuerdo hay y
-- cuantas cumplieron ese mes. Nunca que familia.
--
-- Reglas (las mismas de src/features/economia/lib/cuentas.ts):
-- - los meses van del mes de `inicio` al mes de `fin` del anio;
-- - un acuerdo compromete desde el mes de `acordado_en`;
-- - aportado = aportes `confirmado` del mes (`periodo`).
--
-- SECURITY DEFINER porque suma aportes de todas las familias, que quien
-- consulta no puede leer una por una. Por eso mismo responde solo a quien
-- app.ve_economia autoriza, y solo devuelve sumas.
-- ---------------------------------------------------------------------

create or replace function public.resumen_economico(p_anio uuid)
returns table (
  periodo              date,
  familias_con_acuerdo int,
  familias_al_dia      int,
  comprometido_dinero  numeric,
  comprometido_horas   numeric,
  aportado_dinero      numeric,
  aportado_horas       numeric,
  horas_por_confirmar  numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with anio as (
    select a.id, a.inicio, a.fin
    from public.anios_escolares a
    where a.id = p_anio
      and app.ve_economia(a.escuela_id)
  ),
  meses as (
    select generate_series(
      date_trunc('month', anio.inicio),
      date_trunc('month', anio.fin),
      interval '1 month'
    )::date as periodo
    from anio
  ),
  aportes_mes as (
    select ap.familia_id, ap.periodo,
           coalesce(sum(ap.monto) filter (where ap.moneda = 'dinero' and ap.estado = 'confirmado'), 0) as dinero,
           coalesce(sum(ap.horas) filter (where ap.moneda = 'horas' and ap.estado = 'confirmado'), 0) as horas,
           coalesce(sum(ap.horas) filter (where ap.moneda = 'horas' and ap.estado = 'registrado'), 0) as horas_pendientes
    from public.aportes ap
    join anio on anio.id = ap.anio_id
    where ap.periodo is not null
    group by ap.familia_id, ap.periodo
  ),
  compromisos as (
    select m.periodo, ac.familia_id, ac.monto_mensual, ac.horas_mensuales
    from meses m
    join public.acuerdos_aporte ac
      on ac.anio_id = p_anio
     and date_trunc('month', ac.acordado_en)::date <= m.periodo
  )
  select
    m.periodo,
    (select count(*) from compromisos c where c.periodo = m.periodo)::int,
    (select count(*)
       from compromisos c
       left join aportes_mes a on a.familia_id = c.familia_id and a.periodo = c.periodo
      where c.periodo = m.periodo
        and coalesce(a.dinero, 0) >= c.monto_mensual
        and coalesce(a.horas, 0) >= c.horas_mensuales)::int,
    coalesce((select sum(c.monto_mensual) from compromisos c where c.periodo = m.periodo), 0),
    coalesce((select sum(c.horas_mensuales) from compromisos c where c.periodo = m.periodo), 0),
    coalesce((select sum(a.dinero) from aportes_mes a where a.periodo = m.periodo), 0),
    coalesce((select sum(a.horas) from aportes_mes a where a.periodo = m.periodo), 0),
    coalesce((select sum(a.horas_pendientes) from aportes_mes a where a.periodo = m.periodo), 0)
  from meses m
  order by m.periodo;
$$;

revoke execute on function public.resumen_economico(uuid) from public, anon;
grant  execute on function public.resumen_economico(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- avance_de_campanas — cuanto lleva cada campana
--
-- La meta de una campana es de la comunidad; lo que dio cada familia, no.
-- Solo sumas de aportes confirmados, para cualquier miembro de la escuela.
-- ---------------------------------------------------------------------

create or replace function public.avance_de_campanas(p_escuela uuid)
returns table (campana_id uuid, dinero numeric, horas numeric, aportes int)
language sql
stable
security definer
set search_path = ''
as $$
  select ap.campana_id,
         coalesce(sum(ap.monto) filter (where ap.moneda = 'dinero'), 0),
         coalesce(sum(ap.horas) filter (where ap.moneda = 'horas'), 0),
         count(*)::int
  from public.aportes ap
  where ap.escuela_id = p_escuela
    and ap.campana_id is not null
    and ap.estado = 'confirmado'
    and app.es_miembro(p_escuela)
  group by ap.campana_id;
$$;

revoke execute on function public.avance_de_campanas(uuid) from public, anon;
grant  execute on function public.avance_de_campanas(uuid) to authenticated;
