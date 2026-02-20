import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '@/context/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import LoginPage from '@/pages/LoginPage'
import AuthCallbackPage from '@/pages/AuthCallbackPage'
import LandingPage from '@/pages/LandingPage'
import EjecucionesPage from '@/pages/EjecucionesPage'
import RobotExtraccionMongoPage from '@/pages/bots/RobotExtraccionMongoPage'
import RPAMoniObjetosPage from '@/pages/bots/RPAMoniObjetosPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import AdminBotsPage from '@/pages/admin/AdminBotsPage'

function AppLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Header />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<ProtectedRoute><LandingPage /></ProtectedRoute>} />
            <Route path="/ejecuciones" element={<ProtectedRoute><EjecucionesPage /></ProtectedRoute>} />
            <Route
              path="/bots/robot-extraccion-mongo"
              element={<ProtectedRoute requiredBotId="robot-extraccion-mongo"><RobotExtraccionMongoPage /></ProtectedRoute>}
            />
            <Route
              path="/bots/rpa-moni-objetos"
              element={<ProtectedRoute requiredBotId="rpa-moni-objetos"><RPAMoniObjetosPage /></ProtectedRoute>}
            />
            <Route
              path="/admin/usuarios"
              element={<ProtectedRoute requiredRole="admin"><AdminUsersPage /></ProtectedRoute>}
            />
            <Route
              path="/admin/bots"
              element={<ProtectedRoute requiredRole="superadmin"><AdminBotsPage /></ProtectedRoute>}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth-callback" element={<AuthCallbackPage />} />
          <Route path="*" element={<AppLayout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
