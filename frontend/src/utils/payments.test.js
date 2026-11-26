import test from 'node:test'
import assert from 'node:assert/strict'

import { clearPendingPayment, paymentError, paymentIntentId, paymentWithIntent, readPendingPayment, savePendingPayment } from './payments.js'

test('valida montos de pago con centavos exactos y saldo disponible', () => {
  assert.equal(paymentError('0.10', '0.30'), '')
  assert.equal(paymentError('0.31', '0.30'), 'El monto no puede superar el saldo pendiente.')
  assert.match(paymentError('0', '1.00'), /mayor/)
  assert.match(paymentError('1.001', '2.00'), /mayor/)
})

test('conserva el identificador de idempotencia al reintentar', () => {
  const id = paymentIntentId('', () => 'uuid-prueba')
  assert.equal(id, 'uuid-prueba')
  assert.equal(paymentIntentId(id, () => 'otro-uuid'), 'uuid-prueba')
})

test('recupera una intención incierta aislada por usuario y pedido', () => {
  const values = new Map()
  const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }
  const intent = { identificador_idempotencia: 'uuid', monto: '40.00', metodo: 'qr' }
  savePendingPayment(storage, 'ana', 5, intent)
  assert.deepEqual(readPendingPayment(storage, 'ana', 5), intent)
  assert.equal(readPendingPayment(storage, 'ana', 6), null)
  assert.equal(paymentWithIntent([{ identificador_idempotencia: 'uuid', estado: 'vigente' }], intent).estado, 'vigente')
  clearPendingPayment(storage, 'ana', 5)
  assert.equal(readPendingPayment(storage, 'ana', 5), null)
})
