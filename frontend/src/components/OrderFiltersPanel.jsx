import { Search, X } from 'lucide-react'

import { Button, Card } from './ui.jsx'

const filterOptions = [
  ['tipo', 'Tipo', [['', 'Todos'], ['reserva', 'Reserva'], ['venta_directa', 'Venta directa']]],
  ['estado', 'Estado', [['', 'Todos'], ['en_espera', 'En espera'], ['en_preparacion', 'En preparación'], ['entregado', 'Entregado'], ['cancelado', 'Cancelado']]],
  ['estado_pago', 'Pago', [['', 'Todos'], ['pendiente', 'Pendiente'], ['parcial', 'Parcial'], ['pagado', 'Pagado']]],
]

function OrderFiltersPanel({ filters, onChange, total, results, includeType = true, orderOptions }) {
  const visibleOptions = includeType ? filterOptions : filterOptions.filter(([key]) => key !== 'tipo')
  const orders = orderOptions || [['recientes', 'Más recientes primero'], ['antiguos', 'Más antiguos primero'], ['cliente_az', 'Cliente A-Z'], ['cliente_za', 'Cliente Z-A'], ['importe_mayor', 'Mayor importe'], ['importe_menor', 'Menor importe']]
  function reset() { onChange({ busqueda: '', tipo: '', estado: '', estado_pago: '', orden: 'recientes' }) }
  return <Card>
    <div className="grid gap-4 xl:grid-cols-5">
      <label className="xl:col-span-2"><span className="block text-app-label font-semibold opacity-0" aria-hidden="true">Buscar pedido</span><span className="relative mt-2 block"><Search className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-food-dark" size={20} /><input className="min-h-[52px] w-full rounded-xl border border-food-sage bg-food-white py-3 pl-11 pr-12 text-app-label" placeholder="Buscar por cliente o número de pedido..." value={filters.busqueda} onChange={(event) => onChange({ ...filters, busqueda: event.target.value })} />{filters.busqueda && <button className="absolute top-1/2 right-3 -translate-y-1/2 text-food-dark" type="button" onClick={() => onChange({ ...filters, busqueda: '' })} aria-label="Limpiar búsqueda"><X size={22} /></button>}</span></label>
      {visibleOptions.map(([key, label, options]) => <label key={key} className="text-app-label font-semibold text-food-charcoal">{label}<select className="mt-2 min-h-[52px] w-full rounded-xl border border-food-sage bg-food-white px-3 text-app-label" value={filters[key]} onChange={(event) => onChange({ ...filters, [key]: event.target.value })}>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>)}
    </div>
    <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
      <label className="flex items-center gap-5 text-app-label font-semibold text-food-charcoal">Ordenar<select className="min-h-[52px] rounded-xl border border-food-sage bg-food-white px-3 text-app-label" value={filters.orden} onChange={(event) => onChange({ ...filters, orden: event.target.value })}>{orders.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <p className="text-app-description text-food-dark">{results} de {total} pedidos</p>
      <Button variant="secondary" onClick={reset}>Limpiar filtros</Button>
    </div>
  </Card>
}

export default OrderFiltersPanel
