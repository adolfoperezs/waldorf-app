import { Plus } from 'lucide-react'
import { notFound } from 'next/navigation'
import {
  actualizarGrupo,
  asignarGuia,
  cargarCiclosYGrupos,
  crearCiclo,
  crearGrupo,
} from '@/features/comunidad/actions/grupos'
import { ChipCiclo } from '@/features/comunidad/components/chip-ciclo'
import { FormularioCiclo } from '@/features/comunidad/components/formulario-ciclo'
import { FormularioGrupo } from '@/features/comunidad/components/formulario-grupo'
import { FormularioGuia } from '@/features/comunidad/components/formulario-guia'
import {
  ciclosDeEscuela,
  gruposConCiclo,
  guiasVigentes,
  maestrosDisponibles,
} from '@/features/comunidad/queries/comunidad'
import { NOMBRE_MODALIDAD } from '@/features/comunidad/schemas/comunidad'
import type { ContextoEscuela } from '@/features/ritmo/actions/contexto'
import { hoyEnEscuela } from '@/features/ritmo/lib/fechas'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'
import { clasesAcento } from '@/shared/design/acentos'
import { cn } from '@/shared/lib/utils'
import { BotonAccion } from '@/shared/ui/boton-accion'
import { PanelLateral } from '@/shared/ui/panel-lateral'
import { Tarjeta } from '@/shared/ui/tarjeta'

/**
 * Ciclos, grupos y maestra guia. Configuracion pedagogica: gestores
 * (administracion y colegio de maestros), como en docs/DOMAIN.md.
 */
export default async function PaginaGrupos({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { escuela, esGestor } = await cargarEscuela(slug)
  if (!esGestor) notFound()

  const ctx: ContextoEscuela = {
    escuelaId: escuela.id,
    slug: escuela.slug,
    zonaHoraria: escuela.zona_horaria,
  }

  const hoy = hoyEnEscuela(escuela.zona_horaria)
  const [ciclos, grupos, guias, maestros] = await Promise.all([
    ciclosDeEscuela(escuela.id),
    gruposConCiclo(escuela.id),
    guiasVigentes(escuela.id, hoy),
    maestrosDisponibles(escuela.id),
  ])

  const guiaDe = new Map(guias.map((g) => [g.grupoId, g]))
  const anioActual = Number(hoy.slice(0, 4))

  // Los grupos, por ciclo en el orden de la escuela; al final los que no tienen.
  const secciones = [
    ...ciclos.map((ciclo) => ({
      clave: ciclo.id,
      titulo: ciclo.nombre,
      ciclo,
      grupos: grupos.filter((g) => g.ciclo_id === ciclo.id),
    })),
    {
      clave: 'sin-ciclo',
      titulo: 'Sin ciclo',
      ciclo: null,
      grupos: grupos.filter((g) => !g.ciclo_id),
    },
  ].filter((s) => s.ciclo || s.grupos.length > 0)

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-titulo text-3xl">Grupos</h1>
          <p className="text-texto-suave">
            Cada grupo pertenece a un ciclo, y el ciclo decide qué ritmo ven sus familias.
          </p>
        </div>
        <PanelLateral
          titulo="Nuevo grupo"
          disparador={
            <>
              <Plus aria-hidden className="size-4" />
              Nuevo grupo
            </>
          }
        >
          <FormularioGrupo
            accion={crearGrupo.bind(null, ctx)}
            ciclos={ciclos}
            anioSugerido={anioActual}
          />
        </PanelLateral>
      </header>

      {(ciclos.length === 0 || grupos.length === 0) && (
        <Tarjeta className="space-y-3">
          <p className="font-titulo text-lg text-primario-oscuro">Empezar desde la plantilla</p>
          <p className="text-sm text-texto-suave">
            Crea los ciclos Grupo Semilla, Básica y Media, y los grupos de Semilla y
            de 1° a 8° básico. Lo que ya exista no se toca. Después se renombra y
            ajusta todo.
          </p>
          <BotonAccion accion={cargarCiclosYGrupos.bind(null, ctx)} variante="primario">
            Cargar ciclos y grupos
          </BotonAccion>
        </Tarjeta>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-titulo text-xl">Ciclos</h2>
          <PanelLateral
            titulo="Nuevo ciclo"
            descripcion="Una etapa de la escuela: el jardín, la básica, la media."
            variante="fantasma"
            disparador={
              <>
                <Plus aria-hidden className="size-4" />
                Nuevo ciclo
              </>
            }
          >
            <FormularioCiclo accion={crearCiclo.bind(null, ctx)} />
          </PanelLateral>
        </div>

        {ciclos.length === 0 ? (
          <p className="text-texto-suave">Todavía no hay ciclos.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-3">
            {ciclos.map((ciclo) => {
              const clases = clasesAcento(ciclo.acento)
              return (
                <li
                  key={ciclo.id}
                  className={cn('rounded-organico border-l-4 p-4', clases.borde, clases.fondo)}
                >
                  <p className="font-titulo text-lg text-primario-oscuro">{ciclo.nombre}</p>
                  <p className={cn('text-sm', clases.texto)}>
                    {NOMBRE_MODALIDAD[ciclo.modalidad]}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {secciones.map((seccion) => (
        <section key={seccion.clave} className="space-y-4">
          <h2 className="font-titulo text-xl">{seccion.titulo}</h2>

          {seccion.grupos.length === 0 ? (
            <p className="text-texto-suave">Sin grupos en este ciclo.</p>
          ) : (
            <ul className="space-y-3">
              {seccion.grupos.map((grupo) => {
                const guia = guiaDe.get(grupo.id)
                return (
                  <li key={grupo.id}>
                    <Tarjeta className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-titulo text-lg text-primario-oscuro">
                            {grupo.nombre}
                          </p>
                          <ChipCiclo ciclo={grupo.ciclo} />
                        </div>
                        <p className="text-sm text-texto-suave">
                          {guia ? `Guía: ${guia.nombre}` : 'Sin maestra o maestro guía'}
                          {' · '}cohorte {grupo.anio_cohorte}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <PanelLateral
                          titulo="Maestra o maestro guía"
                          descripcion={grupo.nombre}
                          variante="suave"
                          disparador={guia ? 'Cambiar guía' : 'Asignar guía'}
                        >
                          <FormularioGuia
                            accion={asignarGuia.bind(null, ctx, grupo.id)}
                            maestros={maestros}
                            actual={guia?.perfilId ?? null}
                          />
                        </PanelLateral>
                        <PanelLateral
                          titulo="Editar grupo"
                          descripcion={grupo.nombre}
                          variante="fantasma"
                          disparador="Editar"
                        >
                          <FormularioGrupo
                            accion={actualizarGrupo.bind(null, ctx, grupo.id)}
                            ciclos={ciclos}
                            grupo={grupo}
                            anioSugerido={anioActual}
                          />
                        </PanelLateral>
                      </div>
                    </Tarjeta>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
