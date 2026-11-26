export function normalizeSearch(value) {
  return String(value).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
}

export function filterOrders(orders, filters) {
  const term = normalizeSearch(filters.busqueda.replace(/^#/, ''))
  const filtered = orders.filter((order) => (!term || (term.match(/^\d+$/) && String(order.id) === term) || normalizeSearch(order.nombre_cliente).includes(term)) && (!filters.tipo || order.tipo === filters.tipo) && (!filters.estado || order.estado === filters.estado) && (!filters.estado_pago || order.estado_pago === filters.estado_pago))
  const amount = (order) => BigInt(order.total.replace('.', ''))
  const compare = { recientes: (a, b) => b.id - a.id, antiguos: (a, b) => a.id - b.id, cliente_az: (a, b) => normalizeSearch(a.nombre_cliente).localeCompare(normalizeSearch(b.nombre_cliente)), cliente_za: (a, b) => normalizeSearch(b.nombre_cliente).localeCompare(normalizeSearch(a.nombre_cliente)), importe_mayor: (a, b) => amount(a) > amount(b) ? -1 : amount(a) < amount(b) ? 1 : b.id - a.id, importe_menor: (a, b) => amount(a) < amount(b) ? -1 : amount(a) > amount(b) ? 1 : b.id - a.id }
  return filtered.sort(compare[filters.orden] || compare.recientes)
}
