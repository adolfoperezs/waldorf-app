import Link from 'next/link'
import { aceptarInvitacion } from '@/features/tenencia/actions/invitaciones'
import { cerrarSesion } from '@/features/tenencia/actions/auth'
import { DESCRIPCION_ROL, NOMBRE_ROL } from '@/features/tenencia/lib/roles'
import { verInvitacion } from '@/features/tenencia/queries/miembros'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { Boton } from '@/shared/ui/boton'
import { BotonAccion } from '@/shared/ui/boton-accion'

/**
 * Donde aterriza quien recibe una invitacion por WhatsApp.
 *
 * Es publica (ver proxy.ts): sin sesion no consulta nada, solo invita a crear
 * cuenta o entrar, y conserva el enlace en `volver` para regresar aqui. Con
 * sesion, pregunta a ver_invitacion, que solo esta abierta a `authenticated`.
 */
export default async function PaginaInvitacion({
  params,
}: {
  params: Promise<{ codigo: string }>
}) {
  const { codigo } = await params
  const volver = encodeURIComponent(`/invitacion/${codigo}`)

  const supabase = await crearClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="font-titulo text-2xl text-tierra-800">
          Te invitaron a una escuela
        </h1>
        <p className="text-texto-suave">
          Para aceptar, crea tu cuenta o entra con la que ya tienes. Despues
          vuelves aqui solo.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/signup?volver=${volver}`}>
            <Boton>Crear mi cuenta</Boton>
          </Link>
          <Link href={`/login?volver=${volver}`}>
            <Boton variante="suave">Ya tengo cuenta</Boton>
          </Link>
        </div>
      </div>
    )
  }

  const invitacion = await verInvitacion(codigo)

  if (!invitacion) {
    return (
      <Aviso titulo="Este enlace no es valido">
        Revisa que lo hayas copiado completo, o pide a la escuela uno nuevo.
      </Aviso>
    )
  }

  if (invitacion.estado === 'usada') {
    return (
      <Aviso titulo="Esta invitacion ya se uso">
        Si fuiste tu,{' '}
        <Link href={`/${invitacion.escuela_slug}`} className="text-acento underline">
          entra a {invitacion.escuela_nombre}
        </Link>
        .
      </Aviso>
    )
  }

  if (invitacion.estado !== 'vigente') {
    return (
      <Aviso titulo={invitacion.estado === 'expirada' ? 'Esta invitacion caduco' : 'Esta invitacion fue revocada'}>
        Pide a {invitacion.escuela_nombre} un enlace nuevo.
      </Aviso>
    )
  }

  if (!invitacion.correo_coincide) {
    return (
      <div className="space-y-6">
        <h1 className="font-titulo text-2xl text-tierra-800">
          Esta invitacion es para otro correo
        </h1>
        <p className="text-texto-suave">
          Entraste como {user.email}. Sal y entra con el correo al que te
          invitaron.
        </p>
        <form action={cerrarSesion}>
          <Boton type="submit" variante="suave">
            Salir
          </Boton>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="font-titulo text-2xl text-tierra-800">
        {invitacion.escuela_nombre}
      </h1>
      <p>
        Te invita a unirte como <strong>{NOMBRE_ROL[invitacion.rol]}</strong>.
      </p>
      <p className="text-sm text-texto-suave">{DESCRIPCION_ROL[invitacion.rol]}</p>
      <BotonAccion accion={aceptarInvitacion.bind(null, codigo)} variante="primario">
        Aceptar y entrar
      </BotonAccion>
    </div>
  )
}

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h1 className="font-titulo text-2xl text-tierra-800">{titulo}</h1>
      <p className="text-texto-suave">{children}</p>
    </div>
  )
}
