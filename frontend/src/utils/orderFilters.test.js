import test from 'node:test'
import assert from 'node:assert/strict'
import { filterOrders } from './orderFilters.js'

const orders = [{ id: 3, nombre_cliente: 'José Castro', tipo: 'reserva', estado: 'en_espera', estado_pago: 'pendiente' }, { id: 10, nombre_cliente: 'Mabel Castro', tipo: 'venta_directa', estado: 'entregado', estado_pago: 'pagado' }]
test('busca tildes, apellidos e identificadores exactos', () => { assert.equal(filterOrders(orders, { busqueda: 'jose', tipo: '', estado: '', estado_pago: '' }).length, 1); assert.equal(filterOrders(orders, { busqueda: '#3', tipo: '', estado: '', estado_pago: '' }).length, 1); assert.equal(filterOrders(orders, { busqueda: '1', tipo: '', estado: '', estado_pago: '' }).length, 0) })

test('combina filtros y ordenamientos deterministas', () => {
  const filtered = filterOrders(orders, { busqueda: 'castro', tipo: 'venta_directa', estado: 'entregado', estado_pago: 'pagado', orden: 'cliente_az' })
  assert.deepEqual(filtered.map((order) => order.id), [10])
  assert.equal(filterOrders(orders, { busqueda: '', tipo: '', estado: '', estado_pago: '', orden: 'recientes' }).length, 2)
})
