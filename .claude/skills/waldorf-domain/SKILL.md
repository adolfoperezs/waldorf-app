---
name: waldorf-domain
description: Vocabulario y reglas del dominio Waldorf. Activar antes de modelar cualquier entidad, crear tablas, nombrar campos, escribir copy de UI o diseñar una feature del sistema escolar.
user-invocable: true
context: fork
allowed-tools: Read, Grep, Glob
---

# Dominio Waldorf

Referencia completa en `docs/DOMAIN.md`. Este skill es el resumen operativo que evita
los errores más frecuentes al modelar.

## Traducciones prohibidas

Si estás por escribir alguno de los términos de la izquierda, el modelo está mal:

| No uses | Usa | Por qué |
|---|---|---|
| `alumno`, `estudiante` | `nino` | La relación es con un niño en desarrollo, no con un consumidor de servicio educativo |
| `curso`, `clase`, `seccion` | `grupo` | El grupo persiste varios años con el mismo maestro-guía |
| `nota`, `calificacion`, `promedio` | `observacion`, `informe_desarrollo` | No existen las notas |
| `semestre`, `trimestre` | `epoca` | El bloque temático de 3-4 semanas es la unidad temporal |
| `apoderado` como entidad raíz | `familia` | La familia es la unidad; el perfil es miembro de ella |
| `arancel`, `mensualidad`, `deuda` | `acuerdo_aporte`, `aporte` | Es aporte solidario acordado, no precio ni deuda |
| `director`, `admin` como rol | `administracion`, `colegio_maestros` | El gobierno es colegiado, no jerárquico |
| `asignatura` | `epoca` o `materia` de especialidad | Los contenidos van por época |

## Las cinco estructuras que definen el producto

1. **La época es el eje temporal.** Contenidos, festividades, minuta, jornadas y campañas
   cuelgan de la época. Si estás anclando algo al mes o al semestre, revísalo.

2. **El grupo persiste, el curso no.** La relación maestro-grupo tiene vigencia
   (`desde`/`hasta`) y atraviesa años escolares. La historia de un niño se lee
   longitudinalmente, no por año.

3. **La observación es el átomo.** El informe se compone a partir de observaciones
   humanas previas. Nunca al revés.

4. **La familia es la unidad.** El niño cuelga de la familia. Los aportes, comisiones,
   jornadas y encuentros son de la familia.

5. **El aporte tiene dos monedas.** Dinero y horas de trabajo comunitario. Cualquier
   cálculo, reporte o vista de economía que solo sume pesos está incompleta.

## Configurable, nunca hardcodeado

Cada vez que sientas la tentación de escribir un `enum` de TypeScript o una constante
con vocabulario pedagógico, es una tabla:

- nombres y cantidad de épocas
- festividades del año (varían por hemisferio, país y escuela)
- tramos de aporte
- comisiones
- etiquetas de observación
- secciones del informe de desarrollo
- días y platos de la minuta

Los `enum` de Postgres legítimos son solo los estructurales: `rol_escuela`,
`tipo_evento`, `tipo_maestro`, `moneda_aporte`, `estado_aporte`.

## Lo que NO se modela

Notas, promedios, rankings, comparaciones entre niños, temperamentos o tipologías
almacenadas como atributo, perfiles psicológicos, asistencia como control disciplinario.

Son decisiones de producto, no funcionalidades pendientes. Si una escuela lo pide,
la conversación es de producto, no un ticket.

## Tono de la interfaz

El usuario típico es una maestra o un apoderado en un teléfono de gama media.
El lenguaje es cálido, humano y directo. Nada de jerga corporativa: no hay "usuarios",
"registros" ni "gestión de stakeholders". Hay familias, niños, maestras y comisiones.

En economía el tono importa especialmente: se habla de acuerdos y aportes, nunca de
deuda, morosidad ni cobranza en la cara visible del sistema.
