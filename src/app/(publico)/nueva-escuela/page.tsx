import { FormularioNuevaEscuela } from '@/features/tenencia/components/formulario-nueva-escuela'

export default function PaginaNuevaEscuela() {
  return (
    <div className="space-y-6">
      <h1 className="font-titulo text-2xl text-tierra-800">Crear una escuela</h1>
      <p className="text-texto-suave">
        Quedaras como su primer administrador. Todo lo demas se configura
        despues.
      </p>

      <FormularioNuevaEscuela />
    </div>
  )
}
