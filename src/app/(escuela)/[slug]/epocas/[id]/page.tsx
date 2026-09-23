import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ContextoEscuela } from '@/features/ritmo/actions/contexto'
import { actualizarEpoca } from '@/features/ritmo/actions/epoca'
import { guardarMinuta } from '@/features/ritmo/actions/minuta'
import { FormularioEditarEpoca } from '@/features/ritmo/components/formulario-editar-epoca'
import { FormularioMinuta } from '@/features/ritmo/components/formulario-minuta'
import { CopiarParaWhatsapp } from '@/shared/ui/copiar-para-whatsapp'
import { textoEpoca } from '@/features/ritmo/lib/exportar-whatsapp'
import { gruposDeEscuela } from '@/features/ritmo/queries/grupos'
import { epocaPorId, minutaDeEpoca } from '@/features/ritmo/queries/ritmo'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'
import { Tarjeta } from '@/shared/ui/tarjeta'

const URL_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default async function PaginaEpoca({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const { escuela, esGestor } = await cargarEscuela(slug)
  if (!esGestor) notFound()

  const epoca = await epocaPorId(id)
  if (!epoca) notFound()

  const ctx: ContextoEscuela = {
    escuelaId: escuela.id,
    slug: escuela.slug,
    zonaHoraria: escuela.zona_horaria,
  }

  const [minuta, grupos] = await Promise.all([
    minutaDeEpoca(epoca.id),
    gruposDeEscuela(escuela.id),
  ])

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <Link href={`/${slug}/epocas`} className="text-sm text-acento underline">
          Volver a las epocas
        </Link>
        <h1 className="font-titulo text-3xl text-tierra-800">{epoca.nombre}</h1>
      </header>

      <section className="space-y-4">
        <h2 className="font-titulo text-xl text-tierra-700">La epoca</h2>
        <Tarjeta>
          <FormularioEditarEpoca
            accion={actualizarEpoca.bind(null, ctx, epoca.id)}
            epoca={epoca}
            grupos={grupos}
          />
        </Tarjeta>
      </section>

      <section className="space-y-4">
        <h2 className="font-titulo text-xl text-tierra-700">Minuta</h2>
        <p className="text-texto-suave">
          El ritmo semanal de esta epoca. Cambia con ella, no con el mes.
        </p>
        <Tarjeta>
          <FormularioMinuta
            accion={guardarMinuta.bind(null, ctx, epoca.id)}
            minuta={minuta}
          />
        </Tarjeta>
      </section>

      <section className="space-y-4">
        <h2 className="font-titulo text-xl text-tierra-700">Para pegar en el grupo</h2>
        <CopiarParaWhatsapp texto={textoEpoca(epoca, escuela, URL_BASE)} />
      </section>
    </div>
  )
}
