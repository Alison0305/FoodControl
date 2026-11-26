import { centsFrom } from './money.js'
import { filterOrders } from './orderFilters.js'

const zero = 0n
const cents = (value) => centsFrom(value) ?? zero

export function paymentSummary(orders) {
  return orders.reduce((summary, order) => {
    if (order.estado === 'cancelado') return summary
    const total = cents(order.total)
    const paid = cents(order.total_pagado)
    const balance = cents(order.saldo_pendiente)
    return {
      total: summary.total + total,
      paid: summary.paid + paid,
      balance: summary.balance + balance,
      pending: summary.pending + (balance > zero ? 1 : 0),
    }
  }, { total: zero, paid: zero, balance: zero, pending: 0 })
}

export function filterPaymentOrders(orders, filters) {
  if (!filters.orden.startsWith('saldo_')) return filterOrders(orders, filters)
  const filtered = filterOrders(orders, { ...filters, orden: 'recientes' })
  const direction = filters.orden === 'saldo_mayor' ? -1 : 1
  return filtered.sort((first, second) => {
    const firstBalance = cents(first.saldo_pendiente)
    const secondBalance = cents(second.saldo_pendiente)
    if (firstBalance === secondBalance) return new Date(second.fecha_creacion) - new Date(first.fecha_creacion)
    return firstBalance > secondBalance ? direction : -direction
  })
}
