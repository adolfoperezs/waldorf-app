'use client'

import { useTransition } from 'react'

/**
 * Envia un formulario a su server action SIN que React lo vacie despues.
 *
 * Con `<form action={...}>`, React 19 reinicia los campos no controlados al
 * terminar la accion, aunque haya vuelto con errores. En un formulario largo
 * (una familia con tres hijos) eso borra todo lo escrito por un solo campo
 * mal puesto.
 *
 * Se usa como `onSubmit` junto al `action` de siempre: con JavaScript manda
 * este camino; sin JavaScript el formulario sigue funcionando por `action`.
 * Devuelve tambien si esta en vuelo, porque useFormStatus no se entera de un
 * envio hecho a mano.
 */
export function useEnvioConservando(enviar: (formData: FormData) => void) {
  const [enVuelo, iniciar] = useTransition()

  function alEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const formData = new FormData(evento.currentTarget)
    iniciar(() => enviar(formData))
  }

  return { alEnviar, enVuelo }
}
