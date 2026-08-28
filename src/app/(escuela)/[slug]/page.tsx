import { notFound } from 'next/navigation'
import { escuelaPorSlug, misRoles } from '@/features/tenencia/queries/escuela'

const NOMBRE_ROL: Record<string, string> = {
  administracion: 'Administracion',
  colegio_maestros: 'Colegio de maestros',
  maestro_guia: 'Maestro guia',
  maestro_especialidad: 'Maestro de especialidad',
  comision: 'Comision',
  familia: 'Familia',
}

export default async function PaginaEscuela({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const escuela = await escuelaPorSlug(slug)

  if (!escuela) notFound()

  const roles = await misRoles(escuela.id)

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-titulo text-3xl text-tierra-800">
          {escuela.nombre}
        </h1>
        <p className="text-texto-suave">
          {roles.length
            ? roles.map((rol) => NOMBRE_ROL[rol] ?? rol).join(' / ')
            : 'Sin rol asignado'}
        </p>
      </div>

      {/*
        Fase 1 del roadmap: el ritmo. Ano escolar, epocas, festividades,
        eventos y minuta cuelgan de aqui. Ver docs/ROADMAP.md.
      */}
      <p className="rounded-organico border border-borde bg-superficie p-6 text-texto-suave">
        El calendario del ano llega en la proxima fase.
      </p>
    </div>
  )
}
