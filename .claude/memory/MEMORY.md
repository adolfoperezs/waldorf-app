# Memoria del Proyecto - Indice

> Archivos organizados por carpeta (tipo). Max 200 lineas.
> Gestionado por skill memory-manager. Auto-memory de Claude Code DESACTIVADO.

## user/ - Sobre el usuario/equipo
(vacio)

## project/ - Proyectos y decisiones activas

- [tres-capas](project/tres-capas.md) - Nucleo universal, plantilla configurable y
  plugin pais. Si se mezclan, cada cliente nuevo es una rama de codigo.
- [aislamiento-rls](project/aislamiento-rls.md) - El aislamiento entre escuelas lo
  hace Postgres, no el codigo. Reglas no negociables de multi-tenancy.
- [correcciones-migraciones-iniciales](project/correcciones-migraciones-iniciales.md) -
  B1-B4 y ocho hallazgos menores corregidos antes del primer push. No revertir.
- [rpc-en-public-no-en-app](project/rpc-en-public-no-en-app.md) - PostgREST solo ve
  `public`. Que va en cada esquema y por que hay que revocar EXECUTE de PUBLIC.
- [auditoria-de-lecturas](project/auditoria-de-lecturas.md) - Postgres no dispara
  triggers en SELECT. Como se auditan las lecturas de niveles Menor y Sensible.
- [configuracion-pedagogica-como-dato](project/configuracion-pedagogica-como-dato.md) -
  Si sientes ganas de escribir un enum con vocabulario pedagogico, es una tabla.
- [stack-y-diseno](project/stack-y-diseno.md) - Tailwind v4 (la plantilla venia rota),
  estetica Waldorf, proxy.ts, movil primero.

## feedback/ - Correcciones y preferencias
(vacio)

## reference/ - Donde encontrar cosas

- [verificacion](reference/verificacion.md) - Las tres consultas de tenancy-guard, el
  test de aislamiento y que se corre despues de cada migracion y cada feature.
- [escollos-de-tests](reference/escollos-de-tests.md) - Un UPDATE sin `.select()` miente
  cuando la RLS filtra la fila, y un `.click()` de Playwright no espera a que la pagina
  cambie. Los dos dan sintomas que apuntan al sitio equivocado.
- [escollos-de-dependencias](reference/escollos-de-dependencias.md) - @supabase/ssr y
  supabase-js tienen que ir a la par o todo tabla tipa como `never`. Los tests pasan
  igual: el sintoma solo sale en tsc.
