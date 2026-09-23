'use client'

import { useActionState, useState } from 'react'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { AreaTexto } from '@/shared/ui/area-texto'
import { BotonEnvio } from '@/shared/ui/boton-envio'
import { Campo } from '@/shared/ui/campo'
import { useCerrarAlCompletar } from '@/shared/ui/panel-lateral'
import { Seleccion } from '@/shared/ui/seleccion'

/**
 * Formularios de economia. Todos viven en paneles laterales y se cierran
 * solos al guardar.
 *
 * Vocabulario: "acuerdo", "aporte", "por completar". Nunca "deuda" ni "pago
 * atrasado" (waldorf-domain, seccion Tono).
 */

type Accion = (previo: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>

type Opcion = { id: string; nombre: string }

function Mensajes({ estado }: { estado: EstadoFormulario }) {
  return estado.error ? (
    <p role="alert" className="text-sm text-alerta">
      {estado.error}
    </p>
  ) : null
}

export function FormularioTramo({
  accion,
  tramo,
}: {
  accion: Accion
  tramo?: { nombre: string; monto_sugerido: number | null; horas_sugeridas: number | null }
}) {
  const [estado, enviar] = useActionState(accion, estadoInicial)
  useCerrarAlCompletar(estado)

  return (
    <form action={enviar} className="space-y-5">
      <Campo
        id="nombre"
        etiqueta="Nombre del tramo"
        placeholder="Tramo B"
        defaultValue={tramo?.nombre}
        required
        errores={estado.errores?.nombre}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="montoSugerido"
          etiqueta="Aporte mensual sugerido"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          defaultValue={tramo?.monto_sugerido ?? ''}
          errores={estado.errores?.montoSugerido}
        />
        <Campo
          id="horasSugeridas"
          etiqueta="Horas al mes sugeridas"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.5"
          defaultValue={tramo?.horas_sugeridas ?? ''}
          errores={estado.errores?.horasSugeridas}
        />
      </div>
      <Mensajes estado={estado} />
      <BotonEnvio esperando="Guardando...">{tramo ? 'Guardar el tramo' : 'Crear el tramo'}</BotonEnvio>
    </form>
  )
}

export function FormularioAcuerdo({
  accion,
  tramos,
  acuerdo,
  inicioDelAnio,
}: {
  accion: Accion
  tramos: { id: string; nombre: string; monto_sugerido: number | null; horas_sugeridas: number | null }[]
  acuerdo?: {
    tramo_id: string | null
    monto_mensual: number
    horas_mensuales: number
    acordado_en: string
    notas: string | null
  }
  inicioDelAnio: string
}) {
  const [estado, enviar] = useActionState(accion, estadoInicial)
  useCerrarAlCompletar(estado)
  const [monto, setMonto] = useState(String(acuerdo?.monto_mensual ?? ''))
  const [horas, setHoras] = useState(String(acuerdo?.horas_mensuales ?? ''))

  // Elegir un tramo propone sus montos; se pueden ajustar: el tramo sugiere,
  // el acuerdo lo conversa cada familia.
  function alElegirTramo(id: string) {
    const tramo = tramos.find((t) => t.id === id)
    if (!tramo) return
    setMonto(String(tramo.monto_sugerido ?? 0))
    setHoras(String(tramo.horas_sugeridas ?? 0))
  }

  return (
    <form action={enviar} className="space-y-5">
      <Seleccion
        id="tramoId"
        etiqueta="Tramo"
        defaultValue={acuerdo?.tramo_id ?? ''}
        onChange={(e) => alElegirTramo(e.target.value)}
        ayuda="Propone el aporte y las horas del tramo. Después se pueden ajustar."
        errores={estado.errores?.tramoId}
      >
        <option value="">Sin tramo</option>
        {tramos.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nombre}
          </option>
        ))}
      </Seleccion>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="montoMensual"
          etiqueta="Aporte mensual"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          required
          errores={estado.errores?.montoMensual}
        />
        <Campo
          id="horasMensuales"
          etiqueta="Horas de trabajo al mes"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.5"
          value={horas}
          onChange={(e) => setHoras(e.target.value)}
          required
          errores={estado.errores?.horasMensuales}
        />
      </div>

      <Campo
        id="desde"
        etiqueta="Desde"
        type="date"
        defaultValue={acuerdo?.acordado_en ?? inicioDelAnio}
        ayuda="El acuerdo cuenta desde este mes. Una familia que llega a mitad de año no tiene meses anteriores por completar."
        required
        errores={estado.errores?.desde}
      />

      <AreaTexto
        id="notas"
        etiqueta="Notas (opcional)"
        defaultValue={acuerdo?.notas ?? ''}
        rows={2}
        maxLength={500}
        errores={estado.errores?.notas}
      />

      <Mensajes estado={estado} />
      <BotonEnvio esperando="Guardando...">Guardar el acuerdo</BotonEnvio>
    </form>
  )
}

/** Mes actual como 'YYYY-MM', para `<input type="month">`. */
const comoMes = (fecha: string) => fecha.slice(0, 7)

function CamposDeDestino({
  comisiones,
  campanas,
  estado,
}: {
  comisiones: Opcion[]
  campanas: Opcion[]
  estado: EstadoFormulario
}) {
  if (comisiones.length === 0 && campanas.length === 0) return null
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {comisiones.length > 0 && (
        <Seleccion
          id="comisionId"
          etiqueta="Comisión (opcional)"
          defaultValue=""
          errores={estado.errores?.comisionId}
        >
          <option value="">Ninguna</option>
          {comisiones.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Seleccion>
      )}
      {campanas.length > 0 && (
        <Seleccion
          id="campanaId"
          etiqueta="Campaña (opcional)"
          defaultValue=""
          errores={estado.errores?.campanaId}
        >
          <option value="">Ninguna</option>
          {campanas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Seleccion>
      )}
    </div>
  )
}

/** La administracion registra un aporte en dinero o en horas. Queda confirmado. */
export function FormularioAporte({
  accion,
  hoy,
  comisiones,
  campanas,
}: {
  accion: Accion
  hoy: string
  comisiones: Opcion[]
  campanas: Opcion[]
}) {
  const [estado, enviar] = useActionState(accion, estadoInicial)
  useCerrarAlCompletar(estado)
  const [moneda, setMoneda] = useState<'dinero' | 'horas'>('dinero')

  return (
    <form action={enviar} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm text-texto-suave">Qué se aporta</legend>
        <div className="flex gap-2">
          {(['dinero', 'horas'] as const).map((m) => (
            <label
              key={m}
              className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-suave border-2 border-borde text-sm has-[:checked]:border-primario has-[:checked]:bg-dia-activo has-[:checked]:font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primario"
            >
              <input
                type="radio"
                name="moneda"
                value={m}
                checked={moneda === m}
                onChange={() => setMoneda(m)}
                className="sr-only"
              />
              {m === 'dinero' ? 'Dinero' : 'Horas de trabajo'}
            </label>
          ))}
        </div>
      </fieldset>

      <Campo
        id="cantidad"
        etiqueta={moneda === 'dinero' ? 'Monto' : 'Horas'}
        type="number"
        inputMode="decimal"
        min={0}
        step={moneda === 'dinero' ? 'any' : '0.5'}
        required
        errores={estado.errores?.cantidad}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="periodo"
          etiqueta="Mes al que corresponde"
          type="month"
          defaultValue={comoMes(hoy)}
          required
          errores={estado.errores?.periodo}
        />
        <Campo
          id="fecha"
          etiqueta={moneda === 'dinero' ? 'Fecha en que llegó' : 'Fecha del trabajo'}
          type="date"
          defaultValue={hoy}
          required
          errores={estado.errores?.fecha}
        />
      </div>

      <CamposDeDestino comisiones={comisiones} campanas={campanas} estado={estado} />

      <Campo
        id="descripcion"
        etiqueta="Detalle (opcional)"
        placeholder={moneda === 'dinero' ? 'Transferencia' : 'Minga del huerto'}
        maxLength={300}
        errores={estado.errores?.descripcion}
      />

      <Mensajes estado={estado} />
      <BotonEnvio esperando="Registrando...">Registrar el aporte</BotonEnvio>
    </form>
  )
}

/** Una familia registra sus horas. Quedan por confirmar por la administracion. */
export function FormularioMisHoras({
  accion,
  hoy,
  comisiones,
  campanas,
}: {
  accion: Accion
  hoy: string
  comisiones: Opcion[]
  campanas: Opcion[]
}) {
  const [estado, enviar] = useActionState(accion, estadoInicial)
  useCerrarAlCompletar(estado)

  return (
    <form action={enviar} className="space-y-5">
      <AreaTexto
        id="descripcion"
        etiqueta="Qué hicieron"
        placeholder="Minga del huerto, arreglo de la sala, cocina de la fiesta..."
        rows={2}
        maxLength={300}
        required
        errores={estado.errores?.descripcion}
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <Campo
          id="horas"
          etiqueta="Horas"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.5"
          required
          errores={estado.errores?.horas}
        />
        <Campo
          id="fecha"
          etiqueta="Fecha"
          type="date"
          defaultValue={hoy}
          required
          errores={estado.errores?.fecha}
        />
        <Campo
          id="periodo"
          etiqueta="Cuentan para"
          type="month"
          defaultValue={comoMes(hoy)}
          required
          errores={estado.errores?.periodo}
        />
      </div>

      <CamposDeDestino comisiones={comisiones} campanas={campanas} estado={estado} />

      <p className="text-sm text-texto-suave">
        Quedan por confirmar hasta que la administración las revise.
      </p>

      <Mensajes estado={estado} />
      <BotonEnvio esperando="Registrando...">Registrar mis horas</BotonEnvio>
    </form>
  )
}

export function FormularioCampana({
  accion,
  comisiones,
  epocas,
  comisionObligatoria,
}: {
  accion: Accion
  comisiones: Opcion[]
  epocas: Opcion[]
  /** Quien no es gestor solo crea campanas de sus comisiones (campanas_comision). */
  comisionObligatoria: boolean
}) {
  const [estado, enviar] = useActionState(accion, estadoInicial)
  useCerrarAlCompletar(estado)

  return (
    <form action={enviar} className="space-y-5">
      <Campo
        id="nombre"
        etiqueta="Nombre"
        placeholder="Techo del galpón"
        required
        errores={estado.errores?.nombre}
      />
      <AreaTexto
        id="descripcion"
        etiqueta="Para qué (opcional)"
        rows={2}
        maxLength={1000}
        errores={estado.errores?.descripcion}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="metaMonto"
          etiqueta="Meta en dinero"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          errores={estado.errores?.metaMonto}
        />
        <Campo
          id="metaHoras"
          etiqueta="Meta en horas"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.5"
          errores={estado.errores?.metaHoras}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Seleccion
          id="comisionId"
          etiqueta="Comisión"
          defaultValue={comisionObligatoria ? comisiones[0]?.id : ''}
          errores={estado.errores?.comisionId}
        >
          {!comisionObligatoria && <option value="">Toda la escuela</option>}
          {comisiones.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Seleccion>
        <Seleccion
          id="epocaId"
          etiqueta="Época (opcional)"
          defaultValue=""
          errores={estado.errores?.epocaId}
        >
          <option value="">Ninguna</option>
          {epocas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </Seleccion>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="inicio" etiqueta="Desde (opcional)" type="date" errores={estado.errores?.inicio} />
        <Campo id="fin" etiqueta="Hasta (opcional)" type="date" errores={estado.errores?.fin} />
      </div>
      <Mensajes estado={estado} />
      <BotonEnvio esperando="Creando...">Crear la campaña</BotonEnvio>
    </form>
  )
}

export function FormularioComisionEconomia({
  accion,
  comisiones,
}: {
  accion: Accion
  comisiones: { id: string; nombre: string; ve_economia: boolean }[]
}) {
  const [estado, enviar] = useActionState(accion, estadoInicial)
  useCerrarAlCompletar(estado)

  return (
    <form action={enviar} className="space-y-5">
      <Seleccion
        id="comisionId"
        etiqueta="Comisión que ve el panel económico"
        defaultValue={comisiones.find((c) => c.ve_economia)?.id ?? ''}
        ayuda="Sus integrantes ven los totales por mes, cuántas familias están al día y la proyección. Nunca lo que aportó cada familia."
      >
        <option value="">Ninguna</option>
        {comisiones.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </Seleccion>
      <Mensajes estado={estado} />
      <BotonEnvio esperando="Guardando...">Guardar</BotonEnvio>
    </form>
  )
}
