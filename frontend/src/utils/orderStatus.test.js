import test from 'node:test'
import assert from 'node:assert/strict'
import { availableOrderActions } from './orderStatus.js'

test('expone acciones según el estado operativo', () => {
  assert.deepEqual(availableOrderActions('en_espera'), ['consultar', 'editar', 'preparar', 'cancelar'])
  assert.deepEqual(availableOrderActions('en_preparacion'), ['consultar', 'editar', 'entregar', 'cancelar'])
  assert.deepEqual(availableOrderActions('entregado'), ['consultar'])
  assert.deepEqual(availableOrderActions('cancelado'), ['consultar'])
})
