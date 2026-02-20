import { useEffect, useRef, useState } from 'react'
import { X, Download, Loader2, FileText, Copy, Check } from 'lucide-react'
import type { ExecutionFile } from '@/types'
import { formatBytes } from '@/lib/utils'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8002'

interface Props {
  execId: string
  file: ExecutionFile
  onClose: () => void
}

export default function LogViewerModal({ execId, file, onClose }: Props) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')

    fetch(
      `${BASE}/api/executions/${execId}/file-text?file_path=${encodeURIComponent(file.path)}&token=${token}`,
      { signal: controller.signal },
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`)
        return res.text()
      })
      .then((text) => {
        setContent(text)
        setLoading(false)
        // scroll al final del log
        setTimeout(() => {
          if (preRef.current) preRef.current.scrollTop = preRef.current.scrollHeight
        }, 50)
      })
      .catch((e) => {
        if (e.name !== 'AbortError') { setError(String(e)); setLoading(false) }
      })

    return () => controller.abort()
  }, [execId, file.path, token])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadUrl = `${BASE}/api/executions/${execId}/download/${file.path}?token=${token}`

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-slideUp overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="bg-gray-100 rounded-lg p-2">
            <FileText className="w-4 h-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{file.name}</p>
            <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Copiar */}
            <button
              onClick={handleCopy}
              disabled={loading || !!error}
              title="Copiar contenido"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-success-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            {/* Descargar */}
            <a
              href={downloadUrl}
              download={file.name}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar
            </a>
            {/* Cerrar */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 p-1.5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden relative max-h-[70vh]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <p className="text-sm">Cargando archivo…</p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <p className="text-sm text-danger-600 px-6 text-center">{error}</p>
            </div>
          )}
          {!loading && !error && (
            <pre
              ref={preRef}
              className="h-full max-h-[70vh] overflow-auto p-5 text-[12px] leading-relaxed font-mono text-gray-100 bg-gray-950 text-green-300 whitespace-pre-wrap break-words"
            >
              {content || <span className="text-gray-500 italic">Archivo vacío</span>}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400 font-mono truncate max-w-[60%]">{file.path}</p>
          <p className="text-xs text-gray-400">
            {content ? `${content.split('\n').length} líneas` : ''}
          </p>
        </div>
      </div>
    </div>
  )
}
