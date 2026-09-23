# PRP-003: Deudas cortas — privacidad (P1, P2), recuperar contraseña, linter

> **Estado**: COMPLETADO (2026-09-23), salvo el SMTP propio (necesita un dominio)
> **Fecha**: 2026-09-23
> **Origen**: pendientes de `docs/MAPA.md` sección 7 y de PRP-002. El usuario aprobó
> empezar por aquí antes de la economía.

## Objetivo

Cerrar lo que impedía cargar familias reales: que el colegio de maestros viera a todas
las familias y niños (P1), que cualquier miembro leyera correo y teléfono de los demás
(P2), que no existiera "olvidé mi contraseña", y que el proyecto no tuviera linter.

## Qué se hizo

**`0008_privacidad.sql`**
- `familias`, `familia_miembros`, `ninos`: de `es_gestor` a administración. La relación
  familiar exige además membresía vigente (una familia dada de baja deja de ver).
- `ninos`: SELECT solo de identificadores. Los datos del niño salen únicamente por las
  funciones auditadas de 0007.
- `perfiles`: cada quien ve el propio, los gestores ven a los miembros de su escuela y
  los integrantes de una familia se ven entre sí. `email` y `telefono` no se leen por la
  API; administración los obtiene con `contactos_de_escuela`.
- Verificación: `supabase/verificacion/privacidad.sql`, ensayada junto con la de 0007
  dentro de `begin … rollback` en producción antes del `db push`.

**Recuperar contraseña**
- `/recuperar` → correo → `/auth/confirmar` (canjea `token_hash` o `code`) →
  `/nueva-contrasena`. La respuesta no revela si la cuenta existe.
- El registro ya maneja "Confirm email" activo (muestra "revisa tu correo" y vuelve a la
  invitación al confirmar), aunque sigue apagado.
- Plantillas en español en `supabase/plantillas-correo/`, con script para aplicarlas.

**Linter**: `eslint.config.mjs` (Next 16 ya no trae `next lint`). Quedó en cero.

## Lo que falta y por qué

Supabase, en el plan gratis y sin SMTP propio: solo entrega correos al equipo del
proyecto, dos por hora, y no deja cambiar las plantillas. Hasta configurar un SMTP con
un dominio (docs/SETUP.md, sección 6), recuperar contraseña funciona solo para quien
esté en el equipo de Supabase y abriendo el correo en el mismo navegador.

## Aprendizajes

- La RLS no oculta columnas de una fila visible: para eso, privilegios por columna.
  `supabase gen types` no los refleja y tsc no avisa de un `select('*')` que fallará.
- El linter nuevo de React (`react-hooks/purity`, `set-state-in-effect`) marca
  `Date.now()` al dibujar y leer `localStorage` en un efecto. Soluciones: la hora se
  mira al leer los datos, y lo recordado se lee con `useSyncExternalStore`.
