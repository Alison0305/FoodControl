import { Menu, UserRound } from 'lucide-react'

import { Button } from './ui.jsx'

function Header({ title, username, onOpenMenu }) {
  return (
    <header className="flex min-h-[76px] items-center justify-between border-b border-food-sage-light bg-food-white px-5 py-4 sm:px-7 lg:px-9">
      <div className="flex items-center gap-4">
        <Button variant="ghost" className="size-12 px-0 lg:hidden" onClick={onOpenMenu} aria-label="Abrir menú">
          <Menu size={24} aria-hidden="true" />
        </Button>
        <h1 className="text-2xl font-bold text-food-charcoal">{title}</h1>
      </div>
      <div className="flex items-center gap-2.5 rounded-xl bg-food-sage-light/70 px-4 py-2.5 text-app-base text-food-charcoal">
        <UserRound size={20} className="text-food-dark" aria-hidden="true" />
        <span className="max-w-28 truncate font-semibold sm:max-w-48">{username}</span>
      </div>
    </header>
  )
}

export default Header
