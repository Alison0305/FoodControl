import { getCsrfToken, request } from './api.js'

async function write(path, method, data) {
  const csrfToken = await getCsrfToken()
  return request(path, {
    method,
    headers: {
      ...(data ? { 'Content-Type': 'application/json' } : {}),
      'X-CSRFToken': csrfToken,
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  })
}

export function listProductos(jornadaId) {
  return request(`/api/jornadas/${jornadaId}/productos/`)
}

export function createProducto(jornadaId, data) {
  return write(`/api/jornadas/${jornadaId}/productos/`, 'POST', data)
}

export function updateProducto(productoId, data) {
  return write(`/api/productos/${productoId}/`, 'PATCH', data)
}

export function deleteProducto(productoId) {
  return write(`/api/productos/${productoId}/`, 'DELETE')
}

export function activateProducto(productoId) {
  return write(`/api/productos/${productoId}/activar/`, 'POST')
}

export function deactivateProducto(productoId) {
  return write(`/api/productos/${productoId}/desactivar/`, 'POST')
}
