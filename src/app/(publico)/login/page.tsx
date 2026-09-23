import Link from 'next/link'
import { FormularioLogin } from '@/features/tenencia/components/formulario-login'

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string; aviso?: string }>
}) {
  const { volver, aviso } = await searchParams
  const conVolver = volver ? `?volver=${encodeURIComponent(volver)}` : ''

  return (
    <div className="space-y-6">
      <h1 className="font-titulo text-2xl text-primario-oscuro">Entrar</h1>

      {aviso === 'enlace-invalido' && (
        <p role="alert" className="rounded-organico border border-ocre-300 bg-ocre-100 p-4 text-sm">
          Ese enlace ya no sirve: caducó o ya se usó. Si querías cambiar tu
          contraseña, pide uno nuevo.
        </p>
      )}

      <FormularioLogin volver={volver} />

      <p className="text-sm">
        <Link href="/recuperar" className="text-acento underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>

      <p className="text-sm text-texto-suave">
        ¿Todavía no tienes cuenta?{' '}
        <Link href={`/signup${conVolver}`} className="text-acento underline">
          Crear una
        </Link>
      </p>
    </div>
  )
}
