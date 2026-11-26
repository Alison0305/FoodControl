import test from 'node:test'
import assert from 'node:assert/strict'

import { paymentError, paymentIntentId } from './payments.js'

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
