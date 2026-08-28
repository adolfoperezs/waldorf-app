# Conexion al MCP de Supabase

El MCP permite trabajar la base de datos desde Claude Code sin entrar al dashboard:
aplicar migraciones, correr las consultas de verificacion de `tenancy-guard`, inspeccionar
tablas y politicas.

## Regla de seguridad

El MCP apunta **unicamente al proyecto de desarrollo**. Nunca a produccion.

`docs/PRIVACY.md` prohibe datos de produccion en entornos de desarrollo, y `docs/SETUP.md`
advierte sobre permisos amplios en un repositorio que va a contener datos de ninos.
Produccion se toca solo con `supabase db push` deliberado.

| Proyecto | Uso | Acceso |
|---|---|---|
| `waldorf-dev` | Desarrollo. Datos sinteticos. | MCP con escritura |
| `waldorf-prod` | Escuelas reales. | Solo `supabase db push` manual |

## Puesta en marcha (una sola vez)

1. Crear dos proyectos en https://supabase.com/dashboard: `waldorf-dev` y `waldorf-prod`.

2. Copiar el **Project Ref** de `waldorf-dev` (Project Settings -> General) y pegarlo en
   `.mcp.json`, reemplazando `REEMPLAZAR_CON_REF_DE_WALDORF_DEV`.

3. Generar un Personal Access Token en https://supabase.com/dashboard/account/tokens
   y exportarlo como variable de entorno. En PowerShell, de forma permanente:

   ```powershell
   [Environment]::SetEnvironmentVariable('SUPABASE_ACCESS_TOKEN', 'sbp_...', 'User')
   ```

   El token **nunca** se escribe en `.mcp.json` ni en ningun archivo del repositorio.
   `.mcp.json` solo lo referencia como `${SUPABASE_ACCESS_TOKEN}`.

4. Cerrar y volver a abrir Claude Code. El servidor MCP no se carga en caliente.

5. Verificar con `/mcp`: `supabase` debe aparecer como conectado.

## Credenciales de la aplicacion

Aparte del MCP, la app necesita `.env.local` (no versionado). Copiar de
`.env.local.example` y rellenar con los datos de `waldorf-dev`:
Project Settings -> API -> Project URL y anon/public key.

La `service_role` key **no va en `.env.local`**. Ninguna ruta que atienda usuarios
puede usarla (`CLAUDE.md`, regla 3).
