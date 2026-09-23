-- =====================================================================
-- 0006 — Invitaciones
--
-- Hasta aqui solo quien creaba la escuela podia usarla: membresias exige ser
-- administracion para insertar, y la persona invitada todavia no lo es.
--
-- Invitacion por ENLACE, no por correo. Enviar correo exigiria la
-- service_role (prohibida en rutas de usuario) y un proveedor SMTP propio.
-- La administracion recibe un enlace y lo manda por WhatsApp, que es donde
-- la comunidad ya vive (docs/ARCHITECTURE.md).
--
-- Seguridad del enlace:
-- - La base guarda la huella SHA-256 del codigo, nunca el codigo. Leer la
--   tabla no permite usar una invitacion.
-- - Un solo uso, caduca a los 7 dias, revocable.
-- - Si lleva correo, solo lo acepta quien entre con ese correo.
--
-- Clasificacion: personal (puede llevar correo). Ver docs/PRIVACY.md.
-- =====================================================================

create table public.invitaciones (
  id            uuid primary key default gen_random_uuid(),
  escuela_id    uuid not null references public.escuelas(id) on delete cascade,
  rol           public.rol_escuela not null,
  email         text
                  check (email is null or (email = lower(btrim(email))
                                           and email ~ '^[^@[:space:]]+@[^@[:space:]]+$')),
  token_hash    text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  creada_por    uuid references public.perfiles(id) on delete set null,
  expira_en     timestamptz not null default now() + interval '7 days',
  aceptada_por  uuid references public.perfiles(id) on delete set null,
  aceptada_en   timestamptz,
  revocada_en   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (aceptada_en is null or revocada_en is null)
);

comment on table public.invitaciones is
  'Invitacion por enlace a una escuela. Guarda la huella del codigo, nunca el codigo. Clasificacion: personal.';

create index invitaciones_pendientes_idx
  on public.invitaciones (escuela_id, created_at desc)
  where aceptada_en is null and revocada_en is null;

create trigger invitaciones_updated_at
  before update on public.invitaciones
  for each row execute function app.set_updated_at();

alter table public.invitaciones enable row level security;
revoke all on public.invitaciones from anon;
grant select, insert, update, delete on public.invitaciones to authenticated;

-- Solo administracion: es la misma regla que membresias_admin. Invitar es
-- conceder una membresia por adelantado.
create policy invitaciones_admin on public.invitaciones
  for all to authenticated
  using (app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[]))
  with check (app.tiene_rol(escuela_id, array['administracion']::public.rol_escuela[]));

create trigger invitaciones_auditoria
  after insert or update or delete on public.invitaciones
  for each row execute function app.auditar('completo');


-- ---------------------------------------------------------------------
-- ver_invitacion
--
-- Lo que la persona invitada ve ANTES de aceptar: que escuela, que rol, si
-- sigue vigente y si el correo con el que entro es el correcto. Nunca el
-- correo de la invitacion.
--
-- SECURITY DEFINER porque quien pregunta todavia no es miembro y la RLS de
-- invitaciones no le deja leer la fila. Solo para `authenticated`: sin sesion
-- no hay nada que ver, y asi no queda ninguna funcion definer abierta a anon.
-- ---------------------------------------------------------------------

create or replace function public.ver_invitacion(p_token text)
returns table (
  escuela_nombre  text,
  escuela_slug    text,
  rol             public.rol_escuela,
  estado          text,
  requiere_correo boolean,
  correo_coincide boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.nombre,
    e.slug,
    i.rol,
    case
      when i.revocada_en is not null then 'revocada'
      when i.aceptada_en is not null then 'usada'
      when i.expira_en <= now()       then 'expirada'
      else 'vigente'
    end,
    i.email is not null,
    i.email is null
      or i.email = (select lower(u.email) from auth.users u where u.id = auth.uid())
  from public.invitaciones i
  join public.escuelas e on e.id = i.escuela_id
  where i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and auth.uid() is not null;
$$;

revoke execute on function public.ver_invitacion(text) from public, anon;
grant  execute on function public.ver_invitacion(text) to authenticated;


-- ---------------------------------------------------------------------
-- aceptar_invitacion
--
-- El segundo punto del sistema que se salta la RLS, y por la misma razon
-- que crear_escuela: quien acepta todavia no es miembro, y membresias_admin
-- exige ser administracion para insertar.
--
-- `for update` bloquea la fila: dos aceptaciones simultaneas del mismo
-- enlace no pueden consumirlo dos veces.
--
-- Si la persona ya tenia esa membresia y se la habian quitado, se reactiva.
-- ---------------------------------------------------------------------

create or replace function public.aceptar_invitacion(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor  uuid := auth.uid();
  v_correo text;
  v_inv    public.invitaciones%rowtype;
  v_slug   text;
begin
  if v_actor is null then
    raise exception 'Se requiere una sesion iniciada' using errcode = '42501';
  end if;

  select * into v_inv
  from public.invitaciones i
  where i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
  for update;

  if not found
     or v_inv.revocada_en is not null
     or v_inv.aceptada_en is not null
     or v_inv.expira_en <= now() then
    raise exception 'La invitacion no es valida, ya se uso o caduco'
      using errcode = 'P0002';
  end if;

  if v_inv.email is not null then
    select lower(u.email) into v_correo from auth.users u where u.id = v_actor;
    if v_correo is distinct from v_inv.email then
      raise exception 'Esta invitacion es para otra direccion de correo'
        using errcode = '42501';
    end if;
  end if;

  insert into public.membresias (escuela_id, perfil_id, rol)
  values (v_inv.escuela_id, v_actor, v_inv.rol)
  on conflict (escuela_id, perfil_id, rol)
  do update set activa = true, hasta = null;

  update public.invitaciones
     set aceptada_por = v_actor,
         aceptada_en  = now()
   where id = v_inv.id;

  select e.slug into v_slug from public.escuelas e where e.id = v_inv.escuela_id;
  return v_slug;
end;
$$;

revoke execute on function public.aceptar_invitacion(text) from public, anon;
grant  execute on function public.aceptar_invitacion(text) to authenticated;
