# PRP-004: Economía — acuerdos, aportes en dinero y horas, paneles y campañas

> **Estado**: COMPLETADO (2026-09-23), salvo validar contra la planilla real
> **Fecha**: 2026-09-23
> **Fase del roadmap**: 2 (lo que falta de ella)
> **Aprobación**: el usuario pidió empezar ("Empieza con eso"); cuenta como la revisión
> humana. Las decisiones de producto que tomé por defecto están marcadas ⚑ para
> revisarlas con la escuela.

## Objetivo

Criterio de salida de la Fase 2: **la Comisión de Economía deja de usar planillas.**

Todo lo económico tiene dos monedas: dinero y horas de trabajo comunitario. Una vista que
sume solo pesos está incompleta (DOMAIN §1). Y el tono importa: es un **acuerdo**, no una
deuda. Nunca "moroso", "deuda", "atraso" ni rojo de alarma: "por completar", en ocre.

## Qué ya existe (0003)

`tramos_aporte`, `acuerdos_aporte` (único por familia y año), `aportes` (dinero u horas,
`periodo` = mes, estados `registrado` / `confirmado` / `anulado`), `campanas`. RLS: la
administración gestiona; cada familia ve lo suyo; las campañas las ve la comunidad y las
gestiona su comisión.

## Qué se agrega — `0009_economia.sql`

- **`comisiones.ve_economia`** — qué comisión ve el panel económico. Es dato: cada
  escuela decide cuál (regla 6). La plantilla marca "Economía".
- **La familia registra sus propias horas** ⚑ — solo horas, solo de su familia, siempre
  en estado `registrado`; la administración las confirma o las anula. El dinero lo
  registra solo la administración (pasa por la cuenta de la escuela).
- **`resumen_economico(anio)`** — agregados por mes: comprometido y aportado en las dos
  monedas, horas por confirmar, familias al día. **Sin identificar familias** ⚑: la
  comisión es mixta (familias y equipo) y `PRIVACY.md` reserva el dato económico de cada
  familia a la administración y a la propia familia. Solo responde a administración y a
  integrantes de la comisión con `ve_economia`.
- **`avance_de_campanas(escuela)`** — cuánto lleva cada campaña. Agregado, para toda la
  comunidad: la meta de una campaña es pública, lo que dio cada familia no.
- Mismo ajuste que 0008 en `acuerdos` y `aportes`: la rama "mi familia" exige membresía
  vigente.
- **`0010_economia_campanas.sql`** ⚑ — el dinero dado a una campaña no completa el
  acuerdo mensual (en 0009 sí lo hacía: una donación para el techo dejaba a la familia
  "al día"). Las horas cuentan igual, sean de una comisión o de una campaña.
- **Comisiones**: faltaba la pantalla para sumar integrantes, y sin ella nadie fuera de
  administración podía ver el panel. `/[slug]/comisiones` (gestores).

## Reglas de cálculo (una sola implementación en `features/economia/lib/cuentas.ts`,
reflejada en el SQL de `resumen_economico`)

- Los meses del año escolar van del mes de `inicio` al mes de `fin` (Kimün 2026: marzo a
  diciembre, 10 meses) ⚑.
- El acuerdo compromete cada mes desde el mes de `acordado_en` (una familia que llega en
  junio no "debe" marzo). El formulario propone el inicio del año.
- Aportado = aportes `confirmado` del mes (`periodo`). Los `registrado` se muestran
  aparte como "por confirmar"; los `anulado` no cuentan.
- Por completar = comprometido − aportado, nunca negativo, solo de meses ya iniciados.
- Proyección: "si todos cumplen su acuerdo" (aportado + comprometido de los meses que
  faltan) y "al ritmo actual" (cumplimiento a la fecha × comprometido del año).

## Pantallas

| Ruta | Para quién | Qué |
|---|---|---|
| `/[slug]/economia` | Administración | Resumen del mes y del año, tramos, familias con su acuerdo y avance, horas por confirmar, qué comisión ve el panel |
| `/[slug]/economia/[familiaId]` | Administración | Mes a mes de una familia; registrar, confirmar y anular aportes |
| `/[slug]/mi-aporte` | Familia | Su acuerdo, lo aportado y lo por completar, mes a mes, en las dos monedas; registrar horas |
| `/[slug]/panel-economico` | Comisión con `ve_economia` y administración | Agregados, familias al día, proyección. Sin nombres |
| `/[slug]/campanas` | Toda la comunidad | Campañas con su meta y avance; crear (gestores y su comisión) |

## Decisiones por defecto a revisar con la escuela (⚑)

1. Las familias registran sus propias horas y la administración las confirma.
2. La comisión ve solo sumas, nunca a una familia.
3. Los meses del acuerdo van del mes de inicio al de fin del año escolar (Kimün 2026:
   marzo a diciembre, 10 meses).
4. El dinero de campañas no completa el acuerdo; las horas sí.

## Aprendizajes

- El ensayo de una migración con datos concretos descubre errores de PRODUCTO, no solo
  de código: al ver 115.000 en un mes de 95.000 apareció que las donaciones a campañas
  se sumaban al acuerdo.
- `z.coerce.number()` convierte `''` en `0`: en una unión con `z.literal('')` el vacío
  tiene que ir primero, o una meta vacía se guarda como meta de cero.

## Fuera de alcance

- Importar la planilla actual (CSV). Útil para la adopción; va después si la escuela lo
  pide.
- Pasarela de pago y conciliación bancaria (ROADMAP: fuera de alcance).
- Recordatorios automáticos a familias.

## Verificación

- `supabase/verificacion/economia.sql` ensayada con 0007 y 0008 dentro de
  `begin … rollback` en producción antes del `db push`.
- `tsc`, `eslint`, `next build`.
