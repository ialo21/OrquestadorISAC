import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LogIn, AlertCircle, Bot } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { fetchGoogleUrl } from '@/services/api'
import logoIS from '@/assets/simboloIS-sin-fondo.png'

export default function LoginPage() {
  const { user, setToken } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) { navigate('/'); return }
    const err = params.get('error')
    if (err === 'domain_not_allowed') setError('Solo se permiten correos @interseguro.com.pe')
    else if (err === 'oauth_failed') setError('Error al autenticar con Google. Inténtalo de nuevo.')
  }, [user, navigate, params])

  const handleLogin = async () => {
    setLoading(true)
    try {
      const { url } = await fetchGoogleUrl()
      window.location.href = url
    } catch {
      setError('No se pudo conectar con el servidor')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md p-8 animate-slideUp">
        {/* Logo + título */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white rounded-xl p-2 border border-gray-200 shadow-sm">
              <img src={logoIS} alt="Interseguro" className="w-12 h-12 object-contain" />
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="bg-primary-50 rounded-xl p-2 border border-primary-100">
              <Bot className="w-10 h-10 text-primary-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Orquestador de Bots</h1>
          <p className="text-sm text-gray-500 mt-1">Portal de automatización RPA · Interseguro</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-start gap-2 bg-danger-50 border border-danger-200 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 text-danger-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}

        {/* Botón login */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-gray-700 font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          )}
          <span>{loading ? 'Redirigiendo...' : 'Iniciar sesión con Google'}</span>
        </button>

        <p className="text-center text-xs text-gray-400 mt-5">
          Acceso exclusivo para cuentas <span className="font-medium text-gray-500">@interseguro.com.pe</span>
        </p>
      </div>
    </div>
  )
}
