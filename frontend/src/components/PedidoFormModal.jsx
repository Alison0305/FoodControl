import { Minus, Plus, Search, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import Modal from './Modal.jsx'
import { Button, ErrorMessage, FormField } from './ui.jsx'
import { formatCents, lineSubtotal, MAX_QUANTITY, orderTotals } from '../utils/money.js'

function validationMessage(requestError) {
  const data = requestError.data
  if (!data || typeof data !== 'object') return requestError.message
  const messages = Object.entries(data).flatMap(([field, value]) => {
    const text = Array.isArray(value) ? value.join(' ') : typeof value === 'object' ? JSON.stringify(value) : value
    return field === 'detail' ? text : `${field}: ${text}`
  })
  return messages.join(' ') || requestError.message
}

function PedidoFormModal({ pedido, productos, isSaving, onClose, onSave }) {
  const [nombreCliente, setNombreCliente] = useState(pedido?.nombre_cliente || '')
  const [tipo, setTipo] = useState(pedido?.tipo || 'reserva')
  const [observaciones, setObservaciones] = useState(pedido?.observaciones || '')
  const [search, setSearch] = useState('')
  const [detalles, setDetalles] = useState(() => pedido?.detalles.map(({ producto_id, cantidad, producto_nombre, producto_tipo, precio_unitario }) => ({ producto_id, cantidad, nombre: producto_nombre, tipo: producto_tipo, precio: precio_unitario })) || [])
  const [error, setError] = useState('')
  const originalPrices = new Map(pedido?.detalles.map((detalle) => [detalle.producto_id, detalle.precio_unitario]))
  const selectedIds = new Set(detalles.map((detalle) => detalle.producto_id))
  const disponibles = productos.filter((producto) => producto.activo && !selectedIds.has(producto.id) && producto.nombre.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()))
  const totals = orderTotals(detalles)

  function updateQuantity(productoId, value) {
    setDetalles((current) => current.map((detalle) => detalle.producto_id === productoId ? { ...detalle, cantidad: value } : detalle))
  }

  async function submit(event) {
    event.preventDefault()
    if (!nombreCliente.trim()) return setError('Ingrese el nombre del cliente.')
    if (!detalles.length) return setError('Seleccione al menos un producto.')
    if (!totals.valid) return setError('Cada cantidad debe ser un número entero entre 1 y 2147483647.')
    setError('')
    try {
      await onSave({ nombre_cliente: nombreCliente.trim(), tipo, observaciones, detalles: detalles.map(({ producto_id, cantidad }) => ({ producto_id, cantidad: Number(cantidad) })) })
    } catch (requestError) {
      setError(validationMessage(requestError))
    }
  }

  return (
    <Modal title={pedido ? `Editar pedido #${pedido.id}` : 'Nuevo pedido'} onClose={isSaving ? () => {} : onClose}>
      <form className="space-y-6" onSubmit={submit} noValidate>
        <div className="grid gap-5 sm:grid-cols-2"><FormField id="cliente" label="Nombre del cliente" value={nombreCliente} onChange={(event) => setNombreCliente(event.target.value)} disabled={isSaving} autoFocus /><div><p className="text-app-label font-semibold text-food-charcoal">Tipo de pedido</p><div className="mt-2 flex gap-2"><Button variant={tipo === 'reserva' ? 'primary' : 'secondary'} onClick={() => setTipo('reserva')} disabled={isSaving}>Reserva</Button><Button variant={tipo === 'venta_directa' ? 'primary' : 'secondary'} onClick={() => setTipo('venta_directa')} disabled={isSaving}>Venta directa</Button></div></div></div>
        <section><p className="text-app-label font-semibold text-food-charcoal">Productos seleccionados</p>{detalles.length === 0 ? <p className="mt-2 text-app-description text-food-dark">Aún no seleccionó productos.</p> : <div className="mt-3 space-y-3">{detalles.map((detalle) => <div className="flex flex-wrap items-center gap-3 rounded-xl bg-food-beige p-3" key={detalle.producto_id}><span className="min-w-44 flex-1 text-app-description font-semibold text-food-charcoal">{detalle.nombre} <span className="font-normal">Bs {detalle.precio}</span></span><span className="text-app-description font-semibold text-food-dark">{formatCents(lineSubtotal(detalle.precio, detalle.cantidad)) || 'Importe inválido'}</span><Button variant="secondary" className="!min-h-[44px] !px-3" onClick={() => updateQuantity(detalle.producto_id, Number(detalle.cantidad) - 1)} disabled={isSaving || Number(detalle.cantidad) <= 1}><Minus size={18} /></Button><input className="min-h-[50px] w-20 rounded-xl border border-food-sage bg-food-white px-2 text-center text-app-label" type="number" min="1" max={MAX_QUANTITY.toString()} step="1" value={detalle.cantidad} onChange={(event) => updateQuantity(detalle.producto_id, event.target.value)} disabled={isSaving} /><Button variant="secondary" className="!min-h-[44px] !px-3" onClick={() => updateQuantity(detalle.producto_id, Number(detalle.cantidad) + 1)} disabled={isSaving || Number(detalle.cantidad) >= Number(MAX_QUANTITY)}><Plus size={18} /></Button><Button variant="ghost" className="!min-h-[44px] !px-3" onClick={() => setDetalles((current) => current.filter((item) => item.producto_id !== detalle.producto_id))} disabled={isSaving} aria-label={`Retirar ${detalle.nombre}`}><X size={20} /></Button></div>)}</div>}</section>
        <section><label className="block text-app-label font-semibold text-food-charcoal" htmlFor="buscar-producto-pedido">Agregar productos</label><div className="relative mt-2"><Search className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-food-dark" size={20} /><input id="buscar-producto-pedido" className="min-h-[52px] w-full rounded-xl border border-food-sage bg-food-white py-3 pl-11 pr-4 text-app-label" placeholder="Buscar por nombre" value={search} onChange={(event) => setSearch(event.target.value)} disabled={isSaving} /></div>{productos.filter((producto) => producto.activo).length === 0 ? <p className="mt-3 text-app-description text-food-dark">No hay productos activos. <Link className="font-semibold text-food-dark underline" to="/menu">Ir a Menú</Link></p> : <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">{disponibles.map((producto) => <button className="flex w-full items-center justify-between rounded-xl border border-food-sage-light p-3 text-left text-app-description hover:bg-food-sage-light/40 disabled:opacity-60" type="button" key={producto.id} onClick={() => setDetalles((current) => [...current, { producto_id: producto.id, cantidad: 1, nombre: producto.nombre, tipo: producto.tipo, precio: originalPrices.get(producto.id) ?? producto.precio }])} disabled={isSaving}><span>{producto.nombre} · {producto.tipo === 'plato' ? 'Plato' : 'Bebida'}</span><strong>Bs {producto.precio}</strong></button>)}</div>}</section>
        <label className="block text-app-label font-semibold text-food-charcoal" htmlFor="observaciones">Observaciones<textarea id="observaciones" className="mt-2 min-h-28 w-full rounded-xl border border-food-sage bg-food-white p-4 text-app-label" value={observaciones} onChange={(event) => setObservaciones(event.target.value)} disabled={isSaving} /></label>
        <section className="rounded-xl bg-food-sage-light p-5 text-app-description text-food-dark"><p>Cantidad total: <strong>{totals.valid ? totals.units : 'Inválida'}</strong></p><p className="mt-2 text-app-subtitle font-bold">Total a pagar: {totals.valid ? formatCents(totals.total) : 'Importe inválido'}</p></section><ErrorMessage>{error}</ErrorMessage><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button><Button type="submit" disabled={isSaving || !totals.valid}>{isSaving ? 'Guardando...' : 'Guardar pedido'}</Button></div>
      </form>
    </Modal>
  )
}

export default PedidoFormModal
