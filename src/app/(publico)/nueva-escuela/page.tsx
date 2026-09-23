import { FormularioNuevaEscuela } from '@/features/tenencia/components/formulario-nueva-escuela'

export default function PaginaNuevaEscuela() {
  return (
    <div className="space-y-6">
      <h1 className="font-titulo text-2xl text-primario-oscuro">Crear una escuela</h1>
      <p className="text-texto-suave">
        Quedarás como su primer administrador. Todo lo demás se configura
        después.
      </p>

      <FormularioNuevaEscuela />
    </div>
  )
}
