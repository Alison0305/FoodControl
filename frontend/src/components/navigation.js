import { BookOpen, CalendarDays, ClipboardList, CreditCard, Home, Soup } from 'lucide-react'

export const navigationItems = [
  { label: 'Inicio', path: '/', icon: Home },
  { label: 'Jornadas', path: '/jornadas', icon: CalendarDays },
  { label: 'Menú', path: '/menu', icon: Soup },
  { label: 'Pedidos', path: '/pedidos', icon: ClipboardList },
  { label: 'Pagos', path: '/pagos', icon: CreditCard },
  { label: 'Historial', path: '/historial', icon: BookOpen },
]
