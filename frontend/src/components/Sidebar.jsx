import { ChefHat, LogOut, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'

import { useAuth } from '../context/auth.js'
import BrandName from './BrandName.jsx'
import { Button, ErrorMessage } from './ui.jsx'
import { navigationItems } from './navigation.js'

function Sidebar({ mobile = false, onClose }) {
  const { logout } = useAuth()
  const [error, setError] = useState('')
  const closeAfterNavigation = () => onClose?.()

  async function handleLogout() {
    setError('')
    try {
      await logout()
      onClose?.()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <aside className="flex h-full w-72 flex-col bg-food-dark px-5 py-6 text-food-white shadow-xl shadow-food-charcoal/25 lg:w-[280px] lg:border-r lg:border-food-dark lg:shadow-none">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-xl bg-food-sage-light text-food-charcoal">
            <ChefHat size={26} aria-hidden="true" />
          </span>
          <BrandName className="text-app-brand font-bold tracking-tight" />
        </div>
        {mobile && (
          <Button variant="sidebar" className="size-11 px-0 lg:hidden" onClick={onClose} aria-label="Cerrar menú">
            <X size={20} aria-hidden="true" />
          </Button>
        )}
      </div>

      <nav className="mt-10 space-y-2" aria-label="Navegación principal">
        {navigationItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            className={({ isActive }) => `flex min-h-[52px] items-center gap-4 rounded-xl px-4 text-app-nav font-semibold transition ${
              isActive ? 'bg-food-sage-light text-food-charcoal' : 'text-food-white/80 hover:bg-food-white/10 hover:text-food-white'
            }`}
            key={path}
            to={path}
            onClick={closeAfterNavigation}
          >
            <Icon size={22} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-food-white/15 pt-5">
        <ErrorMessage>{error}</ErrorMessage>
        <Button variant="sidebar" className="w-full justify-start text-app-body" onClick={handleLogout}>
          <LogOut size={21} aria-hidden="true" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  )
}

export default Sidebar
