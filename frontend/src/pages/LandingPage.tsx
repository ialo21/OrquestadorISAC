import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Bot, CheckCircle, Clock, XCircle, Zap, TrendingUp, Play } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { fetchStats, fetchBots } from '@/services/api'
import type { Stats, Bot as BotType } from '@/types'
import { cn } from '@/lib/utils'

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4')}>
      <div className={cn('rounded-lg p-3', color)}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [bots, setBots] = useState<BotType[]>([])

  useEffect(() => {
    fetchStats().then(setStats).catch(() => {})
    fetchBots().then(setBots).catch(() => {})
  }, [])

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Bienvenida */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hola, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">Bienvenido al portal de automatización RPA de Interseguro.</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Ejecuciones hoy"
            value={stats.executions_today}
            icon={<TrendingUp className="w-5 h-5 text-primary-600" />}
            color="bg-primary-50"
          />
          <StatCard
            label="En curso"
            value={stats.executions_running + stats.executions_queued}
            icon={<Activity className="w-5 h-5 text-warning-600" />}
            color="bg-warning-50"
          />
          <StatCard
            label="Completadas"
            value={stats.executions_completed}
            icon={<CheckCircle className="w-5 h-5 text-success-600" />}
            color="bg-success-50"
          />
          <StatCard
            label="Fallidas"
            value={stats.executions_failed}
            icon={<XCircle className="w-5 h-5 text-danger-500" />}
            color="bg-danger-50"
          />
        </div>
      )}

      {/* Accesos rápidos a bots */}
      {bots.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-500" />
            Tus bots
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bots.map((bot) => (
              <button
                key={bot.id}
                onClick={() => navigate(`/bots/${bot.page_slug}`)}
                disabled={!bot.enabled}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left hover:border-primary-200 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="bg-primary-50 rounded-lg p-2">
                    <Bot className="w-6 h-6 text-primary-600" />
                  </div>
                  {bot.requires_ui && (
                    <span className="text-xs bg-warning-50 text-warning-700 border border-warning-200 px-2 py-0.5 rounded-full">
                      Requiere UI
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{bot.name}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{bot.description}</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-primary-600 font-medium">
                  <Play className="w-3 h-3" />
                  <span>Ver bot</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {bots.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No tienes bots asignados aún.</p>
          <p className="text-sm text-gray-400 mt-1">Contacta a un administrador para obtener acceso.</p>
        </div>
      )}

      {/* Acceso rápido a ejecuciones */}
      <div>
        <button
          onClick={() => navigate('/ejecuciones')}
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 font-medium transition-colors"
        >
          <Clock className="w-4 h-4" />
          Ver todas las ejecuciones en curso
        </button>
      </div>
    </div>
  )
}
