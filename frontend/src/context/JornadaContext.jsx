import { useEffect, useEffectEvent, useRef, useState } from 'react'

import { ApiError } from '../services/api.js'
import { getJornada } from '../services/jornadas.js'
import { useAuth } from './auth.js'
import { JornadaContext } from './jornada.js'

function storageKey(username) {
  return `foodcontrol.jornada.${username}`
}

export function JornadaProvider({ children }) {
  const { user, clearSession } = useAuth()
  const [selectedJornada, setSelectedJornada] = useState(null)
  const [isCheckingJornada, setIsCheckingJornada] = useState(true)
  const currentStorageKey = useRef(null)

  function clearSelectedJornada() {
    if (currentStorageKey.current) {
      localStorage.removeItem(currentStorageKey.current)
    }
    setSelectedJornada(null)
  }

  function selectJornada(jornada) {
    if (jornada.estado !== 'abierta' || !currentStorageKey.current) {
      return
    }
    localStorage.setItem(currentStorageKey.current, String(jornada.id))
    setSelectedJornada(jornada)
  }

  function syncSelectedJornada(jornada) {
    if (selectedJornada?.id !== jornada.id) {
      return
    }
    if (jornada.estado !== 'abierta') {
      clearSelectedJornada()
      return
    }
    setSelectedJornada(jornada)
  }

  const restoreSelectedJornada = useEffectEvent(async (userToRestore, isMounted) => {
      if (!userToRestore) {
        if (currentStorageKey.current) localStorage.removeItem(currentStorageKey.current)
        if (isMounted()) {
          setSelectedJornada(null)
          setIsCheckingJornada(false)
        }
        return
      }

      const key = storageKey(userToRestore.username)
      currentStorageKey.current = key
      const jornadaId = localStorage.getItem(key)
      if (!jornadaId) {
        if (isMounted()) {
          setSelectedJornada(null)
          setIsCheckingJornada(false)
        }
        return
      }

      try {
        const jornada = await getJornada(jornadaId)
        if (jornada.estado === 'abierta') {
          if (isMounted()) setSelectedJornada(jornada)
        } else {
          localStorage.removeItem(key)
          if (isMounted()) setSelectedJornada(null)
        }
      } catch (error) {
        localStorage.removeItem(key)
        if (isMounted() && error instanceof ApiError && error.status === 403) {
          clearSession()
        }
        if (isMounted()) setSelectedJornada(null)
      } finally {
        if (isMounted()) setIsCheckingJornada(false)
      }
    })

  useEffect(() => {
    let isMounted = true
    const timer = window.setTimeout(() => restoreSelectedJornada(user, () => isMounted), 0)
    return () => {
      isMounted = false
      window.clearTimeout(timer)
    }
  }, [user])

  return (
    <JornadaContext value={{ selectedJornada, isCheckingJornada, selectJornada, clearSelectedJornada, syncSelectedJornada }}>
      {children}
    </JornadaContext>
  )
}
