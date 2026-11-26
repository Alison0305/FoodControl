import { getCsrfToken, request } from './api.js'

async function write(path, method, data) {
  const csrfToken = await getCsrfToken()
  return request(path, { method, headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken }, body: JSON.stringify(data) })
}

export const listPedidos = (jornadaId) => request(`/api/jornadas/${jornadaId}/pedidos/`)
export const getPedido = (pedidoId) => request(`/api/pedidos/${pedidoId}/`)
export const createPedido = (jornadaId, data) => write(`/api/jornadas/${jornadaId}/pedidos/`, 'POST', data)
export const updatePedido = (pedidoId, data) => write(`/api/pedidos/${pedidoId}/`, 'PATCH', data)
