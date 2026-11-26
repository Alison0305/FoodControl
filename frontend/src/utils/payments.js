import { centsFrom } from './money.js'

export function paymentError(amount, balance) {
  const cents = centsFrom(amount)
  const available = centsFrom(balance)
  if (cents === null || cents <= 0n) return 'Ingrese un monto mayor a Bs 0.00 con hasta dos decimales.'
  if (available === null || cents > available) return 'El monto no puede superar el saldo pendiente.'
  return ''
}

export function paymentIntentId(currentId, generate = () => crypto.randomUUID()) {
  return currentId || generate()
}
