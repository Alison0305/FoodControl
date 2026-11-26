import { ChefHat, CheckCircle2, TriangleAlert, XCircle } from 'lucide-react'
import { useState } from 'react'

import Modal from './Modal.jsx'
import { Button, ErrorMessage } from './ui.jsx'
import { availableOrderActions } from '../utils/orderStatus.js'

function PedidoStatusActions({ pedido, disabled, onChange }) {
  const [isCanceling, setIsCanceling] = useState(false)
  const [error, setError] = useState('')
  const actions = availableOrderActions(pedido.estado)
  const canPrepare = actions.includes('preparar')
  const canDeliver = actions.includes('entregar')

  async function change(estado) {
    if (disabled) return
    await onChange(estado)
  }

  async function cancel() {
    try {
      await change('cancelado')
      setIsCanceling(false)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return <>{canPrepare && <Button variant="secondary" onClick={() => change('en_preparacion')} disabled={disabled}><ChefHat size={19} />Iniciar preparación</Button>}{canDeliver && <Button variant="primary" onClick={() => change('entregado')} disabled={disabled}><CheckCircle2 size={19} />Marcar entregado</Button>}{(canPrepare || canDeliver) && <Button variant="danger" onClick={() => { setError(''); setIsCanceling(true) }} disabled={disabled}><XCircle size={19} />Cancelar</Button>}{isCanceling && <Modal title="Cancelar pedido" titleIcon={TriangleAlert} titleIconClassName="bg-red-50 text-status-cancelled" onClose={() => !disabled && setIsCanceling(false)}><p className="text-app-body text-food-dark">¿Desea cancelar el pedido <strong className="text-food-charcoal">#{pedido.id} de {pedido.nombre_cliente}</strong>?</p><p className="mt-3 text-app-description text-food-dark">El pedido se conservará como cancelado y esta acción no podrá revertirse.</p><div className="mt-5"><ErrorMessage>{error}</ErrorMessage></div><div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setIsCanceling(false)} disabled={disabled}>Volver</Button><Button variant="danger" onClick={cancel} disabled={disabled}>Cancelar pedido</Button></div></Modal>}</>
}

export default PedidoStatusActions
