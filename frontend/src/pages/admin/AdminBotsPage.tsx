import { useEffect, useState } from 'react'
import { Settings, Plus, Pencil, Trash2, Loader2, Save, X } from 'lucide-react'
import { fetchBots, createBot, updateBot, deleteBot } from '@/services/api'
import type { Bot, BotCreate } from '@/types'
import { cn } from '@/lib/utils'

const EMPTY_FORM: BotCreate = {
  name: '', description: '', requires_ui: false,
  script_path: '', script_args: [], page_slug: '',
  enabled: true, icon: 'Bot',
  supports_data_input: false, supports_scheduling: false,
}

export default function AdminBotsPage() {
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<BotCreate>(EMPTY_FORM)
  const [error, setError] = useState('')

  const load = async () => {
    try { setBots(await fetchBots()) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(EMPTY_FORM); setEditing(null); setShowCreate(true); setError('') }
  const openEdit = (bot: Bot) => {
    setForm({ name: bot.name, description: bot.description, requires_ui: bot.requires_ui, script_path: bot.script_path, script_args: bot.script_args, page_slug: bot.page_slug, enabled: bot.enabled, icon: bot.icon, supports_data_input: bot.supports_data_input ?? false, supports_scheduling: bot.supports_scheduling ?? false })
    setEditing(bot.id); setShowCreate(true); setError('')
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (editing) { await updateBot(editing, form) }
      else { await createBot(form) }
      await load(); setShowCreate(false); setEditing(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este bot?')) return
    await deleteBot(id); await load()
  }

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary-600" />
            Gestión de Bots
          </h1>
          <p className="text-sm text-gray-500 mt-1">Registra y administra los bots del orquestador.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo bot
        </button>
      </div>

      {/* Form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-primary-200 shadow-sm p-6 animate-slideUp">
          <h2 className="font-semibold text-gray-800 mb-4">{editing ? 'Editar bot' : 'Nuevo bot'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Nombre', field: 'name' as const, placeholder: 'Robot Extracción MongoDB' },
              { label: 'Slug de página', field: 'page_slug' as const, placeholder: 'robot-extraccion-mongo' },
              { label: 'Ruta del script', field: 'script_path' as const, placeholder: 'c:\\apps\\RobotExtraccionMongo\\main.py' },
              { label: 'Ícono (lucide)', field: 'icon' as const, placeholder: 'Bot' },
            ].map(({ label, field, placeholder }) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                <input
                  value={form[field] as string}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.requires_ui} onChange={(e) => setForm({ ...form, requires_ui: e.target.checked })} className="rounded" />
                Requiere UI (máx 1 simultáneo)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="rounded" />
                Habilitado
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.supports_data_input} onChange={(e) => setForm({ ...form, supports_data_input: e.target.checked })} className="rounded" />
                Entrada de datos configurable
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.supports_scheduling} onChange={(e) => setForm({ ...form, supports_scheduling: e.target.checked })} className="rounded" />
                Programación configurable
              </label>
            </div>
          </div>
          {error && <p className="text-xs text-danger-600 mt-3">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </button>
            <button onClick={() => { setShowCreate(false); setEditing(null) }} className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium">
              <X className="w-4 h-4" />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Bot</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Script</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Tipo</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Estado</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bots.map((bot) => (
              <tr key={bot.id} className="hover:bg-gray-50">
                <td className="px-5 py-4">
                  <p className="font-medium text-gray-900">{bot.name}</p>
                  <p className="text-xs text-gray-400">{bot.description}</p>
                  <p className="text-xs text-gray-300 font-mono mt-0.5">/bots/{bot.page_slug}</p>
                </td>
                <td className="px-5 py-4 font-mono text-xs text-gray-500 max-w-[200px] truncate">{bot.script_path}</td>
                <td className="px-5 py-4">
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium', bot.requires_ui ? 'bg-warning-50 text-warning-700' : 'bg-gray-100 text-gray-600')}>
                    {bot.requires_ui ? 'UI' : 'Headless'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium', bot.enabled ? 'bg-success-50 text-success-700' : 'bg-gray-100 text-gray-500')}>
                    {bot.enabled ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(bot)} className="text-gray-400 hover:text-primary-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(bot.id)} className="text-gray-400 hover:text-danger-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bots.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Settings className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Sin bots registrados.</p>
          </div>
        )}
      </div>
    </div>
  )
}
