import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { Button, Card, ErrorMessage, FormField } from '../components/ui.jsx'
import BrandName from '../components/BrandName.jsx'
import { useAuth } from '../context/auth.js'

function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

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
    <main className="min-h-screen bg-food-beige p-5 text-food-charcoal sm:grid sm:place-items-center sm:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-lg flex-col justify-center sm:min-h-0">
        <Card className="p-8 shadow-[0_18px_50px_-25px_rgba(53,79,69,0.28)] sm:p-11">
          <BrandName className="text-app-brand font-bold uppercase tracking-[0.22em] text-food-dark" />
          <h1 className="mt-5 text-app-title font-bold tracking-tight">Bienvenido</h1>
          <p className="mt-4 text-app-description leading-7 text-food-dark">Inicia sesión para continuar con la gestión de tus ventas.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <FormField id="username" label="Usuario" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
            <FormField
              id="password"
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              endAdornment={
                <button className="absolute inset-y-0 right-2 px-2 text-sm font-bold text-food-dark hover:text-food-charcoal focus:outline-none focus:ring-2 focus:ring-food-sage" type="button" onClick={() => setShowPassword((visible) => !visible)}>
                  {showPassword ? <EyeOff size={17} aria-label="Ocultar contraseña" /> : <Eye size={17} aria-label="Mostrar contraseña" />}
                </button>
              }
            />
            <ErrorMessage>{error}</ErrorMessage>
            <Button className="w-full text-app-label" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  )
}

export default LoginPage
