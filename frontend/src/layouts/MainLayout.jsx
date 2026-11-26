import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import Header from '../components/Header.jsx'
import BrandName from '../components/BrandName.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { navigationItems } from '../components/navigation.js'
import { useAuth } from '../context/auth.js'

function MainLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const currentItem = navigationItems.find((item) => item.path === location.pathname)

  return (
    <div className="min-h-screen bg-food-beige lg:flex">
      <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0">
        <Sidebar />
      </div>

      {isMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <button className="absolute inset-0 bg-food-charcoal/45" type="button" onClick={() => setIsMenuOpen(false)} aria-label="Cerrar menú" />
          <div className="relative h-full">
            <Sidebar mobile onClose={() => setIsMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1 lg:ml-[310px]">
        <Header title={currentItem?.label || <BrandName />} username={user.username} onOpenMenu={() => setIsMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1520px] p-6 sm:p-8 lg:p-11">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
