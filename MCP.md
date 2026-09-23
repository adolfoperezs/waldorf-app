# Conexion al MCP de Supabase

El MCP deja trabajar la base desde Claude Code sin entrar al panel: inspeccionar
tablas y politicas, leer logs, correr las consultas de verificacion de `tenancy-guard`
y revisar el asesor de seguridad.

## Como esta configurado

| Entorno | Donde vive | Acceso desde Claude Code |
|---|---|---|
| Desarrollo | Supabase local (`npm run db:start`, Docker) | psql y CLI, lectura y escritura |
| Produccion | `waldorf-prod` · ref `jxnrdwlqqyhbscyombym` · us-east-1 | MCP en **solo lectura** |

No hay proyecto de desarrollo en la nube: el stack local cumple ese papel y usa datos
sinteticos, que es lo que exige `docs/PRIVACY.md`.

## Por que el MCP de produccion es de solo lectura

Produccion va a contener datos de ninos. `docs/SETUP.md` advierte contra permisos
amplios sobre este repositorio, y un MCP con escritura puede alterar la base con una
sola llamada.

Los cambios de esquema entran por un solo camino, siempre el mismo:

1. La migracion se escribe en `supabase/migrations/` y se prueba en local.
2. `npx supabase db push --dry-run` muestra que se va a aplicar.
3. Confirmacion humana.
4. `npx supabase db push`.
5. Las tres consultas de `tenancy-guard` y el asesor de seguridad, contra produccion.

## El token

El MCP y el CLI leen el token de la variable de entorno `SUPABASE_ACCESS_TOKEN`.
**Nunca** se escribe en `.mcp.json`, en ningun archivo del repositorio ni en el chat.

Un token personal de Supabase vale para TODA la cuenta, no solo para este proyecto:
con el se pueden borrar o leer los demas proyectos de la cuenta.

Para configurarlo (PowerShell, una sola vez):

```powershell
[Environment]::SetEnvironmentVariable('SUPABASE_ACCESS_TOKEN', 'sbp_...', 'User')
```

Despues, cerrar y volver a abrir Claude Code: el servidor MCP no se recarga en caliente.

**Si un token quedo expuesto** (pegado en un chat, en un archivo, en un log): revocarlo
en https://supabase.com/dashboard/account/tokens, generar otro y configurarlo con el
comando de arriba.

## Credenciales de la aplicacion

La app no usa el token. Usa `.env.local` (no versionado) en local y las variables de
entorno de Vercel en produccion:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

La `service_role` key **no va en ninguno de los dos lados**. Ninguna ruta que atienda
usuarios puede usarla (`CLAUDE.md`, regla 3).
