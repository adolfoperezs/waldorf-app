import Link from 'next/link'
import { FormularioRegistro } from '@/features/tenencia/components/formulario-registro'

export default async function PaginaRegistro({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string }>
}) {
  const { volver } = await searchParams
  const conVolver = volver ? `?volver=${encodeURIComponent(volver)}` : ''

  return (
    <div className="space-y-6">
      <h1 className="font-titulo text-2xl text-tierra-800">Crear cuenta</h1>

      <FormularioRegistro volver={volver} />

      <p className="text-sm text-texto-suave">
        Ya tienes cuenta?{' '}
        <Link href={`/login${conVolver}`} className="text-acento underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
