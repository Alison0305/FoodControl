import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from './auth.js'

function PrivatePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleLogout() {
    setError('')
    setIsSubmitting(true)

    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-orange-50 p-5 text-stone-900 sm:p-8">
      <section className="w-full max-w-lg rounded-3xl border border-orange-100 bg-white p-8 shadow-[0_18px_50px_-25px_rgba(120,53,15,0.38)] sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-orange-600">FoodControl</p>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">Sesión iniciada</h1>
        <p className="mt-3 text-stone-600">
          Usuario autenticado: <span className="font-semibold text-stone-900">{user.username}</span>
        </p>
        <p className="mt-2 text-sm leading-6 text-stone-500">La pantalla de gestión estará disponible en próximas etapas.</p>

        {error && <p className="mt-6 text-sm font-medium text-red-700">{error}</p>}

        <button
          className="mt-8 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:text-stone-400"
          type="button"
          onClick={handleLogout}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>
      </section>
    </main>
  )
}

export default PrivatePage
