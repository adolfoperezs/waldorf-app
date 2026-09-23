// Aplica las plantillas de correo de Supabase Auth a produccion.
//
//   SUPABASE_ACCESS_TOKEN=... node supabase/plantillas-correo/aplicar.mjs
//
// Por que existen: las de fabrica estan en ingles y su enlace ({{ .ConfirmationURL }})
// termina en un `code` PKCE que solo se canjea en el MISMO navegador que pidio el
// correo. Estas mandan `token_hash` a /auth/confirmar, que funciona en cualquier
// dispositivo (src/app/auth/confirmar/route.ts).
//
// Supabase NO deja cambiar plantillas en el plan gratis con su servidor de correo
// por defecto: primero hay que configurar un SMTP propio. Ver docs/SETUP.md.
import { readFileSync } from 'node:fs'

const REF = 'jxnrdwlqqyhbscyombym'
const aqui = new URL('.', import.meta.url)
const leer = (archivo) => readFileSync(new URL(archivo, aqui), 'utf8')

const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    mailer_subjects_recovery: 'Tu contraseña nueva — Gestión Waldorf',
    mailer_templates_recovery_content: leer('recuperar.html'),
    mailer_subjects_confirmation: 'Confirma tu correo — Gestión Waldorf',
    mailer_templates_confirmation_content: leer('confirmar.html'),
  }),
})
console.log(r.status, r.ok ? 'plantillas aplicadas' : await r.text())
