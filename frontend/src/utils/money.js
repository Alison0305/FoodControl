export function centsFrom(value) {
  const match = String(value).trim().match(/^(\d+)(?:\.(\d{1,2}))?$/)
  if (!match) return null
  return BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0'))
}

export function formatCents(cents) {
  const normalized = typeof cents === 'bigint' ? cents : centsFrom(cents)
  if (normalized === null) return null
  return `Bs ${normalized / 100n}.${(normalized % 100n).toString().padStart(2, '0')}`
}

export function lineSubtotal(price, quantity) {
  const cents = centsFrom(price)
  const units = Number(quantity)
  if (cents === null || !Number.isSafeInteger(units) || units < 1) return null
  return cents * BigInt(units)
}

export function orderTotals(details) {
  return details.reduce((totals, detail) => {
    const subtotal = lineSubtotal(detail.precio, detail.cantidad)
    if (subtotal === null) return { valid: false, units: 0, total: 0n }
    return { valid: true, units: totals.units + Number(detail.cantidad), total: totals.total + subtotal }
  }, { valid: true, units: 0, total: 0n })
}
