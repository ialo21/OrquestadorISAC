import { useCallback, useState } from 'react'
import { Server, AlertTriangle, Info, CheckSquare, Square } from 'lucide-react'
import BotPage from './BotPage'
import type { GetInputDataFn } from './BotPage'

// Lista de servidores disponibles basada en el CSV de configuración
const SERVIDORES_DISPONIBLES = [
  { id: 'Anubis', name: 'Anubis', rutas: 1, descripcion: 'D:\\Sistemas Interseguro\\Interseguro.Samp.Ws' },
  { id: 'Atem', name: 'Atem', rutas: 1, descripcion: 'D:\\Sistemas Interseguro\\Interseguro.Samp.Web' },
  { id: 'Hotei', name: 'Hotei', rutas: 5, descripcion: 'C:\\inetpub\\wwwroot (múltiples servicios)' },
  { id: 'Inari', name: 'Inari', rutas: 4, descripcion: 'D:\\AplicacionesWebInterseguro' },
  { id: 'ISAP00V4030SA', name: 'ISAP00V4030SA', rutas: 4, descripcion: 'D:\\ETL, D:\\ArchivosSSIS, D:\\DTSX' },
  { id: 'S465VP', name: 'S465VP', rutas: 1, descripcion: 'C:\\ExactusERP' },
]

export default function RPAMoniObjetosPage() {
  const [selectedServers, setSelectedServers] = useState<Set<string>>(new Set())
  const [validationError, setValidationError] = useState('')

  const toggleServer = (serverId: string) => {
    setSelectedServers((prev) => {
      const next = new Set(prev)
      if (next.has(serverId)) {
        next.delete(serverId)
      } else {
        next.add(serverId)
      }
      return next
    })
    setValidationError('')
  }

  const selectAll = () => {
    setSelectedServers(new Set(SERVIDORES_DISPONIBLES.map((s) => s.id)))
    setValidationError('')
  }

  const clearAll = () => {
    setSelectedServers(new Set())
    setValidationError('')
  }

  const getInputData: GetInputDataFn = useCallback(() => {
    setValidationError('')

    if (selectedServers.size === 0) {
      setValidationError('Debes seleccionar al menos un servidor.')
      return null
    }

    // Convertir Set a string separado por comas
    const servidores = Array.from(selectedServers).join(',')
    return { servidores }
  }, [selectedServers])

  const totalRutas = SERVIDORES_DISPONIBLES
    .filter((s) => selectedServers.has(s.id))
    .reduce((sum, s) => sum + s.rutas, 0)

  return (
    <BotPage botId="rpa-moni-objetos" getInputData={getInputData}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Server className="w-4 h-4 text-primary-500" />
            <span className="font-medium">Selección de servidores</span>
            <span className="text-xs text-gray-400">
              (cada servidor ejecuta RDP y extrae objetos de aplicación)
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium"
            >
              Seleccionar todos
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={clearAll}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Grid de servidores */}
        <div className="grid grid-cols-1 gap-2">
          {SERVIDORES_DISPONIBLES.map((servidor) => {
            const isSelected = selectedServers.has(servidor.id)
            return (
              <button
                key={servidor.id}
                onClick={() => toggleServer(servidor.id)}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-primary-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{servidor.name}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {servidor.rutas} ruta{servidor.rutas > 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{servidor.descripcion}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Resumen de selección */}
        {selectedServers.size > 0 && (
          <div className="flex items-start gap-2 bg-primary-50 border border-primary-200 rounded-lg px-3 py-2.5">
            <Info className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-primary-700">
              <span className="font-semibold">{selectedServers.size} servidor(es) seleccionado(s)</span> ·{' '}
              {totalRutas} ruta{totalRutas > 1 ? 's' : ''} total{totalRutas > 1 ? 'es' : ''} a procesar
              <br />
              <span className="text-primary-600">
                Los resultados se organizarán por servidor, y cada servidor contendrá sus rutas con evidencias
                (screenshots, CSVs e IPEs).
              </span>
            </p>
          </div>
        )}

        {selectedServers.size === 0 && (
          <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
            <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500">
              Selecciona uno o más servidores para iniciar la extracción. El bot se conectará por RDP a cada
              servidor y procesará todas sus rutas secuencialmente.
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
