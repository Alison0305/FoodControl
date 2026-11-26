import { CheckCircle2, ClipboardList, Eye, Pencil, Plus } from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import Modal from '../components/Modal.jsx'
import OrderFiltersPanel from '../components/OrderFiltersPanel.jsx'
import PedidoFormModal from '../components/PedidoFormModal.jsx'
import PedidoStatusActions from '../components/PedidoStatusActions.jsx'
import { Button, Card, EmptyState, ErrorMessage, LoadingIndicator, PageHeader, StatusBadge } from '../components/ui.jsx'
import { useAuth } from '../context/auth.js'
import { useJornada } from '../context/jornada.js'
import { ApiError } from '../services/api.js'
import { createPedido, listPedidos, updatePedido, updatePedidoEstado } from '../services/pedidos.js'
import { listProductos } from '../services/productos.js'
import { filterOrders } from '../utils/orderFilters.js'

const statusLabel = { en_espera: 'En espera', en_preparacion: 'En preparación', entregado: 'Entregado', cancelado: 'Cancelado' }
const statusTone = { en_espera: 'waiting', en_preparacion: 'preparing', entregado: 'delivered', cancelado: 'cancelled' }
const paymentLabel = { pendiente: 'Pago pendiente', parcial: 'Pago parcial', pagado: 'Pagado' }
function formatDate(value) { return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/La_Paz' }).format(new Date(value)) }
function money(value) { return `Bs ${value}` }
const defaultFilters = { busqueda: '', tipo: '', estado: '', estado_pago: '', orden: 'recientes' }

function PedidosPage() {
  const { selectedJornada } = useJornada(); const { clearSession } = useAuth()
  const currentId = selectedJornada?.id; const requestRef = useRef(0)
  const [pedidos, setPedidos] = useState([]); const [productos, setProductos] = useState([]); const [loadedId, setLoadedId] = useState(); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [form, setForm] = useState(); const [detail, setDetail] = useState(null); const [changing, setChanging] = useState(null); const [filters, setFiltersState] = useState({ jornadaId: null, values: defaultFilters })
  const activeFilters = filters.jornadaId === currentId ? filters.values : defaultFilters
  function setFilters(values) { setFiltersState({ jornadaId: currentId, values }) }
  async function load() { if (!currentId) return; const request = ++requestRef.current; setLoading(true); setError(''); try { const [orders, products] = await Promise.all([listPedidos(currentId), listProductos(currentId)]); if (request === requestRef.current) { setPedidos(orders); setProductos(products); setLoadedId(currentId) } } catch { if (request === requestRef.current) setError('No fue posible cargar los pedidos.') } finally { if (request === requestRef.current) setLoading(false) } }
  const reload = useEffectEvent(() => load())
  useEffect(() => { const timer = setTimeout(reload, 0); return () => clearTimeout(timer) }, [currentId])
  const visible = loadedId === currentId ? filterOrders(pedidos, activeFilters) : []
  async function save(data) { const id = currentId; const editing = Boolean(form); const saved = editing ? await updatePedido(form.id, data) : await createPedido(id, data); if (id !== currentId) return; setForm(undefined); setSuccess(editing ? 'El pedido fue actualizado correctamente.' : 'El pedido fue registrado correctamente.'); await load(); return saved }
  async function changeStatus(pedido, estado) { if (changing) return; setChanging(pedido.id); try { await updatePedidoEstado(pedido.id, estado); setSuccess(estado === 'cancelado' ? 'El pedido fue cancelado.' : 'El estado del pedido fue actualizado.'); await load() } catch (requestError) { if (requestError instanceof ApiError && requestError.status === 403) clearSession(); throw requestError } finally { setChanging(null) } }
  if (!selectedJornada) return <div className="space-y-8"><PageHeader title="Pedidos y reservas" description="Registre los pedidos de cada jornada." /><EmptyState icon={ClipboardList} title="Seleccione una jornada" description="Elija una jornada abierta para registrar pedidos." /><Link to="/jornadas"><Button>Ir a jornadas</Button></Link></div>
  if (loading || loadedId !== currentId) return <LoadingIndicator label="Cargando pedidos..." />
  return <div className="space-y-8"><PageHeader title="Pedidos y reservas" description={selectedJornada.nombre}><Button onClick={() => setForm(null)} disabled={selectedJornada.estado !== 'abierta'}><Plus size={20} />Nuevo pedido</Button></PageHeader>{success && <p className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3.5 text-app-description text-status-delivered"><CheckCircle2 size={20} />{success}</p>}<ErrorMessage>{error}</ErrorMessage><OrderFiltersPanel filters={activeFilters} onChange={setFilters} total={pedidos.length} results={visible.length} />{visible.length === 0 ? <div className="space-y-4"><EmptyState icon={ClipboardList} title={pedidos.length ? 'No se encontraron pedidos' : 'No hay pedidos registrados'} description={pedidos.length ? 'Intente con otro nombre o modifique los filtros seleccionados.' : 'Registre una reserva o venta directa para esta jornada.'} />{pedidos.length > 0 && <Button variant="secondary" onClick={() => setFilters(defaultFilters)}>Limpiar filtros</Button>}</div> : <section className="grid gap-5 xl:grid-cols-2">{visible.map((pedido) => <Card key={pedido.id}><div className="flex justify-between gap-3"><div><div className="flex flex-wrap gap-3"><h2 className="text-app-subtitle font-bold text-food-charcoal">Pedido #{pedido.id}</h2><StatusBadge tone={statusTone[pedido.estado]}>{statusLabel[pedido.estado]}</StatusBadge><StatusBadge tone={pedido.estado_pago === 'pagado' ? 'delivered' : pedido.estado_pago === 'parcial' ? 'preparing' : 'waiting'}>{paymentLabel[pedido.estado_pago]}</StatusBadge></div><p className="mt-3 text-app-body font-semibold">{pedido.nombre_cliente}</p><p className="text-app-description text-food-dark">{pedido.tipo === 'reserva' ? 'Reserva' : 'Venta directa'} · {formatDate(pedido.fecha_creacion)}</p>{pedido.fecha_entrega && <p className="mt-2 text-app-description text-status-delivered">Entregado: {formatDate(pedido.fecha_entrega)}</p>}</div><ClipboardList className="text-food-dark" size={26} /></div><ul className="mt-5 space-y-2 text-app-description">{pedido.detalles.map((detail) => <li className="flex justify-between" key={detail.producto_id}><span>{detail.cantidad} × {detail.producto_nombre}</span><strong>{money(detail.subtotal)}</strong></li>)}</ul><p className="mt-4 text-app-subtitle font-bold">Total: {money(pedido.total)}</p><div className="mt-6 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => setDetail(pedido)}><Eye size={19} />Consultar</Button><Button variant="secondary" onClick={() => setForm(pedido)} disabled={selectedJornada.estado !== 'abierta' || ['entregado', 'cancelado'].includes(pedido.estado) || changing === pedido.id}><Pencil size={19} />Editar</Button><PedidoStatusActions pedido={pedido} disabled={selectedJornada.estado !== 'abierta' || changing === pedido.id} onChange={(estado) => changeStatus(pedido, estado)} /></div></Card>)}</section>}{form !== undefined && <PedidoFormModal key={`${currentId}-${form?.id || 'new'}`} pedido={form} productos={productos} isSaving={Boolean(changing)} onClose={() => setForm(undefined)} onSave={save} />}{detail && <Modal title={`Pedido #${detail.id}`} onClose={() => setDetail(null)}><div className="space-y-3 text-app-description"><p><strong>Cliente:</strong> {detail.nombre_cliente}</p><StatusBadge tone={statusTone[detail.estado]}>{statusLabel[detail.estado]}</StatusBadge><StatusBadge tone={detail.estado_pago === 'pagado' ? 'delivered' : detail.estado_pago === 'parcial' ? 'preparing' : 'waiting'}>{paymentLabel[detail.estado_pago]}</StatusBadge>{detail.fecha_entrega && <p><strong>Entregado:</strong> {formatDate(detail.fecha_entrega)}</p>}<p className="text-app-subtitle font-bold">Total: {money(detail.total)}</p></div></Modal>}</div>
}

export default PedidosPage
