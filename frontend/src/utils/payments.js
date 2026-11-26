import { centsFrom } from './money.js'

export function paymentError(amount, balance) {
  const cents = centsFrom(amount)
  const available = centsFrom(balance)
  if (cents === null || cents <= 0n) return 'Ingrese un monto mayor a Bs 0.00 con hasta dos decimales.'
  if (available === null || cents > available) return 'El monto no puede superar el saldo pendiente.'
  return ''
}

export function paymentIntentId(currentId, generate = () => crypto.randomUUID()) {
  return currentId || generate()
}

export function pendingPaymentKey(username, pedidoId) {
  return `foodcontrol.pending-payment.${username}.${pedidoId}`
}

export function readPendingPayment(storage, username, pedidoId) {
  try {
    const value = storage.getItem(pendingPaymentKey(username, pedidoId))
    return value ? JSON.parse(value) : null
  } catch { return null }
}

export function savePendingPayment(storage, username, pedidoId, intent) {
  storage.setItem(pendingPaymentKey(username, pedidoId), JSON.stringify(intent))
}

export function clearPendingPayment(storage, username, pedidoId) {
  storage.removeItem(pendingPaymentKey(username, pedidoId))
}

export function paymentWithIntent(pagos, intent) {
  return pagos.find((pago) => pago.identificador_idempotencia === intent.identificador_idempotencia) || null
}
