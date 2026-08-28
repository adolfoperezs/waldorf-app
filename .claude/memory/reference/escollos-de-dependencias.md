# Escollos de dependencias

**Escrito:** 2026-08-28.

## @supabase/ssr tiene que ir a la par de @supabase/supabase-js

La plantilla pedia `@supabase/ssr: ^0.6.0` y `@supabase/supabase-js: ^2.49.0`. Ese par
resolvio a ssr 0.6.1 + supabase-js 2.112, que **son incompatibles en tipos**:

- ssr 0.6.1 usa la firma vieja `createServerClient<Database, SchemaName, Schema>`.
- supabase-js 2.112 inserto `ClientOptions` como segundo generico de `SupabaseClient`.

Resultado: el cliente sale mal tipado y toda tabla se resuelve como `never`. En runtime
funciona perfectamente, asi que **los tests pasan y el sintoma solo aparece en
`tsc --noEmit`**, con errores que parecen del esquema y no de las versiones.

Sintoma tipico: `.from('comisiones').insert(...)` -> "not assignable to never[]",
mientras otras consultas de la misma sesion tipan bien.

**Como comprobar que el problema NO es el esquema:** un archivo de prueba con
`const t: keyof Database['public']['Tables'] = 'comisiones'`. Si eso compila, el
esquema esta bien y el problema son las versiones.

Fijado en `@supabase/ssr: ^0.12.5`, que declara
`peerDependencies: { "@supabase/supabase-js": "^2.112.4" }`. **Al subir una de las
dos, revisar la otra.**

## El CLI de supabase por npm necesita --include=optional

`npm i -D supabase` puede dejar fuera el binario de la plataforma y fallar con
"No matching Supabase CLI binary package found for win32-x64". Se arregla con
`npm install -D supabase --include=optional`.
