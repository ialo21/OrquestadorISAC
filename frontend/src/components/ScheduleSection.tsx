import { useCallback, useEffect, useState } from 'react'
import {
  Plus, Trash2, Save, X, Loader2, ToggleLeft, ToggleRight, Clock,
} from 'lucide-react'
import {
  fetchBotSchedules, createSchedule, updateSchedule, deleteSchedule,
} from '@/services/api'
import type { BotSchedule, FrequencyKind, ScheduleType } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  botId: string
  onOpenCreate?: (fn: () => void) => void
}

const FREQ_LABELS: Record<FrequencyKind, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
}

const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const EMPTY_FORM = {
  enabled: true,
  type: 'dates' as ScheduleType,
  scheduled_dates: [] as string[],
  frequency: 'daily' as FrequencyKind,
  frequency_days: [1, 16],
  frequency_weekday: 0,
  time: '08:00',
  input_data: {} as Record<string, string>,
}

export default function ScheduleSection({ botId, onOpenCreate }: Props) {
  const [schedules, setSchedules] = useState<BotSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [newDate, setNewDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setSchedules(await fetchBotSchedules(botId))
    } finally {
      setLoading(false)
    }
  }, [botId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    onOpenCreate?.(openCreate)
  // Solo registrar una vez al montar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreate = useCallback(() => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
    setError('')
  }, [])

  const openEdit = (s: BotSchedule) => {
    setForm({
      enabled: s.enabled,
      type: s.type,
      scheduled_dates: [...s.scheduled_dates],
      frequency: s.frequency ?? 'daily',
      frequency_days: [...s.frequency_days],
      frequency_weekday: s.frequency_weekday ?? 0,
      time: s.time,
      input_data: { ...s.input_data },
    })
    setEditingId(s.id)
    setShowForm(true)
    setError('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      if (editingId) {
        await updateSchedule(editingId, form)
      } else {
        await createSchedule(botId, form)
      }
      await load()
      setShowForm(false)
      setEditingId(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta programación?')) return
    await deleteSchedule(id)
    await load()
  }

  const handleToggle = async (s: BotSchedule) => {
    await updateSchedule(s.id, { enabled: !s.enabled })
    await load()
  }

  const addDate = () => {
    if (newDate && !form.scheduled_dates.includes(newDate)) {
      setForm({ ...form, scheduled_dates: [...form.scheduled_dates, newDate].sort() })
      setNewDate('')
    }
  }

  const removeDate = (d: string) => {
    setForm({ ...form, scheduled_dates: form.scheduled_dates.filter((x) => x !== d) })
  }

  const toggleDay = (day: number) => {
    const days = form.frequency_days.includes(day)
      ? form.frequency_days.filter((d) => d !== day)
      : [...form.frequency_days, day].sort((a, b) => a - b)
    setForm({ ...form, frequency_days: days })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Lista de schedules existentes */}
      {schedules.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 italic py-2">Sin programaciones configuradas.</p>
      )}

      {schedules.map((s) => (
        <div
          key={s.id}
          className={cn(
            'flex items-center justify-between gap-3 border rounded-lg px-4 py-3 text-sm transition-colors',
            s.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60',
          )}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-medium text-gray-700">{s.time}</span>
              <span className="text-gray-400">·</span>
              {s.type === 'dates' ? (
                <span className="text-gray-500">
                  {s.scheduled_dates.length} fecha{s.scheduled_dates.length !== 1 ? 's' : ''}
                  {s.scheduled_dates.length > 0 && (
                    <span className="text-gray-400 ml-1">
                      ({s.scheduled_dates.slice(0, 3).join(', ')}{s.scheduled_dates.length > 3 ? '…' : ''})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-gray-500">
                  {FREQ_LABELS[s.frequency ?? 'daily']}
                  {s.frequency === 'weekly' && s.frequency_weekday != null && (
                    <span className="text-gray-400 ml-1">({WEEKDAY_LABELS[s.frequency_weekday]})</span>
                  )}
                  {(s.frequency === 'biweekly' || s.frequency === 'monthly') && s.frequency_days.length > 0 && (
                    <span className="text-gray-400 ml-1">(días {s.frequency_days.join(', ')})</span>
                  )}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => handleToggle(s)} className="text-gray-400 hover:text-primary-600 transition-colors" title={s.enabled ? 'Deshabilitar' : 'Habilitar'}>
              {s.enabled ? <ToggleRight className="w-5 h-5 text-primary-500" /> : <ToggleLeft className="w-5 h-5" />}
            </button>
            <button onClick={() => openEdit(s)} className="text-gray-400 hover:text-primary-600 transition-colors text-xs font-medium">
              Editar
            </button>
            <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-danger-600 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Formulario crear/editar */}
      {showForm && (
        <div className="border border-primary-200 rounded-xl p-5 bg-primary-50/30 space-y-4 animate-slideUp">
          <h4 className="font-semibold text-gray-800 text-sm">
            {editingId ? 'Editar programación' : 'Nueva programación'}
          </h4>

          {/* Tipo */}
          <div className="flex gap-3">
            {(['dates', 'frequency'] as ScheduleType[]).map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, type: t })}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                  form.type === t
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300',
                )}
              >
                {t === 'dates' ? 'Fechas específicas' : 'Frecuencia'}
              </button>
            ))}
          </div>

          {/* Hora */}
          <div className="max-w-[200px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Hora de ejecución</label>
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          {/* Fechas específicas */}
          {form.type === 'dates' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-500">Fechas programadas</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
                <button
                  onClick={addDate}
                  disabled={!newDate}
                  className="flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar
                </button>
              </div>
              {form.scheduled_dates.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.scheduled_dates.map((d) => (
                    <span key={d} className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-600">
                      {d}
                      <button onClick={() => removeDate(d)} className="text-gray-400 hover:text-danger-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Frecuencia */}
          {form.type === 'frequency' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Frecuencia</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value as FrequencyKind })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                >
                  {Object.entries(FREQ_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {form.frequency === 'weekly' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Día de la semana</label>
                  <select
                    value={form.frequency_weekday}
                    onChange={(e) => setForm({ ...form, frequency_weekday: Number(e.target.value) })}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                  >
                    {WEEKDAY_LABELS.map((label, i) => (
                      <option key={i} value={i}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              {(form.frequency === 'biweekly' || form.frequency === 'monthly') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Días del mes {form.frequency === 'biweekly' && '(selecciona 2)'}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={cn(
                          'w-9 h-9 rounded-lg text-xs font-medium border transition-colors',
                          form.frequency_days.includes(day)
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300',
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs text-danger-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null) }}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
