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
  assert.deepEqual(orderTotals([{ precio: '2.00', cantidad: 0 }]), { valid: false, units: 0, total: 0n })
})
