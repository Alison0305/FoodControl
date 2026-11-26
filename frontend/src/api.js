class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
  })
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = response.status === 204 || !isJson ? null : await response.json()

  if (!response.ok) {
    throw new ApiError(data?.detail || 'No se pudo completar la solicitud.', response.status)
  }

  return data
}

export async function getCsrfToken() {
  const data = await request('/api/auth/csrf/')
  return data.csrfToken
}

export function getCurrentUser() {
  return request('/api/auth/me/')
}

export async function login(username, password) {
  const csrfToken = await getCsrfToken()

  return request('/api/auth/login/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify({ username, password }),
  })
}

export async function logout() {
  const csrfToken = await getCsrfToken()

  return request('/api/auth/logout/', {
    method: 'POST',
    headers: {
      'X-CSRFToken': csrfToken,
    },
  })
}

export { ApiError }
