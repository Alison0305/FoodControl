import { getCsrfToken, request } from './api.js'

export function listJornadas() {
  return request('/api/jornadas/')
}

export function getJornada(jornadaId) {
  return request(`/api/jornadas/${jornadaId}/`)
}

async function changeJornada(path, method, data) {
  const csrfToken = await getCsrfToken()
  return request(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: data ? JSON.stringify(data) : undefined,
  })
}

export function createJornada(data) {
  return changeJornada('/api/jornadas/', 'POST', data)
}

export function updateJornada(jornadaId, data) {
  return changeJornada(`/api/jornadas/${jornadaId}/`, 'PATCH', data)
}

export function closeJornada(jornadaId) {
  return changeJornada(`/api/jornadas/${jornadaId}/cerrar/`, 'POST')
}

export function reopenJornada(jornadaId) {
  return changeJornada(`/api/jornadas/${jornadaId}/abrir/`, 'POST')
}

export function deleteJornada(jornadaId) {
  return changeJornada(`/api/jornadas/${jornadaId}/`, 'DELETE')
}
