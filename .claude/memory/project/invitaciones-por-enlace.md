# Invitaciones por enlace, no por correo

**Decidido:** 2026-09-23. Migracion `0006_invitaciones.sql`.

La administracion crea una invitacion (rol + correo opcional) y recibe un ENLACE para
mandar por WhatsApp. No se envia correo: eso exigiria la `service_role`, prohibida en
rutas de usuario, y un proveedor SMTP propio que todavia no existe.

Seguridad, y por que no se puede aflojar:

- La base guarda la **huella SHA-256** del codigo, nunca el codigo. El enlace se muestra
  una sola vez. Node (`createHash`) y Postgres (`sha256(convert_to(x,'UTF8'))`) dan la
  misma huella: verificado contra produccion.
- Un solo uso (`for update` evita el doble consumo), caduca a los 7 dias, revocable.
- Con correo, solo lo acepta quien entra con ese correo. **Ojo:** mientras "Confirm
  email" siga desactivado en Supabase, el correo no esta verificado y esta proteccion es
  debil. Se vuelve fuerte al activar la confirmacion.
- `aceptar_invitacion` y `ver_invitacion` son `security definer` (quien acepta aun no es
  miembro). Solo para `authenticated`: ninguna funcion definer queda abierta a `anon`.
  El asesor de Supabase las marca; es intencional, igual que `crear_escuela`.

El rol NO da acceso a ninos: lo dan `grupo_maestros` y `familia_miembros`. Invitar a una
familia le abre el calendario, no a sus hijos. Ver `docs/MAPA.md`, seccion 2.

**Desde 0007:** `invitaciones.familia_id` (solo con rol familia, CHECK). "Sumar familia"
llama a `sumar_familia` (INVOKER, una transaccion: familia + ninos + invitacion) y
`aceptar_invitacion` agrega a quien acepta a `familia_miembros` (el primero queda como
principal). Un enlace = una persona: el segundo apoderado pide otro desde la tarjeta de
la familia.

El boton "Enviar por WhatsApp" usa `whatsapp://send?text=`, NO `https://wa.me/?text=`:
el esquema lo abre la app del telefono sin pasar por un servidor web, y el texto lleva
el enlace de invitacion y nombres de ninos (docs/PRIVACY.md: nada personal en URLs).

Se implemento sin PRP ni pruebas locales, por decision explicita del usuario (probar
directo en produccion). No hay test automatizado de este flujo todavia.

**Correo (2026-09-23):** recuperar contrasena existe (`/recuperar` → correo →
`/auth/confirmar` → `/nueva-contrasena`). Mientras no haya SMTP propio, Supabase solo
entrega a los correos del equipo del proyecto, 2 por hora, y NO deja cambiar las
plantillas en el plan gratis: el enlace de fabrica trae un `code` PKCE que solo sirve en
el mismo navegador. Las plantillas en espanol con `token_hash` estan en
`supabase/plantillas-correo/` listas para aplicar. Pasos en docs/SETUP.md, seccion 6.
