import { BookOpen } from 'lucide-react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'

import { LoadingIndicator } from './components/ui.jsx'
import { useAuth } from './context/auth.js'
import MainLayout from './layouts/MainLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import JornadasPage from './pages/JornadasPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import MenuPage from './pages/MenuPage.jsx'
import PedidosPage from './pages/PedidosPage.jsx'
import ModulePage from './pages/ModulePage.jsx'

function PrivateRoute() {
  const { user } = useAuth()
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function App() {
  const { isChecking } = useAuth()
  if (isChecking) return <main className="grid min-h-screen place-items-center bg-food-beige"><LoadingIndicator label="Comprobando sesión..." /></main>

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<PrivateRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/jornadas" element={<JornadasPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/pedidos" element={<PedidosPage />} />
          <Route path="/pagos" element={<Navigate to="/pedidos" replace />} />
          <Route path="/historial" element={<ModulePage title="Historial de ventas" description="Consulta las jornadas y ventas anteriores." icon={BookOpen} />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
