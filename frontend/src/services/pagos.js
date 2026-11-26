import { getCsrfToken, request } from './api.js'

async function write(path, data) {
  const csrfToken = await getCsrfToken()
  return request(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken }, body: JSON.stringify(data) })
}

export const getPagosPedido = (pedidoId) => request(`/api/pedidos/${pedidoId}/pagos/`)
export const registerPago = (pedidoId, data) => write(`/api/pedidos/${pedidoId}/pagos/`, data)
export const cancelPago = (pagoId, motivo_anulacion) => write(`/api/pagos/${pagoId}/anular/`, { motivo_anulacion })
