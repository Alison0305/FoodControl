import test from 'node:test'
import assert from 'node:assert/strict'

import { centsFrom, formatCents, lineSubtotal, orderTotals } from './money.js'

test('calcula centavos sin pérdida decimal', () => {
  assert.equal(formatCents(lineSubtotal('0.10', 3)), 'Bs 0.30')
  assert.equal(formatCents(lineSubtotal('99999999.99', 2147483647)), 'Bs 214748364678525163.53')
})

test('rechaza valores monetarios y cantidades inválidos', () => {
  assert.equal(centsFrom('1.999'), null)
  assert.equal(lineSubtotal('2.00', 1.5), null)
  assert.deepEqual(orderTotals([{ precio: '2.00', cantidad: 0 }]), { valid: false, units: 0n, total: 0n })
})

test('mantiene la invalidez para cualquier posición y límite de cantidad', () => {
  for (const details of [[{ precio: '1.00', cantidad: '' }, { precio: '1.00', cantidad: 1 }], [{ precio: '1.00', cantidad: 1 }, { precio: '1.00', cantidad: '1.5' }], [{ precio: '1.00', cantidad: 1 }, { precio: '1.00', cantidad: -1 }, { precio: '1.00', cantidad: 1 }]]) assert.equal(orderTotals(details).valid, false)
  assert.equal(orderTotals([{ precio: '0.00', cantidad: 2147483647 }]).valid, true)
  assert.equal(orderTotals([{ precio: '1.00', cantidad: 2147483648 }]).valid, false)
})
