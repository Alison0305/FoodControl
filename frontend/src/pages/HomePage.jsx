import { ArrowRight, BookOpen, CalendarDays, ClipboardList, CreditCard, Soup } from 'lucide-react'
import { Link } from 'react-router-dom'

import JornadaStatusBadge from '../components/JornadaStatusBadge.jsx'
import { Card, EmptyState, PageHeader, StatusBadge } from '../components/ui.jsx'
import BrandName from '../components/BrandName.jsx'
import { useAuth } from '../context/auth.js'
import { useJornada } from '../context/jornada.js'

const quickLinks = [
  { label: 'Jornadas', description: 'Organiza cada día de venta.', path: '/jornadas', icon: CalendarDays },
  { label: 'Menú', description: 'Prepara platos y bebidas.', path: '/menu', icon: Soup },
  { label: 'Pedidos', description: 'Gestiona reservas y ventas.', path: '/pedidos', icon: ClipboardList },
  { label: 'Pagos', description: 'Registra efectivo y QR.', path: '/pagos', icon: CreditCard },
  { label: 'Historial', description: 'Consulta ventas anteriores.', path: '/historial', icon: BookOpen },
]

function HomePage() {
  const { user } = useAuth()
  const { selectedJornada, isCheckingJornada } = useJornada()

  return (
    <div className="space-y-8">
      <PageHeader title={`Hola, ${user.username}`} description={<><BrandName /> te ayuda a organizar ventas familiares de comida de forma simple y ordenada.</>} />

      <Card className="border-food-sage bg-food-sage-light/55">
        {isCheckingJornada ? <p className="text-app-body text-food-dark">Comprobando jornada seleccionada...</p> : selectedJornada ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3"><h2 className="text-app-subtitle font-bold text-food-charcoal">{selectedJornada.nombre}</h2><JornadaStatusBadge estado={selectedJornada.estado} /><StatusBadge>Jornada activa</StatusBadge></div>
              <p className="mt-4 text-app-description leading-7 text-food-dark">Fecha de venta: {new Intl.DateTimeFormat('es-BO', { dateStyle: 'long', timeZone: 'America/La_Paz' }).format(new Date(`${selectedJornada.fecha}T12:00:00Z`))}</p>
            </div>
            <Link className="inline-flex min-h-11 items-center justify-center rounded-xl bg-food-dark px-4 py-2.5 text-app-base font-semibold text-food-white hover:bg-food-charcoal focus:outline-none focus:ring-4 focus:ring-food-sage-light" to="/jornadas">Ver jornadas</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-app-subtitle font-bold text-food-charcoal">Seleccione una jornada de trabajo</h2><p className="mt-4 max-w-xl text-app-description leading-7 text-food-dark">Cree o seleccione una jornada abierta para comenzar a gestionar las próximas operaciones.</p></div>
            <Link className="inline-flex min-h-11 items-center justify-center rounded-xl bg-food-dark px-4 py-2.5 text-app-base font-semibold text-food-white hover:bg-food-charcoal focus:outline-none focus:ring-4 focus:ring-food-sage-light" to="/jornadas">Ir a jornadas</Link>
          </div>
        )}
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

      <EmptyState icon={ClipboardList} title="Próximos módulos" description="Menú, pedidos, pagos e historial se habilitarán en próximas etapas y utilizarán la jornada seleccionada." />
    </div>
  )
}

export default HomePage
