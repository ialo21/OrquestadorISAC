import { useCallback, useEffect, useRef, useState } from 'react'
import { Server, AlertTriangle, Info, CheckSquare, Square, Loader2, KeyRound, Upload, Eye, EyeOff } from 'lucide-react'
import BotPage from './BotPage'
import type { GetInputDataFn } from './BotPage'
import { fetchBotServers, fetchLinuxKeys, uploadLinuxKey } from '@/services/api'
import type { BotServer, LinuxKey } from '@/types'

const BOT_ID = 'rpa-moni-objetos'

export default function RPAMoniObjetosPage() {
  const [servers, setServers] = useState<BotServer[]>([])
  const [loadingServers, setLoadingServers] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedServers, setSelectedServers] = useState<Set<string>>(new Set())
  const [validationError, setValidationError] = useState('')

  // SSH key state
  const [linuxKeys, setLinuxKeys] = useState<LinuxKey[]>([])
  const [loadingKeys, setLoadingKeys] = useState(false)
  const [selectedKey, setSelectedKey] = useState('')
  const [keyPassphrase, setKeyPassphrase] = useState('')
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchBotServers(BOT_ID)
      .then(setServers)
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoadingServers(false))
  }, [])

  const hasLinuxSelected = servers.some(
    (s) => selectedServers.has(s.id) && s.tipo === 'linux',
  )

  useEffect(() => {
    if (!hasLinuxSelected) return
    setLoadingKeys(true)
    fetchLinuxKeys(BOT_ID)
      .then((keys) => {
        setLinuxKeys(keys)
        if (keys.length > 0 && !selectedKey) setSelectedKey(keys[0].name)
      })
      .catch(() => {})
      .finally(() => setLoadingKeys(false))
  }, [hasLinuxSelected, selectedKey])

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
    setSelectedServers(new Set(servers.map((s) => s.id)))
    setValidationError('')
  }

  const clearAll = () => {
    setSelectedServers(new Set())
    setValidationError('')
  }

  const handleUploadKey = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const newKey = await uploadLinuxKey(BOT_ID, file)
      setLinuxKeys((prev) => [...prev, newKey].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedKey(newKey.name)
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Error al subir llave')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const getInputData: GetInputDataFn = useCallback(() => {
    setValidationError('')
    if (selectedServers.size === 0) {
      setValidationError('Debes seleccionar al menos un servidor.')
      return null
    }

    const data: Record<string, string> = {
      servidores: Array.from(selectedServers).join(','),
    }

    const needsKey = servers.some(
      (s) => selectedServers.has(s.id) && s.tipo === 'linux',
    )

    if (needsKey) {
      if (!selectedKey) {
        setValidationError('Debes seleccionar una llave SSH para los servidores Linux.')
        return null
      }
      if (!keyPassphrase) {
        setValidationError('Debes ingresar la passphrase de la llave SSH.')
        return null
      }
      data.linux_key_name = selectedKey
      data.linux_key_pass = keyPassphrase
    }

    return data
  }, [selectedServers, servers, selectedKey, keyPassphrase])

  const totalRutas = servers
    .filter((s) => selectedServers.has(s.id))
    .reduce((sum, s) => sum + s.rutas_count, 0)

  const linuxSelected = servers.filter((s) => selectedServers.has(s.id) && s.tipo === 'linux').length
  const windowsSelected = servers.filter((s) => selectedServers.has(s.id) && s.tipo === 'windows').length

  return (
    <BotPage botId={BOT_ID} getInputData={getInputData}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Server className="w-4 h-4 text-primary-500" />
            <span className="font-medium">Selección de servidores</span>
            <span className="text-xs text-gray-400">(Windows via RDP · Linux via SSH)</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              disabled={loadingServers || servers.length === 0}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
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

        {/* Estado de carga */}
        {loadingServers && (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
            <span>Cargando servidores...</span>
          </div>
        )}

        {!loadingServers && loadError && (
          <div className="flex items-start gap-2 bg-danger-50 border border-danger-200 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-danger-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-danger-700">
              No se pudo cargar la lista de servidores: {loadError}
            </p>
          </div>
        )}

        {/* Grid de servidores */}
        {!loadingServers && !loadError && (
          <div className="grid grid-cols-1 gap-2">
            {servers.map((servidor) => {
              const isSelected = selectedServers.has(servidor.id)
              const isLinux = servidor.tipo === 'linux'
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{servidor.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                          isLinux
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-sky-100 text-sky-700'
                        }`}
                      >
                        {isLinux ? 'LNX' : 'WIN'}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {servidor.rutas_count} ruta{servidor.rutas_count > 1 ? 's' : ''}
                      </span>
                      {isLinux && servidor.host && servidor.host !== '0.0.0.0' && (
                        <span className="text-xs text-gray-400 font-mono">{servidor.host}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">{servidor.descripcion}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Configuración SSH — solo cuando hay servidores Linux seleccionados */}
        {hasLinuxSelected && (
          <div className="border-2 border-violet-200 bg-violet-50/40 rounded-xl p-4 space-y-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-sm font-medium text-violet-800">
              <KeyRound className="w-4 h-4" />
              <span>Configuración SSH</span>
            </div>

            {/* Selector de llave */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Llave PPK</label>
                {loadingKeys ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-gray-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Cargando llaves…
                  </div>
                ) : (
                  <select
                    value={selectedKey}
                    onChange={(e) => setSelectedKey(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    {linuxKeys.length === 0 && (
                      <option value="">Sin llaves disponibles</option>
                    )}
                    {linuxKeys.map((k) => (
                      <option key={k.name} value={k.name}>
                        {k.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ppk"
                  onChange={handleUploadKey}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  title="Subir nueva llave .ppk"
                >
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  Subir llave
                </button>
              </div>
            </div>

            {/* Passphrase */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Passphrase</label>
              <div className="relative">
                <input
                  type={showPassphrase ? 'text' : 'password'}
                  value={keyPassphrase}
                  onChange={(e) => setKeyPassphrase(e.target.value)}
                  placeholder="Ingresa la passphrase de la llave"
                  autoComplete="off"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                La passphrase no se guarda ni se registra en logs.
              </p>
            </div>
          </div>
        )}

        {/* Resumen de selección */}
        {selectedServers.size > 0 && (
          <div className="flex items-start gap-2 bg-primary-50 border border-primary-200 rounded-lg px-3 py-2.5">
            <Info className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-primary-700">
              <span className="font-semibold">{selectedServers.size} servidor(es) seleccionado(s)</span>
              {' · '}
              {totalRutas} ruta{totalRutas > 1 ? 's' : ''} total{totalRutas > 1 ? 'es' : ''}
              {(linuxSelected > 0 || windowsSelected > 0) && (
                <span className="ml-1">
                  ({windowsSelected > 0 && `${windowsSelected} WIN`}
                  {windowsSelected > 0 && linuxSelected > 0 && ', '}
                  {linuxSelected > 0 && `${linuxSelected} LNX`})
                </span>
              )}
              <br />
              <span className="text-primary-600">
                {linuxSelected > 0 && windowsSelected > 0
                  ? 'Los servidores Linux (SSH) se ejecutan primero, luego los Windows (RDP).'
                  : linuxSelected > 0
                    ? 'Conexión vía SSH con llave PPK.'
                    : 'Conexión vía RDP a cada servidor.'}
              </span>
            </p>
          </div>
        )}

        {selectedServers.size === 0 && !loadingServers && !loadError && (
          <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
            <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500">
              Selecciona uno o más servidores para iniciar la extracción. Los servidores{' '}
              <span className="font-mono text-violet-600 text-xs">LNX</span> se conectan vía SSH y los{' '}
              <span className="font-mono text-sky-600 text-xs">WIN</span> vía RDP.
              Linux se procesa primero.
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
