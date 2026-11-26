import test from 'node:test'
import assert from 'node:assert/strict'

import { filterPaymentOrders, paymentSummary } from './paymentDashboard.js'

const orders = [
  { id: 1, nombre_cliente: 'Ana', estado: 'en_espera', estado_pago: 'pendiente', total: '10.10', total_pagado: '0.00', saldo_pendiente: '10.10', fecha_creacion: '2026-01-01T10:00:00Z' },
  { id: 2, nombre_cliente: 'Beto', estado: 'entregado', estado_pago: 'parcial', total: '20.00', total_pagado: '5.05', saldo_pendiente: '14.95', fecha_creacion: '2026-01-02T10:00:00Z' },
  { id: 3, nombre_cliente: 'Cora', estado: 'cancelado', estado_pago: 'pendiente', total: '99.00', total_pagado: '0.00', saldo_pendiente: '99.00', fecha_creacion: '2026-01-03T10:00:00Z' },
]

test('resume la jornada con centavos y excluye pedidos cancelados', () => {
  assert.deepEqual(paymentSummary(orders), { total: 3010n, paid: 505n, balance: 2505n, pending: 2 })
})

test('ordena pedidos por saldo pendiente', () => {
  const filters = { busqueda: '', tipo: '', estado: '', estado_pago: '', orden: 'saldo_mayor' }
  assert.deepEqual(filterPaymentOrders(orders, filters).map(({ id }) => id), [3, 2, 1])
})

test('actualiza el resumen al registrar o anular un pago', () => {
  const paid = orders.map((order) => order.id === 1 ? { ...order, total_pagado: '10.10', saldo_pendiente: '0.00', estado_pago: 'pagado' } : order)
  const cancelled = paid.map((order) => order.id === 1 ? { ...order, total_pagado: '0.00', saldo_pendiente: '10.10', estado_pago: 'pendiente' } : order)
  assert.equal(paymentSummary(paid).balance, 1495n)
  assert.equal(paymentSummary(cancelled).balance, 2505n)
})
