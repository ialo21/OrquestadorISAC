import { useCallback, useState } from 'react'
import { CalendarDays, AlertTriangle, Info } from 'lucide-react'
import BotPage from './BotPage'
import type { GetInputDataFn } from './BotPage'

const MAX_RANGE_DAYS = 30

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.round(ms / 86_400_000)
}

export default function RobotExtraccionMongoPage() {
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [validationError, setValidationError] = useState('')

  const getInputData: GetInputDataFn = useCallback(() => {
    setValidationError('')

    // Sin fechas → lógica automática del bot (no se pasan env vars)
    if (!fechaDesde && !fechaHasta) {
      return {} as Record<string, string>
    }

    // Solo una de las dos → error
    if (!fechaDesde || !fechaHasta) {
      setValidationError('Si ingresas una fecha, debes completar ambas.')
      return null
    }

    if (fechaDesde > fechaHasta) {
      setValidationError('La fecha "desde" no puede ser posterior a la fecha "hasta".')
      return null
    }
    const range = daysBetween(fechaDesde, fechaHasta)
    if (range > MAX_RANGE_DAYS) {
      setValidationError(`El rango máximo permitido es de ${MAX_RANGE_DAYS} días (seleccionaste ${range}).`)
      return null
    }

    return { fecha_desde: fechaDesde, fecha_hasta: fechaHasta }
  }, [fechaDesde, fechaHasta])

  const rangeInfo = fechaDesde && fechaHasta && fechaDesde <= fechaHasta
    ? `${daysBetween(fechaDesde, fechaHasta)} días`
    : null

  return (
    <BotPage botId="robot-extraccion-mongo" getInputData={getInputData}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CalendarDays className="w-4 h-4 text-primary-500" />
          <span className="font-medium">Rango de extracción de logs</span>
          <span className="text-xs text-gray-400">(máx. {MAX_RANGE_DAYS} días · opcional)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Fecha desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => { setFechaDesde(e.target.value); setValidationError('') }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300 transition-shadow"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Fecha hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => { setFechaHasta(e.target.value); setValidationError('') }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300 transition-shadow"
            />
          </div>
        </div>

        {rangeInfo && !validationError && (
          <p className="text-xs text-gray-400">Rango seleccionado: {rangeInfo}</p>
        )}

        {!fechaDesde && !fechaHasta && (
          <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
            <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500">
              Sin fechas seleccionadas el bot calculará el rango automáticamente
              según el día de ejecución.
            </p>
          </div>
        )}

        {validationError && (
          <div className="flex items-start gap-2 bg-danger-50 border border-danger-200 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-danger-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-danger-700">{validationError}</p>
          </div>
        )}
      </div>
    </BotPage>
  )
}
