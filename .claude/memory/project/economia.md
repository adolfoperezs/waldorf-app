# Economia: acuerdos, aportes y paneles (PRP-004, 0009 y 0010)

**Decidido:** 2026-09-23.

- Dos monedas siempre juntas: dinero y horas. Una vista que suma solo pesos esta
  incompleta.
- Tono: ACUERDO, nunca deuda. Lo que falta es "por completar", en ocre, nunca rojo. Ni
  "moroso", ni "atraso", ni "deuda" en la UI.
- Las reglas del calculo viven DOS veces y deben coincidir:
  `src/features/economia/lib/cuentas.ts` (por familia) y `public.resumen_economico`
  (agregado). Meses = mes de inicio a mes de fin del anio; el acuerdo cuenta desde el
  mes de `acordado_en`; aportado = `confirmado` del `periodo`; el dinero con
  `campana_id` NO completa el acuerdo (0010); las horas si.
- La comision con `comisiones.ve_economia` ve SUMAS (resumen_economico), nunca filas de
  familias: es mixta, y PRIVACY reserva el dato economico a administracion y familia.
- La familia registra sus horas (`registrado`); la administracion confirma o anula.
  Anular, no borrar: hay obligacion de conservar.
- Decisiones por defecto marcadas ⚑ en el PRP, pendientes de validar con la escuela.

**Why:** criterio de salida de la Fase 2: la Comision de Economia deja las planillas.

**How to apply:** cualquier cambio de regla de calculo se hace en los dos lugares y se
agrega a `supabase/verificacion/economia.sql` con numeros concretos. Relacionado:
[[auditoria-de-lecturas]], [[ritmo-por-nino]].
