import { useCallback, useEffect, useRef, useState } from 'react'
import { History, RefreshCw } from 'lucide-react'
import { fetchExecutions } from '@/services/api'
import type { BotExecution } from '@/types'
import ExecutionTable from '@/components/ExecutionTable'

export default function HistorialPage() {
  const [executions, setExecutions] = useState<BotExecution[]>([])
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchExecutions()
      setExecutions(data)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, 15000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [load])

  const finished = executions.filter((e) => !['running', 'queued'].includes(e.status))

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History className="w-6 h-6 text-primary-600" />
            Historial de ejecuciones
          </h1>
          <p className="text-sm text-gray-500 mt-1">Registro completo de todas las ejecuciones finalizadas.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <h2 className="font-semibold text-gray-800">Historial</h2>
            <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
              {finished.length}
            </span>
          </div>
          <div className="p-5">
            <ExecutionTable
              executions={finished}
              showBotName
              onCancelSuccess={load}
            />
          </div>
        </div>
      )}
    </div>
  )
}
