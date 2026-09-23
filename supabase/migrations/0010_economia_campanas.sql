-- =====================================================================
-- 0010 — El dinero de las campanas no completa el acuerdo
--
-- En 0009, resumen_economico sumaba al acuerdo mensual TODO el dinero
-- confirmado del mes, incluidas las donaciones a una campana. Una familia
-- que dona para el techo del galpon quedaba "al dia" sin haber hecho su
-- aporte mensual, y el panel sobrestimaba el cumplimiento.
--
-- Regla corregida (la misma en src/features/economia/lib/cuentas.ts):
-- - dinero con campana_id: cuenta para la campana, no para el acuerdo;
-- - horas: cuentan para el acuerdo sean de una comision o de una campana.
--   El trabajo comunitario es trabajo comunitario.
--
-- Mismo nombre, firma y retorno: create or replace basta.
-- =====================================================================

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
           -- El dinero de una campana es aparte del acuerdo: una donacion para el
           -- techo no completa el aporte mensual. Las horas si cuentan.
           coalesce(sum(ap.monto) filter (where ap.moneda = 'dinero' and ap.estado = 'confirmado'
                                                  and ap.campana_id is null), 0) as dinero,
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
