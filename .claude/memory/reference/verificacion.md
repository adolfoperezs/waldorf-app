# Como se verifica este proyecto

**Escrito:** 2026-08-28.

## Base de datos local

```
npm run db:start     # supabase start (necesita Docker Desktop corriendo)
npm run db:reset     # reaplica migraciones desde cero
npm run db:tipos     # genera src/shared/supabase/tipos.ts desde el esquema
```

Las claves del stack local salen de `npx supabase status`. Son publicas y no son
secretos.

## Despues de CADA migracion

```
docker exec -i supabase_db_Proyecto_Waldorf psql -U postgres -d postgres -f - \
  < supabase/verificacion/tenancy-guard.sql
```

Son las tres consultas de .claude/skills/tenancy-guard: tablas de dominio sin
`escuela_id`, tablas sin RLS, tablas con RLS pero sin politicas. **Las tres deben
devolver cero filas.**

`supabase/verificacion/integridad.sql` comprueba, como superusuario y por tanto sin
RLS, que la INTEGRIDAD del esquema aguanta sola: FK cruzadas entre escuelas, solapes
de epocas, periodo de aporte fuera del dia 1.

## Despues de CADA feature

```
npx playwright test
```

- `tests/aislamiento.spec.ts` es el criterio de salida de la Fase 0 y el que exige
  tenancy-guard: dos escuelas con datos, autenticar como miembro de la primera,
  intentar leer la segunda. **Cero filas, NO un error de permisos.** Un error
  significaria que la politica esta mal escrita.
  Todo con anon key y sesiones reales. Ni una llamada con service_role: usarla aqui
  probaria justamente lo contrario de lo que se quiere demostrar.
- `tests/flujo-alta.spec.ts` es humo de navegador en ventana de telefono.

Sin test de aislamiento que cubra las tablas nuevas, la feature **no esta terminada**.

## Ensayar una migracion contra produccion sin tocarla

Sin Docker a mano (el usuario prefiere no probar local), se ensaya asi: la migracion +
los archivos de `supabase/verificacion/` que apliquen (`ritmo-por-nino.sql`,
`privacidad.sql`: se concatenan sus cuerpos, sin sus begin/rollback) en UNA consulta a la API de administracion
(`POST /v1/projects/{ref}/database/query`), envuelta en `begin ... rollback`. El archivo
de verificacion no usa metacomandos de psql: cada prueba es un `do $$` que lanza
`FALLO: ...`, asi que un 201 es "todo paso" y un 400 trae la prueba que fallo. Despues
se confirma que no quedo nada (`to_regclass` de la tabla nueva es null) y recien ahi
`npx supabase db push --dry-run` y `db push`.

Escollo al armar la consulta en Node: `texto.replace(a, b)` con `b` como TEXTO
interpreta `$$` como `$` y rompe todas las funciones. Usar `replace(a, () => b)`.

El token esta en la variable de usuario de Windows `SUPABASE_ACCESS_TOKEN`; en Git Bash
se lee con `powershell.exe -NoProfile -Command "[Environment]::GetEnvironmentVariable('SUPABASE_ACCESS_TOKEN','User')"`.

## Continuo

`npm run build`, `npm run typecheck`, y que `grep -rn service_role src/` salga vacio.
