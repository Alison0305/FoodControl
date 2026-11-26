import { useEffect, useState } from 'react'

import { ApiError, getCurrentUser, login as loginRequest, logout as logoutRequest } from '../services/api.js'
import { AuthContext } from './auth.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function restoreSession() {
      try {
        const currentUser = await getCurrentUser()
        if (isMounted) setUser(currentUser)
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 403) {
          console.error('No se pudo comprobar la sesión.', error)
        }
      } finally {
        if (isMounted) setIsChecking(false)
      }
    }

    restoreSession()
    return () => { isMounted = false }
  }, [])

  async function login(username, password) {
    const authenticatedUser = await loginRequest(username, password)
    setUser(authenticatedUser)
  }

  async function logout() {
    await logoutRequest()
    setUser(null)
  }

  function clearSession() {
    setUser(null)
  }

  return <AuthContext value={{ user, isChecking, login, logout, clearSession }}>{children}</AuthContext>
}
