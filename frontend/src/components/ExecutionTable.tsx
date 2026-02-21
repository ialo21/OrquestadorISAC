import { useState } from 'react'
import { Download, FileText, Archive, ChevronDown, ChevronRight, XCircle, Loader2, Eye, Timer } from 'lucide-react'
import type { BotExecution, ExecutionFile, ExecutionFiles } from '@/types'
import { cn, formatDate, formatDuration, formatBytes, formatElapsed } from '@/lib/utils'
import { fetchExecutionFiles, downloadZipUrl, cancelExecution } from '@/services/api'
import LogViewerModal from '@/components/LogViewerModal'
import { useLiveTimer } from '@/hooks/useLiveTimer'

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  queued:      { label: 'En cola',    classes: 'bg-gray-100 text-gray-600' },
  running:     { label: 'En curso',   classes: 'bg-warning-50 text-warning-700 animate-pulse' },
  completed:   { label: 'Completado', classes: 'bg-success-50 text-success-700' },
  failed:      { label: 'Fallido',    classes: 'bg-danger-50 text-danger-700' },
  cancelled:   { label: 'Cancelado',  classes: 'bg-gray-100 text-gray-500' },
  interrupted: { label: 'Interrumpido', classes: 'bg-gray-100 text-gray-500' },
}

interface Props {
  executions: BotExecution[]
  showBotName?: boolean
  onCancelSuccess?: () => void
}

function FilesRow({ execution }: { execution: BotExecution }) {
  const [files, setFiles] = useState<ExecutionFiles | null>(null)
  const [loading, setLoading] = useState(false)
  const [viewFile, setViewFile] = useState<ExecutionFile | null>(null)
  const token = localStorage.getItem('token')
  const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8002'

  const load = async (force = false) => {
    if (files && !force) return
    setLoading(true)
    try {
      const f = await fetchExecutionFiles(execution.id)
      setFiles(f)
    } finally {
      setLoading(false)
    }
  }

  const fileUrl = (path: string) =>
    `${apiBase}/api/executions/${execution.id}/download/${path}?token=${token}`

  const allCount = (files?.logs.length ?? 0) + (files?.resultados.length ?? 0)

  const isTextFile = (name: string) =>
    /\.(log|txt|json|csv|xml|html|md|yaml|yml|ini|cfg|out|err)$/i.test(name)

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (files) {
              setFiles(null)
            } else {
              void load()
            }
          }}
          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
          {files ? 'Ocultar archivos' : 'Ver archivos'}
          {files && <span className="text-gray-400">({allCount})</span>}
        </button>
        {files && (
          <button
            onClick={() => void load(true)}
            className="text-[11px] text-gray-400 hover:text-primary-700"
            title="Refrescar lista"
          >
            Recargar
          </button>
        )}
      </div>
      {files && (
        <div className="mt-2 space-y-2">
          {(['logs', 'resultados'] as const).map((cat) => (
            files[cat].length > 0 && (
              <div key={cat}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{cat}</p>
                <div className="space-y-1">
                  {files[cat].map((f) => (
                    <div key={f.path} className="flex items-center gap-1">
                      {isTextFile(f.name) && (
                        <button
                          onClick={() => setViewFile(f)}
                          title="Ver contenido"
                          className="text-gray-400 hover:text-primary-600 transition-colors flex-shrink-0"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      )}
                      <a
                        href={fileUrl(f.path)}
                        download={f.name}
                        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary-700 min-w-0"
                      >
                        <Download className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[180px]">{f.name}</span>
                        <span className="text-gray-400 flex-shrink-0">({formatBytes(f.size)})</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
          <a
            href={`${downloadZipUrl(execution.id)}?token=${token}`}
            download
            className="inline-flex items-center gap-1 text-xs bg-gray-50 hover:bg-primary-50 border border-gray-200 hover:border-primary-200 text-gray-600 hover:text-primary-700 px-2 py-1 rounded-md transition-colors"
          >
            <Archive className="w-3 h-3" />
            Descargar ZIP
          </a>
        </div>
      )}
      {viewFile && (
        <LogViewerModal
          execId={execution.id}
          file={viewFile}
          onClose={() => setViewFile(null)}
        />
      )}
    </div>
  )
}

/** Contador en vivo para ejecuciones activas (running o queued). */
function LiveDuration({ execution }: { execution: BotExecution }) {
  const isActive = execution.status === 'running' || execution.status === 'queued'
  const elapsed = useLiveTimer(execution.queued_at, isActive)

  if (!isActive) return <span className="text-gray-500">{formatDuration(execution.duration_seconds)}</span>
  if (elapsed === null) return <span className="text-gray-400">—</span>

  return (
    <span className="inline-flex items-center gap-1 font-mono text-warning-700 font-medium tabular-nums">
      <Timer className="w-3 h-3 flex-shrink-0" />
      {formatElapsed(elapsed)}
    </span>
  )
}

interface RowProps {
  ex: BotExecution
  showBotName: boolean
  expanded: boolean
  onToggle: () => void
  onCancel: (id: string) => void
  cancelling: string | null
}

function ExecutionRow({ ex, showBotName, expanded, onToggle, onCancel, cancelling }: RowProps) {
  const status = STATUS_CONFIG[ex.status] ?? STATUS_CONFIG.queued
  const colSpan = showBotName ? 8 : 7

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="py-3 pr-2">
          <button onClick={onToggle} className="text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </td>
        {showBotName && <td className="py-3 pr-4 font-medium text-gray-700">{ex.bot_name}</td>}
        <td className="py-3 pr-4">
          <span className={cn('text-xs px-2 py-1 rounded-full font-medium', status.classes)}>
            {status.label}
          </span>
        </td>
        <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{formatDate(ex.queued_at)}</td>
        <td className="py-3 pr-4">
          <LiveDuration execution={ex} />
        </td>
        <td className="py-3 pr-4 text-gray-500 truncate max-w-[160px]">{ex.triggered_by_name || ex.triggered_by}</td>
        <td className="py-3 pr-4">
          {ex.run_folder ? <FilesRow execution={ex} /> : <span className="text-gray-300 text-xs">—</span>}
        </td>
        <td className="py-3">
          {(ex.status === 'queued' || ex.status === 'running') && (
            <button
              onClick={() => onCancel(ex.id)}
              disabled={cancelling === ex.id}
              className="text-danger-500 hover:text-danger-700 disabled:opacity-40"
              title="Cancelar"
            >
              {cancelling === ex.id
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <XCircle className="w-4 h-4" />}
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50">
          <td colSpan={colSpan} className="px-6 py-3">
            <div className="text-xs text-gray-500 space-y-1">
              <p><span className="font-medium text-gray-600">ID:</span> {ex.id}</p>
              <p><span className="font-medium text-gray-600">Solicitado:</span> {formatDate(ex.queued_at)}</p>
              {ex.started_at && <p><span className="font-medium text-gray-600">Inicio real:</span> {formatDate(ex.started_at)}</p>}
              {ex.completed_at && <p><span className="font-medium text-gray-600">Fin:</span> {formatDate(ex.completed_at)}</p>}
              {ex.run_folder && <p><span className="font-medium text-gray-600">Carpeta:</span> {ex.run_folder}</p>}
              {ex.error_message && <p className="text-danger-600"><span className="font-medium">Error:</span> {ex.error_message}</p>}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function ExecutionTable({ executions, showBotName = false, onCancelSuccess }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const handleCancel = async (id: string) => {
    setCancelling(id)
    try {
      await cancelExecution(id)
      onCancelSuccess?.()
    } finally {
      setCancelling(null)
    }
  }

  if (executions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Sin ejecuciones registradas</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <th className="text-left pb-3 pr-4 w-5" />
            {showBotName && <th className="text-left pb-3 pr-4">Bot</th>}
            <th className="text-left pb-3 pr-4">Estado</th>
            <th className="text-left pb-3 pr-4">Solicitado</th>
            <th className="text-left pb-3 pr-4">Tiempo</th>
            <th className="text-left pb-3 pr-4">Disparado por</th>
            <th className="text-left pb-3 pr-4">Archivos</th>
            <th className="text-left pb-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {executions.map((ex) => (
            <ExecutionRow
              key={ex.id}
              ex={ex}
              showBotName={showBotName}
              expanded={expanded === ex.id}
              onToggle={() => setExpanded(expanded === ex.id ? null : ex.id)}
              onCancel={handleCancel}
              cancelling={cancelling}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
