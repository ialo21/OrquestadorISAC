import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Loader2, Bot, AlertCircle, RefreshCw, Timer } from 'lucide-react'
import { fetchBot, executeBot, fetchBotExecutions, streamExecution } from '@/services/api'
import type { Bot as BotType, BotExecution } from '@/types'
import ExecutionTable from '@/components/ExecutionTable'
import { cn, formatElapsed } from '@/lib/utils'
import { useLiveTimer } from '@/hooks/useLiveTimer'

interface Props {
  botId: string
  children?: React.ReactNode
}

export default function BotPage({ botId, children }: Props) {
  const [bot, setBot] = useState<BotType | null>(null)
  const [executions, setExecutions] = useState<BotExecution[]>([])
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const esRef = useRef<EventSource | null>(null)

  const loadExecutions = useCallback(async () => {
    try {
      const data = await fetchBotExecutions(botId)
      setExecutions(data)
    } catch { /* ignore */ }
  }, [botId])

  useEffect(() => {
    fetchBot(botId).then(setBot).catch(() => setError('Bot no encontrado'))
    loadExecutions()
  }, [botId, loadExecutions])

  const handleExecute = async () => {
    setLaunching(true)
    setError('')
    setSuccessMsg('')
    try {
      const ex = await executeBot(botId)
      setSuccessMsg(`Ejecución encolada correctamente (ID: ${ex.id.slice(0, 8)}…)`)
      loadExecutions()

      // SSE: seguir estado de esta ejecución
      if (esRef.current) esRef.current.close()
      esRef.current = streamExecution(ex.id, (updated) => {
        setExecutions((prev) =>
          prev.map((e) => (e.id === updated.id ? updated : e)),
        )
        if (['completed', 'failed', 'cancelled', 'interrupted'].includes(updated.status)) {
          esRef.current?.close()
        }
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      try {
        const parsed = JSON.parse(msg)
        setError(parsed.detail ?? msg)
      } catch {
        setError(msg)
      }
    } finally {
      setLaunching(false)
    }
  }

  useEffect(() => () => { esRef.current?.close() }, [])

  const activeExecution = executions.find(
    (e) => e.status === 'running' || e.status === 'queued',
  )
  const isActive = !!activeExecution
  const elapsed = useLiveTimer(activeExecution?.queued_at, isActive)

  if (!bot) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Banner de ejecución activa con timer en vivo */}
      {activeExecution && elapsed !== null && (
        <div className={cn(
          'flex items-center gap-3 rounded-xl px-5 py-3 border text-sm font-medium',
          activeExecution.status === 'running'
            ? 'bg-warning-50 border-warning-200 text-warning-800'
            : 'bg-gray-50 border-gray-200 text-gray-600',
        )}>
          <Timer className="w-4 h-4 flex-shrink-0" />
          <span>
            {activeExecution.status === 'running' ? 'En ejecución' : 'En cola'}
            {' · '}tiempo desde solicitud:
          </span>
          <span className="font-mono text-lg tabular-nums">
            {formatElapsed(elapsed)}
          </span>
          {activeExecution.status === 'queued' && (
            <span className="text-xs text-gray-400 ml-auto">esperando turno…</span>
          )}
        </div>
      )}

      {/* Cabecera del bot */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="bg-primary-50 rounded-xl p-3 border border-primary-100">
              <Bot className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{bot.name}</h1>
                {bot.requires_ui && (
                  <span className="text-xs bg-warning-50 text-warning-700 border border-warning-200 px-2 py-0.5 rounded-full">
                    Requiere UI
                  </span>
                )}
                {!bot.enabled && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    Deshabilitado
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">{bot.description}</p>
              <p className="text-xs text-gray-400 mt-1 font-mono">{bot.script_path}</p>
            </div>
          </div>
          <button
            onClick={handleExecute}
            disabled={launching || !bot.enabled}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm',
              bot.enabled
                ? 'bg-primary-600 hover:bg-primary-700 text-white hover:shadow-md'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed',
              launching && 'opacity-70 cursor-not-allowed',
            )}
          >
            {launching
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Play className="w-4 h-4" />}
            {launching ? 'Encolando…' : 'Ejecutar'}
          </button>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mt-4 flex items-start gap-2 bg-danger-50 border border-danger-200 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 text-danger-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}
        {successMsg && (
          <div className="mt-4 bg-success-50 border border-success-200 rounded-lg px-4 py-3">
            <p className="text-sm text-success-700">{successMsg}</p>
          </div>
        )}
      </div>

      {/* Sección de parametrización — reservada por bot */}
      {children && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-800">Parametrización</h2>
          </div>
          <div className="p-5">{children}</div>
        </div>
      )}

      {/* Tabla de ejecuciones */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Ejecuciones</h2>
          <button
            onClick={loadExecutions}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Actualizar
          </button>
        </div>
        <div className="p-5">
          <ExecutionTable
            executions={executions}
            onCancelSuccess={loadExecutions}
          />
        </div>
      </div>
    </div>
  )
}
