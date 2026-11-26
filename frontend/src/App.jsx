import { useEffect, useState } from 'react'

function App() {
  const [apiStatus, setApiStatus] = useState('checking')

  useEffect(() => {
    async function checkApi() {
      try {
        const response = await fetch('/api/health/')
        const data = await response.json()
        setApiStatus(data.status === 'ok' ? 'connected' : 'error')
      } catch {
        setApiStatus('error')
      }
    }

    checkApi()
  }, [])

  const status = {
    checking: {
      label: 'Comprobando conexión...',
      styles: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    connected: {
      label: 'API conectada correctamente',
      styles: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    },
    error: {
      label: 'No se pudo conectar con la API',
      styles: 'border-red-200 bg-red-50 text-red-800',
    },
  }[apiStatus]

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-12 text-stone-900 sm:py-20">
      <section className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-8 shadow-sm sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
          FoodControl
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Ventas familiares, bajo control.
        </h1>
        <p className="mt-5 text-lg leading-8 text-stone-600">
          La base del sistema está lista para gestionar jornadas, pedidos y pagos en bolivianos.
        </p>
        <div className={`mt-8 rounded-xl border px-4 py-3 text-sm font-medium ${status.styles}`}>
          {status.label}
        </div>
        <p className="mt-4 text-sm text-stone-500">
          Endpoint: <code>/api/health/</code>
        </p>
      </section>
    </main>
  )
}

export default App
