import { BookOpen, CalendarDays, ClipboardList, CreditCard, Soup } from 'lucide-react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'

import { LoadingIndicator } from './components/ui.jsx'
import { useAuth } from './context/auth.js'
import MainLayout from './layouts/MainLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
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
          <Route path="/jornadas" element={<ModulePage title="Jornadas de venta" description="Organiza y controla las jornadas de venta de tu familia." icon={CalendarDays} />} />
          <Route path="/menu" element={<ModulePage title="Platos y bebidas" description="Administra el menú disponible para cada jornada." icon={Soup} />} />
          <Route path="/pedidos" element={<ModulePage title="Pedidos y reservas" description="Gestiona los pedidos y reservas de tus clientes." icon={ClipboardList} />} />
          <Route path="/pagos" element={<ModulePage title="Gestión de pagos" description="Registra los pagos en efectivo y mediante QR." icon={CreditCard} />} />
          <Route path="/historial" element={<ModulePage title="Historial de ventas" description="Consulta las jornadas y ventas anteriores." icon={BookOpen} />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
