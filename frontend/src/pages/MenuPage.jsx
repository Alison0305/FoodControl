import { CheckCircle2, CircleDollarSign, Edit3, Plus, Search, Soup, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { useEffect, useEffectEvent, useState } from 'react'
import { Link } from 'react-router-dom'

import ConfirmDialog from '../components/ConfirmDialog.jsx'
import ProductoFormModal from '../components/ProductoFormModal.jsx'
import { Button, Card, EmptyState, ErrorMessage, LoadingIndicator, PageHeader, StatusBadge } from '../components/ui.jsx'
import { useAuth } from '../context/auth.js'
import { useJornada } from '../context/jornada.js'
import { ApiError } from '../services/api.js'
import { activateProducto, createProducto, deactivateProducto, deleteProducto, listProductos, updateProducto } from '../services/productos.js'

function formatPrice(price) {
  return `Bs ${Number(price).toFixed(2)}`
}

function MenuPage() {
  const { clearSession } = useAuth()
  const { selectedJornada } = useJornada()
  const [productos, setProductos] = useState([])
  const [typeFilter, setTypeFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const [priceOrder, setPriceOrder] = useState('sin-orden')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formProducto, setFormProducto] = useState(undefined)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [confirmationError, setConfirmationError] = useState('')
  const [isChanging, setIsChanging] = useState(false)

  async function loadProductos() {
    if (!selectedJornada) {
      setProductos([])
      return
    }
    setIsLoading(true)
    setError('')
    try {
      setProductos(await listProductos(selectedJornada.id))
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        clearSession()
        return
      }
      setError('No fue posible cargar los productos. Revise la conexión e intente nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const reloadProductos = useEffectEvent(() => loadProductos())

  useEffect(() => {
    const timer = window.setTimeout(() => reloadProductos(), 0)
    return () => window.clearTimeout(timer)
  }, [selectedJornada?.id])

  async function handleSave(data) {
    if (isSaving || !selectedJornada) return
    setIsSaving(true)
    try {
      const isEditing = Boolean(formProducto)
      await (isEditing ? updateProducto(formProducto.id, data) : createProducto(selectedJornada.id, data))
      setFormProducto(undefined)
      setSuccess(isEditing ? 'El producto fue actualizado correctamente.' : 'El producto fue agregado correctamente.')
      await loadProductos()
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) clearSession()
      throw requestError
    } finally {
      setIsSaving(false)
    }
  }

  async function handleConfirm() {
    if (isChanging) return
    setIsChanging(true)
    try {
      if (confirmation.action === 'eliminarProducto') {
        await deleteProducto(confirmation.producto.id)
        setSuccess('El producto fue eliminado correctamente.')
      } else if (confirmation.action === 'activar') {
        await activateProducto(confirmation.producto.id)
        setSuccess('El producto fue activado correctamente.')
      } else {
        await deactivateProducto(confirmation.producto.id)
        setSuccess('El producto fue desactivado correctamente.')
      }
      setConfirmation(null)
      setConfirmationError('')
      await loadProductos()
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) clearSession()
      setConfirmationError(requestError.message)
    } finally {
      setIsChanging(false)
    }
  }

  const isOpen = selectedJornada?.estado === 'abierta'
  const normalizedSearch = search.toLocaleLowerCase().trim()
  const visibleProductos = productos
    .filter((producto) => (
      (typeFilter === 'todos' || producto.tipo === typeFilter)
      && (statusFilter === 'todos' || (statusFilter === 'activos' ? producto.activo : !producto.activo))
      && producto.nombre.toLocaleLowerCase().includes(normalizedSearch)
    ))
    .sort((first, second) => {
      if (priceOrder === 'ascendente') return Number(first.precio) - Number(second.precio)
      if (priceOrder === 'descendente') return Number(second.precio) - Number(first.precio)
      return 0
    })

  if (!selectedJornada) {
    return (
      <div className="space-y-8">
        <PageHeader title="Platos y bebidas" description="Administre los productos disponibles para cada jornada de venta." />
        <EmptyState icon={Soup} title="Seleccione una jornada" description="Elija una jornada abierta antes de crear o administrar sus platos y bebidas." />
        <Link to="/jornadas"><Button>Ir a jornadas</Button></Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Platos y bebidas" description={`Productos de la jornada: ${selectedJornada.nombre}.`}>
        <Button onClick={() => { setSuccess(''); setFormProducto(null) }} disabled={!isOpen}><Plus size={20} aria-hidden="true" />Agregar producto</Button>
      </PageHeader>
      {!isOpen && <ErrorMessage>La jornada está cerrada. Reábrala para modificar sus productos.</ErrorMessage>}
      {success && <p className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3.5 text-app-description font-medium text-status-delivered" role="status"><CheckCircle2 size={20} aria-hidden="true" />{success}</p>}
      <ErrorMessage>{error}</ErrorMessage>

      <Card>
        <div className="grid gap-5 xl:grid-cols-2">
          <label className="relative block" htmlFor="buscar-producto">
            <span className="text-app-label font-semibold text-food-charcoal">Buscar producto</span>
            <Search className="pointer-events-none absolute top-[calc(50%+0.85rem)] left-4 -translate-y-1/2 text-food-dark" size={21} aria-hidden="true" />
            <input id="buscar-producto" className="mt-2 min-h-[52px] w-full rounded-xl border border-food-sage bg-food-white py-3 pl-12 pr-4 text-app-label text-food-charcoal outline-none focus:border-food-dark focus:ring-4 focus:ring-food-sage-light" placeholder="Buscar por nombre" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <label className="block text-app-label font-semibold text-food-charcoal" htmlFor="orden-precio">
            Ordenar por precio
            <select id="orden-precio" className="mt-2 min-h-[52px] w-full rounded-xl border border-food-sage bg-food-white px-4 py-3.5 text-app-label text-food-charcoal outline-none focus:border-food-dark focus:ring-4 focus:ring-food-sage-light" value={priceOrder} onChange={(event) => setPriceOrder(event.target.value)}>
              <option value="sin-orden">Sin ordenar</option>
              <option value="ascendente">Precio: menor a mayor</option>
              <option value="descendente">Precio: mayor a menor</option>
            </select>
          </label>
        </div>
        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-app-label font-semibold text-food-charcoal">Tipo de producto</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
              {[['todos', 'Todos'], ['plato', 'Platos'], ['bebida', 'Bebidas']].map(([value, label]) => <Button key={value} variant={typeFilter === value ? 'primary' : 'secondary'} onClick={() => setTypeFilter(value)}>{label}</Button>)}
            </div>
          </div>
          <div>
            <p className="text-app-label font-semibold text-food-charcoal">Disponibilidad</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar por disponibilidad">
              {[['todos', 'Todos'], ['activos', 'Activos'], ['inactivos', 'Inactivos']].map(([value, label]) => <Button key={value} variant={statusFilter === value ? 'primary' : 'secondary'} onClick={() => setStatusFilter(value)}>{label}</Button>)}
            </div>
          </div>
        </div>
      </Card>

      {isLoading ? <LoadingIndicator label="Cargando productos..." /> : visibleProductos.length === 0 ? (
        <EmptyState icon={CircleDollarSign} title="No hay productos para mostrar" description={productos.length === 0 ? 'Agregue un plato o bebida para comenzar a organizar el menú.' : 'No se encontraron productos con los filtros seleccionados.'} />
      ) : (
        <section className="grid gap-5 xl:grid-cols-2" aria-label="Listado de productos">
          {visibleProductos.map((producto) => (
            <Card key={producto.id} className={!producto.activo ? 'bg-food-beige/45' : ''}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-app-subtitle font-bold text-food-charcoal">{producto.nombre}</h2>
                    <StatusBadge>{producto.tipo === 'plato' ? 'Plato' : 'Bebida'}</StatusBadge>
                    <StatusBadge tone={producto.activo ? 'delivered' : 'neutral'}>{producto.activo ? 'Activo' : 'Inactivo'}</StatusBadge>
                  </div>
                  <p className="mt-4 text-app-body font-bold text-food-dark">{formatPrice(producto.precio)}</p>
                </div>
                <CircleDollarSign className="text-food-dark" size={28} aria-hidden="true" />
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => setFormProducto(producto)} disabled={!isOpen}><Edit3 size={19} aria-hidden="true" />Editar</Button>
                <Button variant="secondary" onClick={() => { setConfirmationError(''); setConfirmation({ action: producto.activo ? 'desactivar' : 'activar', producto }) }} disabled={!isOpen}>{producto.activo ? <><ToggleLeft size={19} aria-hidden="true" />Desactivar</> : <><ToggleRight size={19} aria-hidden="true" />Activar</>}</Button>
                <Button variant="danger" onClick={() => { setConfirmationError(''); setConfirmation({ action: 'eliminarProducto', producto }) }} disabled={!isOpen}><Trash2 size={19} aria-hidden="true" />Eliminar</Button>
              </div>
            </Card>
          ))}
        </section>
      )}

      {formProducto !== undefined && <ProductoFormModal key={formProducto?.id || 'new'} producto={formProducto} isSaving={isSaving} onClose={() => setFormProducto(undefined)} onSave={handleSave} />}
      {confirmation && <ConfirmDialog action={confirmation.action} subject={`el producto ${confirmation.producto.nombre}`} isLoading={isChanging} error={confirmationError} onCancel={() => { setConfirmationError(''); setConfirmation(null) }} onConfirm={handleConfirm} />}
    </div>
  )
}

export default MenuPage
