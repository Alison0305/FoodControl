import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { useAuth } from './auth.js'

function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login(username, password)
      navigate('/', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-orange-50 p-5 text-stone-900 sm:grid sm:place-items-center sm:p-8">
      <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-md flex-col justify-center sm:min-h-0">
        <div className="rounded-3xl border border-orange-100 bg-white p-7 shadow-[0_18px_50px_-25px_rgba(120,53,15,0.38)] sm:p-10">
          <div className="mb-9">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-orange-600">FoodControl</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900">Bienvenido</h1>
            <p className="mt-2 text-sm leading-6 text-stone-600">Inicia sesión para continuar con la gestión de tus ventas.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-stone-700">
              Usuario
              <input
                className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
              />
            </label>

            <label className="block text-sm font-semibold text-stone-700">
              Contraseña
              <span className="relative mt-2 block">
                <input
                  className="w-full rounded-xl border border-stone-300 bg-white py-3 pr-20 pl-3.5 text-base outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  className="absolute inset-y-0 right-2 my-auto px-2 text-xs font-bold text-orange-700 hover:text-orange-800"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </span>
            </label>

            {error && (
              <p className="rounded-xl bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700" role="alert">
                {error}
              </p>
            )}

            <button
              className="w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white transition hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:bg-orange-300"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
