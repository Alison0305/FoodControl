import { createContext, useContext } from 'react'

export const JornadaContext = createContext(null)

export function useJornada() {
  const context = useContext(JornadaContext)
  if (!context) {
    throw new Error('useJornada debe usarse dentro de JornadaProvider.')
  }
  return context
}
