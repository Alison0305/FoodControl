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
  const units = quantityFrom(quantity)
  if (cents === null || units === null) return null
  return cents * units
}

export function quantityFrom(value) {
  const text = String(value).trim()
  if (!/^[1-9]\d*$/.test(text)) return null
  const quantity = BigInt(text)
  return quantity <= MAX_QUANTITY ? quantity : null
}

export function orderTotals(details) {
  return details.reduce((totals, detail) => {
    const subtotal = lineSubtotal(detail.precio, detail.cantidad)
    const quantity = quantityFrom(detail.cantidad)
    if (!totals.valid || subtotal === null || quantity === null) return { ...totals, valid: false }
    return { valid: true, units: totals.units + quantity, total: totals.total + subtotal }
  }, { valid: true, units: 0n, total: 0n })
}
export const MAX_QUANTITY = 2147483647n
