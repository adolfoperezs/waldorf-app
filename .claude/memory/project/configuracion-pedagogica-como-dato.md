# Nada de configuracion pedagogica hardcodeada

**Decidido:** 2026-08-28. Fuente: CLAUDE.md regla 6, .claude/skills/waldorf-domain.

Cuantas epocas hay y como se llaman, que festividades se celebran, que tramos de
aporte existen, que comisiones hay, que etiquetas de observacion se usan, que
secciones tiene el informe, que dias y platos tiene la minuta: **todo es dato
configurable por escuela**, nunca constante en el codigo.

Cada vez que aparezca la tentacion de escribir un `enum` de TypeScript o una constante
con vocabulario pedagogico, es una tabla mal disenada.

Los unicos `enum` de Postgres legitimos son los estructurales: `rol_escuela`,
`tipo_evento`, `tipo_maestro`, `moneda_aporte`, `estado_aporte`.

Razon de fondo: varia enormemente por hemisferio, pais y escuela. Una escuela chilena
celebra San Juan en invierno y una alemana en verano. Ver [tres-capas].
