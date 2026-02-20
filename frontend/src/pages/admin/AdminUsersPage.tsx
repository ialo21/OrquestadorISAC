import { useEffect, useState } from 'react'
import { Users, Shield, Bot, Loader2, Check, X } from 'lucide-react'
import { fetchAdminUsers, fetchBots, updateUserRole, updateUserBots } from '@/services/api'
import type { User, Bot as BotType, UserRole } from '@/types'
import { cn } from '@/lib/utils'

const ROLES: UserRole[] = ['user', 'admin', 'superadmin']
const ROLE_LABELS: Record<UserRole, string> = { user: 'Usuario', admin: 'Admin', superadmin: 'Superadmin' }
const ROLE_COLORS: Record<UserRole, string> = {
  user: 'bg-gray-100 text-gray-600',
  admin: 'bg-primary-50 text-primary-700',
  superadmin: 'bg-warning-50 text-warning-700',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [bots, setBots] = useState<BotType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editingBots, setEditingBots] = useState<string | null>(null)

  const load = async () => {
    try {
      const [u, b] = await Promise.all([fetchAdminUsers(), fetchBots()])
      setUsers(u)
      setBots(b)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setSaving(userId)
    try {
      const updated = await updateUserRole(userId, role)
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)))
    } finally {
      setSaving(null)
    }
  }

  const handleBotsChange = async (userId: string, botIds: string[]) => {
    setSaving(userId)
    try {
      const updated = await updateUserBots(userId, botIds)
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)))
    } finally {
      setSaving(null)
      setEditingBots(null)
    }
  }

  const toggleBot = (user: User, botId: string) => {
    const current = user.allowed_bot_ids ?? []
    const next = current.includes(botId)
      ? current.filter((b) => b !== botId)
      : [...current, botId]
    handleBotsChange(user.id, next)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-primary-600" />
          Gestión de Usuarios
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Administra roles y permisos de acceso a bots por usuario.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Usuario</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rol</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Bots permitidos</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Último acceso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                {/* Usuario */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {user.picture ? (
                      <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary-700">{user.name[0]}</span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>
                </td>

                {/* Rol */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', ROLE_COLORS[user.role])}>
                      {ROLE_LABELS[user.role]}
                    </span>
                    <div className="flex gap-1">
                      {ROLES.map((r) => (
                        r !== user.role && (
                          <button
                            key={r}
                            onClick={() => handleRoleChange(user.id, r)}
                            disabled={saving === user.id}
                            className="text-xs text-gray-400 hover:text-primary-600 disabled:opacity-40 flex items-center gap-0.5"
                            title={`Cambiar a ${ROLE_LABELS[r]}`}
                          >
                            {saving === user.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Shield className="w-3 h-3" />}
                          </button>
                        )
                      ))}
                    </div>
                  </div>
                  {/* Selector de rol completo */}
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                    disabled={saving === user.id}
                    className="mt-1 text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </td>

                {/* Bots */}
                <td className="px-5 py-4">
                  {user.role === 'superadmin' || user.role === 'admin' ? (
                    <span className="text-xs text-gray-400 italic">Acceso total</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {bots.map((bot) => {
                        const allowed = (user.allowed_bot_ids ?? []).includes(bot.id)
                        return (
                          <button
                            key={bot.id}
                            onClick={() => toggleBot(user, bot.id)}
                            disabled={saving === user.id}
                            className={cn(
                              'flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors disabled:opacity-40',
                              allowed
                                ? 'bg-success-50 border-success-200 text-success-700 hover:bg-success-100'
                                : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100',
                            )}
                          >
                            <Bot className="w-3 h-3" />
                            {bot.name}
                            {allowed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </td>

                {/* Último acceso */}
                <td className="px-5 py-4 text-xs text-gray-400">
                  {user.last_login
                    ? new Date(user.last_login).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Ningún usuario ha iniciado sesión aún.</p>
          </div>
        )}
      </div>
    </div>
  )
}
