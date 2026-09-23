import Link from 'next/link'
import { FormularioRecuperar } from '@/features/tenencia/components/formulario-recuperar'

export default function PaginaRecuperar() {
  return (
    <div className="space-y-6">
      <h1 className="font-titulo text-2xl">¿Olvidaste tu contraseña?</h1>
      <p className="text-texto-suave">
        Escribe el correo con el que entras. Te enviamos un enlace para elegir una
        nueva.
      </p>

      <FormularioRecuperar />

      <p className="text-sm text-texto-suave">
        <Link href="/login" className="text-acento underline">
          Volver a entrar
        </Link>
      </p>
    </div>
  )
}
