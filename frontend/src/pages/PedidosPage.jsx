import { CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Eye, Pencil, Plus, Wallet } from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import Modal from '../components/Modal.jsx'
import OrderFiltersPanel from '../components/OrderFiltersPanel.jsx'
import PedidoFormModal from '../components/PedidoFormModal.jsx'
import PedidoPagosModal from '../components/PedidoPagosModal.jsx'
import PedidoStatusActions from '../components/PedidoStatusActions.jsx'
import { Button, Card, EmptyState, ErrorMessage, LoadingIndicator, PageHeader, StatusBadge } from '../components/ui.jsx'
import { useAuth } from '../context/auth.js'
import { useJornada } from '../context/jornada.js'
import { ApiError } from '../services/api.js'
import { createPedido, getPedido, listPedidos, updatePedido, updatePedidoEstado } from '../services/pedidos.js'
import { listProductos } from '../services/productos.js'
import { formatCents } from '../utils/money.js'
import { filterOrders } from '../utils/orderFilters.js'

const labels = { en_espera: 'En espera', en_preparacion: 'En preparación', entregado: 'Entregado', cancelado: 'Cancelado' }
const tones = { en_espera: 'waiting', en_preparacion: 'preparing', entregado: 'delivered', cancelado: 'cancelled' }
const paymentLabels = { pendiente: 'Pago pendiente', parcial: 'Pago parcial', pagado: 'Pagado' }
const paymentTones = { pendiente: 'waiting', parcial: 'preparing', pagado: 'delivered' }
const defaults = { busqueda: '', tipo: '', estado: '', estado_pago: '', orden: 'recientes' }
const dateTime = (value) => new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/La_Paz' }).format(new Date(value))

function PedidoDetail({ pedido, jornada, onClose }) {
  const cancelled = pedido.estado === 'cancelado'
  return <Modal title={`Pedido #${pedido.id}`} onClose={onClose}><div className="space-y-4 text-app-description text-food-dark"><p><strong className="text-food-charcoal">Cliente:</strong> {pedido.nombre_cliente}</p><p><strong className="text-food-charcoal">Tipo:</strong> {pedido.tipo === 'reserva' ? 'Reserva' : 'Venta directa'}</p><div className="flex flex-wrap gap-3"><StatusBadge tone={tones[pedido.estado]}>{labels[pedido.estado]}</StatusBadge>{!cancelled && <StatusBadge tone={paymentTones[pedido.estado_pago]}>{paymentLabels[pedido.estado_pago]}</StatusBadge>}</div><p><strong className="text-food-charcoal">Jornada:</strong> {jornada.nombre}</p><p><strong className="text-food-charcoal">Registrado:</strong> {dateTime(pedido.fecha_creacion)} por {pedido.registrado_por}</p>{pedido.fecha_entrega && <p><strong className="text-food-charcoal">Entregado:</strong> {dateTime(pedido.fecha_entrega)}</p>}<div><p className="font-semibold text-food-charcoal">Productos</p>{pedido.detalles.map((item) => <p className="mt-2 flex justify-between gap-3" key={item.producto_id}><span>{item.cantidad} × {item.producto_nombre} · {formatCents(item.precio_unitario)}</span><strong>{formatCents(item.subtotal)}</strong></p>)}</div><p><strong className="text-food-charcoal">Cantidad total:</strong> {pedido.cantidad_total}</p><div className="rounded-xl bg-food-beige p-4"><p>Total: <strong>{formatCents(pedido.total)}</strong></p><p className="mt-2">Pagado: <strong>{formatCents(pedido.total_pagado)}</strong></p><p className="mt-2">Saldo: <strong>{cancelled ? 'Sin saldo por cobrar' : formatCents(pedido.saldo_pendiente)}</strong></p></div>{pedido.observaciones && <p><strong className="text-food-charcoal">Observaciones:</strong> {pedido.observaciones}</p>}</div></Modal>
}

function PedidoCard({ order, expanded, jornada, changing, onToggle, onView, onEdit, onPayments, onChangeStatus }) {
  const cancelled = order.estado === 'cancelado'
  return <Card className={cancelled ? 'border-red-200' : ''}>
    <div className="flex items-stretch justify-between gap-5">
      <div>
        <h2 className="text-app-subtitle font-bold text-food-charcoal">Pedido #{order.id}</h2>
        <p className="mt-2 text-app-body font-semibold text-food-dark">{order.nombre_cliente}</p>
        <div className="mt-4 flex flex-wrap gap-3"><StatusBadge tone={tones[order.estado]}>{labels[order.estado]}</StatusBadge>{!cancelled && <StatusBadge tone={paymentTones[order.estado_pago]}>{paymentLabels[order.estado_pago]}</StatusBadge>}</div>
      </div>
      <div className="flex flex-col items-end justify-between">
        <button className="text-food-dark" type="button" onClick={onToggle} aria-expanded={expanded} aria-label={expanded ? `Ocultar detalle del pedido ${order.id}` : `Ver detalle del pedido ${order.id}`}>{expanded ? <ChevronUp size={28} aria-hidden="true" /> : <ChevronDown size={28} aria-hidden="true" />}</button>
        <button className="text-app-description font-semibold text-food-dark underline" type="button" onClick={onToggle} aria-expanded={expanded}>{expanded ? 'Ocultar detalle' : 'Ver detalle'}</button>
      </div>
    </div>
    <div className={`grid transition-[grid-template-rows,opacity] duration-300 ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`} inert={!expanded} aria-hidden={!expanded}><div className="overflow-hidden"><div className="mt-6 border-t border-food-sage-light pt-5 text-app-description text-food-dark"><p><strong className="text-food-charcoal">Tipo:</strong> {order.tipo === 'reserva' ? 'Reserva' : 'Venta directa'}</p><p className="mt-2"><strong className="text-food-charcoal">Registrado:</strong> {dateTime(order.fecha_creacion)}</p>{order.fecha_entrega && <p className="mt-2"><strong className="text-food-charcoal">Entregado:</strong> {dateTime(order.fecha_entrega)}</p>}<div className="mt-4"><p className="font-semibold text-food-charcoal">Productos</p>{order.detalles.map((item) => <p className="mt-2 flex justify-between gap-3" key={item.producto_id}><span>{item.cantidad} × {item.producto_nombre}</span><strong>{formatCents(item.subtotal)}</strong></p>)}</div>{order.observaciones && <p className="mt-4"><strong className="text-food-charcoal">Observaciones:</strong> {order.observaciones}</p>}<div className="mt-5 grid gap-3 rounded-xl bg-food-beige p-4 sm:grid-cols-3"><p>Total<strong className="block">{formatCents(order.total)}</strong></p><p>Pagado<strong className="block">{formatCents(order.total_pagado)}</strong></p><p>Saldo<strong className="block">{cancelled ? 'Sin saldo por cobrar' : formatCents(order.saldo_pendiente)}</strong></p></div><div className="mt-5 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => onView(order)}><Eye size={19} />Consultar</Button><Button variant="secondary" onClick={() => onEdit(order)} disabled={jornada.estado !== 'abierta' || ['entregado', 'cancelado'].includes(order.estado)}><Pencil size={19} />Editar</Button><Button variant="secondary" onClick={() => onPayments(order)}><Wallet size={19} />Gestionar pagos</Button><PedidoStatusActions pedido={order} disabled={changing === order.id || jornada.estado !== 'abierta'} onChange={(estado) => onChangeStatus(order, estado)} /></div></div></div></div>
  </Card>
}

function PedidosJornada({ jornada }) {
  const { clearSession } = useAuth(); const requestRef = useRef(0); const saveRef = useRef(false); const changeRef = useRef(false)
  const [orders, setOrders] = useState([]); const [products, setProducts] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [form, setForm] = useState(); const [detail, setDetail] = useState(null); const [paymentOrder, setPaymentOrder] = useState(null); const [saving, setSaving] = useState(false); const [changing, setChanging] = useState(null); const [filters, setFilters] = useState(defaults); const [expanded, setExpanded] = useState(new Set())
  async function load() { const request = ++requestRef.current; setLoading(true); setError(''); try { const [loadedOrders, loadedProducts] = await Promise.all([listPedidos(jornada.id), listProductos(jornada.id)]); if (request === requestRef.current) { setOrders(loadedOrders); setProducts(loadedProducts) } } catch (requestError) { if (request === requestRef.current) { if (requestError instanceof ApiError && requestError.status === 403) clearSession(); else setError('No fue posible cargar los pedidos.') } } finally { if (request === requestRef.current) setLoading(false) } }
  const reload = useEffectEvent(() => load())
  useEffect(() => { const timer = setTimeout(reload, 0); return () => clearTimeout(timer) }, [])
  const visible = filterOrders(orders, filters)
  function toggle(id) { setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  async function save(data) { if (saveRef.current) return; saveRef.current = true; setSaving(true); try { const editing = Boolean(form); await (editing ? updatePedido(form.id, data) : createPedido(jornada.id, data)); setForm(undefined); setSuccess(editing ? 'El pedido fue actualizado correctamente.' : 'El pedido fue registrado correctamente.'); await load() } finally { saveRef.current = false; setSaving(false) } }
  async function view(order) { try { setDetail(await getPedido(order.id)) } catch (requestError) { setError(requestError.message) } }
  async function changeStatus(order, estado) { if (changeRef.current) return; changeRef.current = true; setChanging(order.id); try { await updatePedidoEstado(order.id, estado); setSuccess(estado === 'cancelado' ? 'El pedido fue cancelado.' : 'El estado del pedido fue actualizado.'); await load() } catch (requestError) { setError(requestError.message); throw requestError } finally { changeRef.current = false; setChanging(null) } }
  function updatePaymentOrder(updated) { setOrders((current) => current.map((order) => order.id === updated.id ? { ...order, ...updated } : order)) }
  if (loading) return <LoadingIndicator label="Cargando pedidos..." />
  if (error && orders.length === 0) return <div className="space-y-4"><ErrorMessage>{error}</ErrorMessage><Button variant="secondary" onClick={load}>Reintentar</Button></div>
  return <div className="space-y-8"><PageHeader title="Pedidos, reservas y pagos" description={`${jornada.nombre} · ${new Intl.DateTimeFormat('es-BO', { dateStyle: 'long', timeZone: 'America/La_Paz' }).format(new Date(`${jornada.fecha}T12:00:00Z`))}`}><Button onClick={() => setForm(null)} disabled={jornada.estado !== 'abierta'}><Plus size={20} />Nuevo pedido</Button></PageHeader>{success && <p className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3.5 text-app-description text-status-delivered"><CheckCircle2 size={20} />{success}</p>}<ErrorMessage>{error}</ErrorMessage><OrderFiltersPanel filters={filters} onChange={setFilters} total={orders.length} results={visible.length} />{visible.length === 0 ? <EmptyState icon={ClipboardList} title={orders.length ? 'No se encontraron pedidos' : 'No hay pedidos registrados'} description={orders.length ? 'Intente con otros filtros.' : 'Registre una reserva o venta directa para esta jornada.'} /> : <section className="space-y-5">{visible.map((order) => <PedidoCard key={order.id} order={order} expanded={expanded.has(order.id)} jornada={jornada} changing={changing} onToggle={() => toggle(order.id)} onView={view} onEdit={setForm} onPayments={setPaymentOrder} onChangeStatus={changeStatus} />)}</section>}{form !== undefined && <PedidoFormModal pedido={form} productos={products} isSaving={saving} onClose={() => setForm(undefined)} onSave={save} />}{detail && <PedidoDetail pedido={detail} jornada={jornada} onClose={() => setDetail(null)} />}{paymentOrder && <PedidoPagosModal pedidoId={paymentOrder.id} jornada={jornada} onClose={() => setPaymentOrder(null)} onUpdated={updatePaymentOrder} />}</div>
}

function PedidosPage() { const { selectedJornada } = useJornada(); return selectedJornada ? <PedidosJornada key={selectedJornada.id} jornada={selectedJornada} /> : <div className="space-y-8"><PageHeader title="Pedidos, reservas y pagos" description="Registre pedidos, reservas y cobros de cada jornada." /><EmptyState icon={ClipboardList} title="Seleccione una jornada" description="Elija una jornada abierta para registrar pedidos y pagos." /><Link to="/jornadas"><Button>Ir a jornadas</Button></Link></div> }

export default PedidosPage
