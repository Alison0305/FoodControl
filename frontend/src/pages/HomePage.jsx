import { ArrowRight, BookOpen, CalendarDays, ClipboardList, CreditCard, Soup } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, EmptyState, PageHeader, StatusBadge } from '../components/ui.jsx'
import BrandName from '../components/BrandName.jsx'
import { useAuth } from '../context/auth.js'

const quickLinks = [
  { label: 'Jornadas', description: 'Organiza cada día de venta.', path: '/jornadas', icon: CalendarDays },
  { label: 'Menú', description: 'Prepara platos y bebidas.', path: '/menu', icon: Soup },
  { label: 'Pedidos', description: 'Gestiona reservas y ventas.', path: '/pedidos', icon: ClipboardList },
  { label: 'Pagos', description: 'Registra efectivo y QR.', path: '/pagos', icon: CreditCard },
  { label: 'Historial', description: 'Consulta ventas anteriores.', path: '/historial', icon: BookOpen },
]

function HomePage() {
  const { user } = useAuth()

  return (
    <div className="space-y-8">
      <PageHeader title={`Hola, ${user.username}`} description={<><BrandName /> te ayuda a organizar ventas familiares de comida de forma simple y ordenada.</>} />

      <Card className="border-food-sage bg-food-sage-light/55">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3"><h2 className="text-app-subtitle font-bold text-food-charcoal">Jornada de venta</h2><StatusBadge /></div>
            <p className="mt-4 max-w-xl text-app-description leading-7 text-food-dark">La gestión de jornadas estará disponible en las próximas etapas. Aquí podrás iniciar y consultar la jornada activa.</p>
          </div>
          <CalendarDays className="size-9 text-food-dark" aria-hidden="true" />
        </div>
      </Card>

      <section>
        <h2 className="text-app-subtitle font-bold text-food-charcoal">Accesos rápidos</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {quickLinks.map(({ icon: Icon, label, description, path }) => (
            <Link className="group rounded-2xl border border-food-sage-light bg-food-white p-6 shadow-sm transition hover:border-food-sage hover:shadow-md focus:outline-none focus:ring-4 focus:ring-food-sage-light" key={path} to={path}>
              <Icon className="text-food-dark" size={24} aria-hidden="true" />
              <h3 className="mt-5 text-app-subtitle font-bold text-food-charcoal">{label}</h3>
              <p className="mt-3 text-app-description leading-7 text-food-dark">{description}</p>
              <span className="mt-5 flex items-center gap-1.5 text-app-body font-semibold text-food-dark">Ver módulo <ArrowRight size={18} aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </section>

      <EmptyState icon={ClipboardList} title="Módulos en preparación" description="Los datos de jornadas, menú, pedidos, pagos e historial aparecerán aquí cuando sus módulos estén disponibles." />
    </div>
  )
}

export default HomePage
