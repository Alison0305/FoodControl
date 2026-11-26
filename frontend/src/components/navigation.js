import { BookOpen, CalendarDays, ClipboardList, Home, Soup } from 'lucide-react'

export const navigationItems = [
  { label: 'Inicio', path: '/', icon: Home },
  { label: 'Jornadas', path: '/jornadas', icon: CalendarDays },
  { label: 'Menú', path: '/menu', icon: Soup },
  { label: 'Pedidos y pagos', path: '/pedidos', icon: ClipboardList },
  { label: 'Historial', path: '/historial', icon: BookOpen },
]
