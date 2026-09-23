# El aislamiento entre escuelas lo hace Postgres

**Decidido:** 2026-08-28. Fuente: docs/ARCHITECTURE.md y .claude/skills/tenancy-guard.

Base unica con RLS, no un esquema por cliente. Con menos de cien escuelas, un esquema
por cliente solo agrega dolor operacional en migraciones.

Reglas que no se negocian:

- Toda tabla de dominio lleva `escuela_id`. Excepciones ya creadas y unicas:
  `escuelas`, `perfiles`, `auditoria`.
- Tabla, RLS, politicas, indices y trigger de auditoria van en LA MISMA migracion.
- Las politicas consultan funciones del esquema `app`, todas `stable security definer`
  con `search_path = ''`. El SECURITY DEFINER es obligatorio: sin el habria recursion
  infinita al consultar `membresias` desde la RLS de `membresias`.
- El esquema `app` NO se expone via API. PostgREST solo ve `public`, y eso es
  deliberado. Ver [rpc-en-public-no-en-app].
- La `service_role` key jamas en codigo que atiende peticiones de usuarios.
- Un `.eq('escuela_id', x)` en el cliente puede estar por rendimiento, JAMAS por
  seguridad.

**La RLS sola no basta.** Filtra por `escuela_id` pero no valida que las llaves
foraneas apunten a filas de la misma escuela. Ver
[correcciones-migraciones-iniciales], hallazgo B3.

## Privilegios por columna (desde 0008)

La RLS decide QUE FILAS; no puede ocultar columnas de una fila visible. Para eso:
`revoke select on tabla from authenticated` + `grant select (col1, col2) on tabla`.
Se usa en `ninos` (solo ids) y `perfiles` (sin `email` ni `telefono`). Lo oculto sale
por funciones definer con filtro explicito (`ninos_de_*`, `contactos_de_escuela`).

Consecuencias a recordar: un `select('*')` sobre esas tablas falla con permiso
denegado; un `UPDATE ... WHERE col = ...` necesita SELECT sobre `col`; y
`supabase gen types` no refleja los privilegios por columna, asi que tsc no avisa.
