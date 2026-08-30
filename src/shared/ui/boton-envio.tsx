'use client'

import { useFormStatus } from 'react-dom'
import { Boton } from './boton'

type Props = React.ComponentProps<typeof Boton> & {
  esperando?: string
}

/** Boton de submit que se deshabilita mientras la accion esta en vuelo. */
export function BotonEnvio({ children, esperando = 'Un momento...', ...props }: Props) {
  const { pending } = useFormStatus()
  return (
    <Boton type="submit" disabled={pending} {...props}>
      {pending ? esperando : children}
    </Boton>
  )
}
