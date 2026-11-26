import { Banknote, QrCode, TriangleAlert } from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'

import Modal from './Modal.jsx'
import { Button, ErrorMessage, LoadingIndicator, StatusBadge } from './ui.jsx'
import { cancelPago, getPagosPedido, registerPago } from '../services/pagos.js'
import { formatCents } from '../utils/money.js'
import { paymentError, paymentIntentId } from '../utils/payments.js'

const paymentTones = { pendiente: 'waiting', parcial: 'preparing', pagado: 'delivered' }
const paymentLabels = { pendiente: 'Pendiente', parcial: 'Parcial', pagado: 'Pagado' }
const operationalLabels = { en_espera: 'En espera', en_preparacion: 'En preparación', entregado: 'Entregado', cancelado: 'Cancelado' }
const operationalTones = { en_espera: 'waiting', en_preparacion: 'preparing', entregado: 'delivered', cancelado: 'cancelled' }
const dateTime = (value) => new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/La_Paz' }).format(new Date(value))

function PagoAnulacionModal({ pago, pedido, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit() {
    if (!motivo.trim()) { setError('Ingrese el motivo de anulación.'); return }
    setSaving(true); setError('')
    try { await onConfirm(motivo.trim()); onClose() } catch (requestError) { setError(requestError.message) } finally { setSaving(false) }
  }
  return <Modal title="Anular pago" titleIcon={TriangleAlert} titleIconClassName="bg-red-50 text-status-cancelled" onClose={() => !saving && onClose()}><div className="space-y-4 text-app-description text-food-dark"><p>Pedido <strong className="text-food-charcoal">#{pedido.id}</strong> · {pedido.nombre_cliente}</p><p>Se anulará <strong className="text-food-charcoal">{formatCents(pago.monto)}</strong> mediante {pago.metodo === 'qr' ? 'QR' : 'efectivo'}.</p><label className="block text-app-label font-semibold text-food-charcoal" htmlFor="motivo-anulacion">Motivo de anulación<textarea className="mt-2 min-h-28 w-full rounded-xl border border-food-sage px-4 py-3 text-app-label outline-none focus:ring-4 focus:ring-food-sage-light" id="motivo-anulacion" value={motivo} onChange={(event) => setMotivo(event.target.value)} /></label><p>Anular este registro actualizará el saldo pendiente. No devuelve automáticamente el dinero al cliente.</p><ErrorMessage>{error}</ErrorMessage><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" disabled={saving} onClick={onClose}>Volver</Button><Button variant="danger" disabled={saving} onClick={submit}>{saving ? 'Anulando...' : 'Anular pago'}</Button></div></div></Modal>
}

function PedidoPagosModal({ pedidoId, jornada, onClose, onUpdated, onSuccess }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('efectivo')
  const [saving, setSaving] = useState(false)
  const [canceling, setCanceling] = useState(null)
  const [anulando, setAnulando] = useState(null)
  const intentRef = useRef('')
  const uncertainRef = useRef(null)

  async function load() {
    setLoading(true); setError('')
    try { const loaded = await getPagosPedido(pedidoId); setData(loaded); onUpdated(loaded.pedido) } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }
  const reload = useEffectEvent(() => load())
  useEffect(() => { const timer = setTimeout(reload, 0); return () => clearTimeout(timer) }, [pedidoId])
  const pedido = data?.pedido
  const canWrite = jornada.estado === 'abierta' && pedido?.estado !== 'cancelado'
  const validation = pedido ? paymentError(amount, pedido.saldo_pendiente) : ''

  function setFullBalance() { if (pedido) setAmount(pedido.saldo_pendiente) }
  async function submitPayment() {
    if (!pedido || saving || validation) return
    const signature = `${amount}|${method}`
    if (uncertainRef.current && uncertainRef.current !== signature) {
      await load()
      intentRef.current = ''
      uncertainRef.current = null
    }
    setSaving(true); setError('')
    intentRef.current = paymentIntentId(intentRef.current)
    try {
      await registerPago(pedido.id, { monto: amount, metodo: method, identificador_idempotencia: intentRef.current })
      setAmount(''); intentRef.current = ''; uncertainRef.current = null
      await load()
      onSuccess?.()
    } catch (requestError) {
      uncertainRef.current = signature
      setError(requestError.message || 'No fue posible registrar el pago. Puede reintentarlo sin duplicarlo.')
    } finally { setSaving(false) }
  }
  async function annul(pago, motivo) {
    if (anulando) return
    setAnulando(pago.id); setError('')
    try { await cancelPago(pago.id, motivo); await load(); onSuccess?.() } catch (requestError) { setError(requestError.message); throw requestError } finally { setAnulando(null) }
  }

  if (loading) return <Modal title="Gestión de pagos" onClose={onClose}><LoadingIndicator label="Cargando pagos..." /></Modal>
  if (!pedido) return <Modal title="Gestión de pagos" onClose={onClose}><ErrorMessage>{error || 'No fue posible cargar el pedido.'}</ErrorMessage><div className="mt-5"><Button variant="secondary" onClick={load}>Reintentar</Button></div></Modal>
  return <><Modal title={`Pagos del pedido #${pedido.id}`} onClose={onClose}><div className="space-y-6 text-food-dark"><div><p className="text-app-body font-bold text-food-charcoal">{pedido.nombre_cliente}</p><div className="mt-3 flex flex-wrap gap-3"><StatusBadge tone={operationalTones[pedido.estado]}>{operationalLabels[pedido.estado]}</StatusBadge><StatusBadge tone={paymentTones[pedido.estado_pago]}>{paymentLabels[pedido.estado_pago]}</StatusBadge></div></div><div className="grid gap-3 rounded-xl bg-food-beige p-4 text-app-description sm:grid-cols-3"><p>Total <strong className="block text-app-label">{formatCents(pedido.total)}</strong></p><p>Pagado <strong className="block text-app-label">{formatCents(pedido.total_pagado)}</strong></p><p>Saldo <strong className="block text-app-label">{formatCents(pedido.saldo_pendiente)}</strong></p></div><ErrorMessage>{error}</ErrorMessage>{pedido.saldo_pendiente === '0.00' ? <p className="rounded-xl bg-green-100 px-4 py-3 text-app-description font-semibold text-status-delivered">Pedido completamente pagado.</p> : <section className="space-y-4 rounded-xl border border-food-sage-light p-4"><h3 className="text-app-label font-bold text-food-charcoal">Registrar pago</h3><label className="block text-app-label font-semibold text-food-charcoal" htmlFor="monto-pago">Monto (Bs)<input className="mt-2 min-h-[52px] w-full rounded-xl border border-food-sage px-4 text-app-label outline-none focus:ring-4 focus:ring-food-sage-light" id="monto-pago" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={!canWrite || saving} /></label><Button variant="secondary" onClick={setFullBalance} disabled={!canWrite || saving}>Pagar saldo completo</Button><div className="grid gap-3 sm:grid-cols-2"><Button variant={method === 'efectivo' ? 'primary' : 'secondary'} onClick={() => setMethod('efectivo')} disabled={!canWrite || saving}><Banknote size={20} />Efectivo</Button><Button variant={method === 'qr' ? 'primary' : 'secondary'} onClick={() => setMethod('qr')} disabled={!canWrite || saving}><QrCode size={20} />QR</Button></div>{method === 'qr' && <p className="rounded-xl bg-blue-100 px-4 py-3 text-app-description text-status-preparing">Verifique manualmente la recepción del dinero antes de registrar el pago.</p>}{validation && <ErrorMessage>{validation}</ErrorMessage>}<Button onClick={submitPayment} disabled={!canWrite || saving || Boolean(validation)}>{saving ? 'Registrando...' : 'Registrar pago'}</Button>{!canWrite && <p className="text-app-description">La jornada cerrada o un pedido cancelado no admite nuevos pagos.</p>}</section>}<section><h3 className="text-app-label font-bold text-food-charcoal">Historial de pagos</h3><div className="mt-3 space-y-3">{data.pagos.length === 0 ? <p className="text-app-description">Aún no hay pagos registrados.</p> : data.pagos.map((pago) => <article className={`rounded-xl border p-4 text-app-description ${pago.estado === 'anulado' ? 'border-red-200 bg-red-50' : 'border-food-sage-light'}`} key={pago.id}><div className="flex flex-wrap items-center justify-between gap-3"><strong className="text-app-label text-food-charcoal">{formatCents(pago.monto)} · {pago.metodo === 'qr' ? 'QR' : 'Efectivo'}</strong><StatusBadge tone={pago.estado === 'anulado' ? 'cancelled' : 'delivered'}>{pago.estado === 'anulado' ? 'Anulado' : 'Vigente'}</StatusBadge></div><p className="mt-2">{dateTime(pago.fecha_pago)} · {pago.registrado_por}</p>{pago.estado === 'anulado' ? <p className="mt-2">Anulado por {pago.anulado_por} el {dateTime(pago.fecha_anulacion)}: {pago.motivo_anulacion}</p> : jornada.estado === 'abierta' && <Button className="mt-3" variant="danger" disabled={Boolean(anulando)} onClick={() => setCanceling(pago)}>Anular</Button>}</article>)}</div></section></div></Modal>{canceling && <PagoAnulacionModal pago={canceling} pedido={pedido} onClose={() => setCanceling(null)} onConfirm={(motivo) => annul(canceling, motivo)} />}</>
}

export default PedidoPagosModal
