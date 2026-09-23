/**
 * Las cuentas del aporte. Funciones puras: sin red ni base, faciles de probar.
 *
 * Son las MISMAS reglas que public.resumen_economico (0009, corregida en 0010). Si
 * se cambia una, se cambia la otra:
 * - los meses del anio van del mes de `inicio` al mes de `fin`;
 * - un acuerdo compromete desde el mes de `acordado_en`;
 * - aportado = aportes `confirmado` del mes (`periodo`); los `registrado` van
 *   aparte como "por confirmar"; los `anulado` no cuentan;
 * - el dinero dado a una campana no completa el acuerdo (0010): se ve en la
 *   campana. Las horas si cuentan, sean de una comision o de una campana.
 *
 * Tono: es un acuerdo, no una deuda. Lo que falta es "por completar".
 */

export type Moneda = 'dinero' | 'horas'
export type EstadoAporte = 'registrado' | 'confirmado' | 'anulado'

type AcuerdoBase = {
  monto_mensual: number
  horas_mensuales: number
  acordado_en: string
}

type AporteBase = {
  moneda: Moneda
  monto: number | null
  horas: number | null
  periodo: string | null
  estado: EstadoAporte
  campana_id: string | null
}

export type Mes = {
  /** Primer dia del mes: 'YYYY-MM-01'. */
  periodo: string
  /** El mes ya empezo (o es el actual). Solo esos cuentan "a la fecha". */
  iniciado: boolean
  comprometidoDinero: number
  comprometidoHoras: number
  aportadoDinero: number
  aportadoHoras: number
  horasPorConfirmar: number
}

export type Totales = {
  comprometidoDinero: number
  comprometidoHoras: number
  aportadoDinero: number
  aportadoHoras: number
  horasPorConfirmar: number
  /** Nunca negativo: lo aportado de mas un mes compensa otro. */
  porCompletarDinero: number
  porCompletarHoras: number
}

/** 'YYYY-MM-DD' → 'YYYY-MM-01'. */
export function mesDe(fecha: string): string {
  return `${fecha.slice(0, 7)}-01`
}

/** Los meses del anio escolar, del mes de inicio al mes de fin. */
export function mesesDelAnio(inicio: string, fin: string): string[] {
  const meses: string[] = []
  let [anio, mes] = inicio.slice(0, 7).split('-').map(Number)
  const [anioFin, mesFin] = fin.slice(0, 7).split('-').map(Number)
  while (anio < anioFin || (anio === anioFin && mes <= mesFin)) {
    meses.push(`${anio}-${String(mes).padStart(2, '0')}-01`)
    mes += 1
    if (mes > 12) {
      mes = 1
      anio += 1
    }
  }
  return meses
}

const redondear = (n: number) => Math.round(n * 100) / 100

/** El mes a mes de UNA familia. */
export function mesesDeFamilia(
  meses: string[],
  acuerdo: AcuerdoBase | null,
  aportes: AporteBase[],
  hoy: string,
): Mes[] {
  const mesActual = mesDe(hoy)
  const desde = acuerdo ? mesDe(acuerdo.acordado_en) : null

  return meses.map((periodo) => {
    const delMes = aportes.filter(
      (a) => a.periodo === periodo && !(a.moneda === 'dinero' && a.campana_id !== null),
    )
    const suma = (moneda: Moneda, estado: EstadoAporte) =>
      redondear(
        delMes
          .filter((a) => a.moneda === moneda && a.estado === estado)
          .reduce((t, a) => t + Number((moneda === 'dinero' ? a.monto : a.horas) ?? 0), 0),
      )
    const comprometido = acuerdo && desde !== null && desde <= periodo

    return {
      periodo,
      iniciado: periodo <= mesActual,
      comprometidoDinero: comprometido ? Number(acuerdo.monto_mensual) : 0,
      comprometidoHoras: comprometido ? Number(acuerdo.horas_mensuales) : 0,
      aportadoDinero: suma('dinero', 'confirmado'),
      aportadoHoras: suma('horas', 'confirmado'),
      horasPorConfirmar: suma('horas', 'registrado'),
    }
  })
}

/** Filas de public.resumen_economico → el mismo formato de mes. */
export function mesesDeResumen(
  filas: {
    periodo: string
    comprometido_dinero: number
    comprometido_horas: number
    aportado_dinero: number
    aportado_horas: number
    horas_por_confirmar: number
  }[],
  hoy: string,
): Mes[] {
  const mesActual = mesDe(hoy)
  return filas.map((f) => ({
    periodo: f.periodo,
    iniciado: f.periodo <= mesActual,
    comprometidoDinero: Number(f.comprometido_dinero),
    comprometidoHoras: Number(f.comprometido_horas),
    aportadoDinero: Number(f.aportado_dinero),
    aportadoHoras: Number(f.aportado_horas),
    horasPorConfirmar: Number(f.horas_por_confirmar),
  }))
}

/** Lo que va del anio: solo los meses ya iniciados. */
export function totalesALaFecha(meses: Mes[]): Totales {
  const iniciados = meses.filter((m) => m.iniciado)
  const sumar = (campo: keyof Omit<Mes, 'periodo' | 'iniciado'>) =>
    redondear(iniciados.reduce((t, m) => t + m[campo], 0))

  const comprometidoDinero = sumar('comprometidoDinero')
  const comprometidoHoras = sumar('comprometidoHoras')
  const aportadoDinero = sumar('aportadoDinero')
  const aportadoHoras = sumar('aportadoHoras')

  return {
    comprometidoDinero,
    comprometidoHoras,
    aportadoDinero,
    aportadoHoras,
    horasPorConfirmar: sumar('horasPorConfirmar'),
    porCompletarDinero: Math.max(0, redondear(comprometidoDinero - aportadoDinero)),
    porCompletarHoras: Math.max(0, redondear(comprometidoHoras - aportadoHoras)),
  }
}

/** Como va un mes: completo, por completar o todavia por venir. */
export function estadoDelMes(mes: Mes): 'por-venir' | 'completo' | 'por-completar' | 'sin-acuerdo' {
  if (!mes.iniciado) return 'por-venir'
  if (mes.comprometidoDinero === 0 && mes.comprometidoHoras === 0) return 'sin-acuerdo'
  return mes.aportadoDinero >= mes.comprometidoDinero && mes.aportadoHoras >= mes.comprometidoHoras
    ? 'completo'
    : 'por-completar'
}

/**
 * Proyeccion del anio, en las dos monedas.
 *
 * - `siSeCumple`: lo aportado hasta hoy mas lo comprometido de los meses que
 *   todavia no empiezan. Es "si desde ahora cada familia cumple su acuerdo".
 * - `alRitmoActual`: el cumplimiento de lo que va del anio aplicado a todo lo
 *   comprometido. Sin meses iniciados, no hay ritmo que medir.
 */
export function proyeccion(meses: Mes[]) {
  const aFecha = totalesALaFecha(meses)
  const futuros = meses.filter((m) => !m.iniciado)
  const anual = (campo: 'comprometidoDinero' | 'comprometidoHoras') =>
    redondear(meses.reduce((t, m) => t + m[campo], 0))

  const ritmo = (aportado: number, comprometido: number) =>
    comprometido > 0 ? aportado / comprometido : null

  const ritmoDinero = ritmo(aFecha.aportadoDinero, aFecha.comprometidoDinero)
  const ritmoHoras = ritmo(aFecha.aportadoHoras, aFecha.comprometidoHoras)

  return {
    comprometidoDinero: anual('comprometidoDinero'),
    comprometidoHoras: anual('comprometidoHoras'),
    siSeCumpleDinero: redondear(
      aFecha.aportadoDinero + futuros.reduce((t, m) => t + m.comprometidoDinero, 0),
    ),
    siSeCumpleHoras: redondear(
      aFecha.aportadoHoras + futuros.reduce((t, m) => t + m.comprometidoHoras, 0),
    ),
    alRitmoActualDinero:
      ritmoDinero === null ? null : redondear(ritmoDinero * anual('comprometidoDinero')),
    alRitmoActualHoras:
      ritmoHoras === null ? null : redondear(ritmoHoras * anual('comprometidoHoras')),
    cumplimientoDinero: ritmoDinero,
    cumplimientoHoras: ritmoHoras,
  }
}
