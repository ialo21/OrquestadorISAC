import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { UserRole } from '@/types'

interface Props {
  children: React.ReactNode
  requiredRole?: UserRole
  requiredBotId?: string
}

export default function ProtectedRoute({ children, requiredRole, requiredBotId }: Props) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (requiredRole) {
    const roles: UserRole[] = ['user', 'admin', 'superadmin']
    if (roles.indexOf(user.role) < roles.indexOf(requiredRole)) {
      return <Navigate to="/" replace />
    }
  }

  if (requiredBotId) {
    const hasAccess = user.role === 'superadmin' || user.role === 'admin' || user.allowed_bot_ids.includes(requiredBotId)
    if (!hasAccess) return <Navigate to="/" replace />
  }

  return <>{children}</>
}
