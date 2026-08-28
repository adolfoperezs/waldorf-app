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

## Continuo

`npm run build`, `npm run typecheck`, y que `grep -rn service_role src/` salga vacio.
