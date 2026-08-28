# Las funciones RPC van en `public`, las de seguridad en `app`

**Decidido:** 2026-08-28.

PostgREST solo expone el esquema `public`. El esquema `app` esta revocado a proposito
para que las funciones de seguridad no sean parte de la API.

Consecuencia practica:

- **Predicados de seguridad** (`es_miembro`, `es_gestor`, `tiene_rol`,
  `es_maestro_de_grupo`, `familias_del_usuario`, `es_miembro_de_comision`,
  `registrar_lectura`): esquema `app`, sin grant a `authenticated`. Solo las usan las
  politicas de RLS.
- **Funciones invocables desde la app** (`crear_escuela`): esquema `public`, con
  `revoke execute from public, anon` y luego `grant execute to authenticated`.

**Ojo:** Postgres otorga EXECUTE a PUBLIC por defecto en toda funcion nueva. Si no se
revoca, `anon` puede invocarla sin sesion. Revocar siempre antes de otorgar.

Ver [aislamiento-rls].
