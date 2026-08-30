-- =====================================================================
-- 0004 — Ritmo: funciones
--
-- No crea tablas: 0002_ritmo.sql ya tiene anios_escolares, epocas,
-- festividades, eventos, evento_inscripciones y minutas, todas con
-- escuela_id, RLS, politicas, FK compuestas y auditoria.
--
-- Estas dos funciones existen por una sola razon: ATOMICIDAD. Son
-- secuencias de escrituras que desde el cliente serian varias llamadas, y
-- entre una y otra la escuela quedaria en un estado invalido.
--
-- Van `security invoker`, NO `security definer`. Es deliberado: un gestor
-- ya tiene permiso de escritura sobre estas tablas por RLS, asi que no hace
-- falta saltarsela. La comprobacion de `app.es_gestor` que hay dentro es
-- solo para dar un mensaje humano; quien manda de verdad sigue siendo la
-- politica de Postgres. Ver CLAUDE.md, regla 3.
-- =====================================================================


-- ---------------------------------------------------------------------
-- activar_anio
--
-- El indice unico parcial `anios_un_activo_por_escuela` impide que haya
-- dos anios activos en una escuela. Desactivar el anterior y activar el
-- nuevo son dos UPDATE que DEBEN ir juntos: hechos desde el cliente, entre
-- ambos la escuela se queda sin anio activo, y si el segundo falla se
-- queda asi para siempre.
-- ---------------------------------------------------------------------

create or replace function public.activar_anio(p_anio uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_escuela uuid;
begin
  select a.escuela_id into v_escuela
  from public.anios_escolares a
  where a.id = p_anio;

  if v_escuela is null then
    raise exception 'El anio escolar no existe' using errcode = 'P0002';
  end if;

  if not app.es_gestor(v_escuela) then
    raise exception 'No puedes configurar el ritmo de esta escuela'
      using errcode = '42501';
  end if;

  -- Primero apagar, despues encender: al reves chocaria con el indice.
  update public.anios_escolares
     set activo = false
   where escuela_id = v_escuela
     and activo
     and id <> p_anio;

  update public.anios_escolares
     set activo = true
   where id = p_anio
     and not activo;
end;
$$;

revoke execute on function public.activar_anio(uuid) from public, anon;
grant  execute on function public.activar_anio(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- materializar_plantilla
--
-- Convierte la plantilla de la escuela en filas reales de un anio.
--
-- La plantilla llega como jsonb desde la aplicacion, que ya la leyo de
-- supabase/seed/plantillas/ y la valido con Zod. La base no lee archivos.
--
-- Idempotente: si el anio ya tiene epocas, no hace nada. Materializar dos
-- veces reventaria contra la exclusion constraint de solapes, y ademas
-- duplicaria las festividades.
-- ---------------------------------------------------------------------

create or replace function public.materializar_plantilla(
  p_anio      uuid,
  p_plantilla jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_escuela   uuid;
  v_inicio    date;
  v_fin       date;
  v_cursor    date;
  v_epoca     jsonb;
  v_fest      jsonb;
  v_plato     jsonb;
  v_fin_epoca date;
  v_epoca_id  uuid;
  v_fecha     date;
  v_n_epocas  int;
  v_dias_epocas int;
  v_hueco     int;
begin
  select a.escuela_id, a.inicio, a.fin
    into v_escuela, v_inicio, v_fin
  from public.anios_escolares a
  where a.id = p_anio;

  if v_escuela is null then
    raise exception 'El anio escolar no existe' using errcode = 'P0002';
  end if;

  if not app.es_gestor(v_escuela) then
    raise exception 'No puedes configurar el ritmo de esta escuela'
      using errcode = '42501';
  end if;

  -- Idempotencia.
  if exists (select 1 from public.epocas e where e.anio_id = p_anio) then
    return;
  end if;

  -- --- Epocas ---
  -- No van pegadas al inicio del anio: se reparten a lo largo de el, con un
  -- hueco igual entre cada una. Encadenarlas sin mas dejaria la mitad del anio
  -- vacia (para Kimun, epocas de marzo a agosto en un anio que llega a
  -- diciembre), y ademas las festividades del segundo semestre no caerian
  -- dentro de ninguna epoca.
  --
  -- Los huecos son las vacaciones y los intermedios. La escuela ajusta las
  -- fechas desde aqui: esto es punto de partida, no calendario definitivo.
  select
    count(*),
    coalesce(sum((value ->> 'semanas')::int), 0) * 7
  into v_n_epocas, v_dias_epocas
  from jsonb_array_elements(coalesce(p_plantilla -> 'epocas', '[]'::jsonb));

  v_hueco := case
    when v_n_epocas = 0 then 0
    else greatest(0, ((v_fin - v_inicio + 1) - v_dias_epocas) / v_n_epocas)
  end;

  v_cursor := v_inicio;

  for v_epoca in
    select value
    from jsonb_array_elements(coalesce(p_plantilla -> 'epocas', '[]'::jsonb))
    order by (value ->> 'orden')::int
  loop
    exit when v_cursor > v_fin;

    v_fin_epoca := least(
      v_cursor + ((v_epoca ->> 'semanas')::int * 7) - 1,
      v_fin
    );

    insert into public.epocas (
      escuela_id, anio_id, nombre, orden, inicio, fin
    )
    values (
      v_escuela,
      p_anio,
      v_epoca ->> 'nombre',
      (v_epoca ->> 'orden')::int,
      v_cursor,
      v_fin_epoca
    )
    returning id into v_epoca_id;

    -- --- Minuta: el ritmo semanal se repite en cada epoca, y desde ahi
    -- --- cada escuela lo ajusta. unique (epoca_id, dia_semana).
    for v_plato in
      select value
      from jsonb_array_elements(coalesce(p_plantilla -> 'minuta', '[]'::jsonb))
    loop
      insert into public.minutas (escuela_id, epoca_id, dia_semana, plato, notas)
      values (
        v_escuela,
        v_epoca_id,
        (v_plato ->> 'dia_semana')::int,
        v_plato ->> 'plato',
        v_plato ->> 'notas'
      );
    end loop;

    v_cursor := v_fin_epoca + 1 + v_hueco;
  end loop;

  -- --- Festividades ---
  -- La plantilla las guarda como mes/dia, no como fecha: se resuelven
  -- contra este anio escolar. En el hemisferio norte el anio lectivo cruza
  -- el cambio de anio civil (septiembre a junio), asi que hay que probar
  -- los dos anios civiles antes de rendirse.
  for v_fest in
    select value
    from jsonb_array_elements(coalesce(p_plantilla -> 'festividades', '[]'::jsonb))
  loop
    v_fecha := null;

    begin
      v_fecha := make_date(
        extract(year from v_inicio)::int,
        (v_fest ->> 'mes')::int,
        (v_fest ->> 'dia')::int
      );
      if v_fecha < v_inicio then
        v_fecha := make_date(
          extract(year from v_fin)::int,
          (v_fest ->> 'mes')::int,
          (v_fest ->> 'dia')::int
        );
      end if;
    exception when others then
      -- Un 29 de febrero en anio no bisiesto, por ejemplo.
      v_fecha := null;
    end;

    -- Fuera del anio lectivo no se materializa. Las fiestas moviles, como
    -- Pascua de Resurreccion, quedan para ajuste manual: no se pueden fijar
    -- por mes y dia.
    continue when v_fecha is null or v_fecha < v_inicio or v_fecha > v_fin;

    insert into public.festividades (
      escuela_id, anio_id, epoca_id, nombre, descripcion, fecha
    )
    values (
      v_escuela,
      p_anio,
      -- Cuelga de la epoca de escuela en la que cae, si cae en alguna.
      (
        select e.id
        from public.epocas e
        where e.anio_id = p_anio
          and e.grupo_id is null
          and v_fecha between e.inicio and e.fin
        limit 1
      ),
      v_fest ->> 'nombre',
      v_fest ->> 'descripcion',
      v_fecha
    );
  end loop;
end;
$$;

revoke execute on function public.materializar_plantilla(uuid, jsonb) from public, anon;
grant  execute on function public.materializar_plantilla(uuid, jsonb) to authenticated;
