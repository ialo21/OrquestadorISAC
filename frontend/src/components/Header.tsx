import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Bot, LayoutDashboard, Activity, History, Database, Monitor,
  Users, Settings, LogOut, Menu, X, ChevronDown, ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { fetchBots } from '@/services/api'
import { cn } from '@/lib/utils'
import type { Bot as BotType } from '@/types'
import logoIS from '@/assets/simboloIS-sin-fondo.png'

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  Database, Monitor, Bot, Activity, Settings,
}

export default function Header() {
  const [bots, setBots] = useState<BotType[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  const [botsExpanded, setBotsExpanded] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = () => fetchBots().then(setBots).catch(() => {})
    load()
    intervalRef.current = setInterval(load, 30_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [user])

  const handleLogout = () => { logout(); navigate('/login') }

  const navItem = (to: string, icon: React.ReactNode, label: string) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-primary-50 text-primary-700 shadow-sm'
            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50',
        )
      }
    >
      {icon}
      {open && <span>{label}</span>}
    </NavLink>
  )

  return (
    <>
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-gray-200 shadow-sm transition-all duration-200',
        open ? 'w-60' : 'w-16',
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className="bg-white rounded-lg p-1 border border-gray-200 shadow-sm flex-shrink-0">
            <img src={logoIS} alt="IS" className="w-8 h-8 object-contain" />
          </div>
          {open && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-gray-900 leading-tight">Orquestador</p>
              <p className="text-xs text-gray-400 leading-tight">de Bots</p>
            </div>
          )}
          <button
            onClick={() => setOpen(!open)}
            className={cn('ml-auto text-gray-400 hover:text-gray-600 flex-shrink-0', !open && 'ml-0 mx-auto')}
          >
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {navItem('/', <LayoutDashboard className="w-4 h-4 flex-shrink-0" />, 'Inicio')}
          {navItem('/ejecuciones', <Activity className="w-4 h-4 flex-shrink-0" />, 'Ejecuciones')}
          {user && (user.role === 'superadmin' || user.role === 'admin') &&
            navItem('/historial', <History className="w-4 h-4 flex-shrink-0" />, 'Historial')
          }

          {/* Bots section */}
          {bots.length > 0 && (
            <div>
              <button
                onClick={() => setBotsExpanded(!botsExpanded)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600 transition-colors',
                )}
              >
                <Bot className="w-4 h-4 flex-shrink-0" />
                {open && (
                  <>
                    <span className="flex-1 text-left">Bots</span>
                    {botsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </>
                )}
              </button>
              {botsExpanded && open && (
                <div className="ml-3 mt-1 space-y-1 border-l border-gray-100 pl-3">
                  {bots.map((bot) => {
                    const Icon = iconMap[bot.icon] ?? Bot
                    return navItem(
                      `/bots/${bot.page_slug}`,
                      <Icon className="w-4 h-4 flex-shrink-0" />,
                      bot.name,
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Admin */}
          {user && (user.role === 'superadmin' || user.role === 'admin') && (
            <>
              {open && <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-300">Admin</p>}
              {navItem('/admin/usuarios', <Users className="w-4 h-4 flex-shrink-0" />, 'Usuarios')}
              {user.role === 'superadmin' && navItem('/admin/bots', <Settings className="w-4 h-4 flex-shrink-0" />, 'Gestión Bots')}
            </>
          )}
        </nav>

        {/* User */}
        {user && (
          <div className="border-t border-gray-100 px-2 py-3">
            <div className={cn('flex items-center gap-2 px-3 py-2', !open && 'justify-center')}>
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-primary-700">{user.name[0]}</span>
                </div>
              )}
              {open && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.role}</p>
                </div>
              )}
              {open && (
                <button onClick={handleLogout} className="text-gray-400 hover:text-danger-600 transition-colors" title="Cerrar sesión">
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
            {!open && (
              <button onClick={handleLogout} className="w-full flex justify-center text-gray-400 hover:text-danger-600 transition-colors mt-1" title="Cerrar sesión">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Spacer */}
      <div className={cn('flex-shrink-0 transition-all duration-200', open ? 'w-60' : 'w-16')} />
    </>
  )
}
