import Link from 'next/link'
import { FormularioLogin } from '@/features/tenencia/components/formulario-login'

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string }>
}) {
  const { volver } = await searchParams
  const conVolver = volver ? `?volver=${encodeURIComponent(volver)}` : ''

  return (
    <div className="space-y-6">
      <h1 className="font-titulo text-2xl text-tierra-800">Entrar</h1>

      <FormularioLogin volver={volver} />

      <p className="text-sm text-texto-suave">
        Todavia no tienes cuenta?{' '}
        <Link href={`/signup${conVolver}`} className="text-acento underline">
          Crear una
        </Link>
      </p>
    </div>
  )
}
