export function normalizeSearch(value) {
  return String(value).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
}

export function filterOrders(orders, filters) {
  let term = normalizeSearch(filters.busqueda)
  if (term.startsWith('#')) term = term.slice(1).trim()
  const isIdentifier = /^[0-9]{1,18}$/.test(term)
  const timestamp = (order) => new Date(order.fecha_creacion).getTime()
  const filtered = orders.filter((order) => (!term || (term.match(/^\d+$/) && String(order.id) === term) || normalizeSearch(order.nombre_cliente).includes(term)) && (!filters.tipo || order.tipo === filters.tipo) && (!filters.estado || order.estado === filters.estado) && (!filters.estado_pago || order.estado_pago === filters.estado_pago))
  const amount = (order) => BigInt(order.total.replace('.', ''))
  const compare = { recientes: (a, b) => timestamp(b) - timestamp(a) || b.id - a.id, antiguos: (a, b) => timestamp(a) - timestamp(b) || a.id - b.id, cliente_az: (a, b) => normalizeSearch(a.nombre_cliente).localeCompare(normalizeSearch(b.nombre_cliente)) || timestamp(a) - timestamp(b) || a.id - b.id, cliente_za: (a, b) => normalizeSearch(b.nombre_cliente).localeCompare(normalizeSearch(a.nombre_cliente)) || timestamp(a) - timestamp(b) || a.id - b.id, importe_mayor: (a, b) => amount(a) > amount(b) ? -1 : amount(a) < amount(b) ? 1 : timestamp(b) - timestamp(a) || b.id - a.id, importe_menor: (a, b) => amount(a) < amount(b) ? -1 : amount(a) > amount(b) ? 1 : timestamp(a) - timestamp(b) || a.id - b.id }
  return filtered.filter((order) => !term || (isIdentifier ? String(order.id) === term : normalizeSearch(order.nombre_cliente).includes(term))).sort(compare[filters.orden] || compare.recientes)
}
