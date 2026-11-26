import { Navigate, Outlet, Route, Routes } from 'react-router-dom'

import { useAuth } from './auth.js'
import LoginPage from './LoginPage.jsx'
import PrivatePage from './PrivatePage.jsx'

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-orange-50 px-6 text-stone-800">
      <p className="text-sm font-medium text-stone-600">Comprobando sesión...</p>
    </main>
  )
}

function PrivateRoute() {
  const { user } = useAuth()

  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function App() {
  const { isChecking } = useAuth()

  if (isChecking) {
    return <LoadingScreen />
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<PrivatePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
