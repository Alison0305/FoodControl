import { RotateCcw, TriangleAlert, XCircle } from 'lucide-react'

import { Button, ErrorMessage } from './ui.jsx'
import Modal from './Modal.jsx'

function ConfirmDialog({ action, jornada, isLoading, error, onCancel, onConfirm }) {
  const configuration = {
    cerrar: {
      icon: XCircle,
      iconClass: 'bg-red-50 text-status-cancelled',
      title: 'Cerrar jornada',
      description: 'No se podrán editar sus datos hasta que la jornada sea reabierta.',
      button: 'Cerrar jornada',
      variant: 'danger',
    },
    abrir: {
      icon: RotateCcw,
      iconClass: 'bg-food-sage-light text-food-dark',
      title: 'Reabrir jornada',
      description: 'La jornada volverá a estar disponible para trabajar.',
      button: 'Reabrir jornada',
      variant: 'primary',
    },
    eliminar: {
      icon: TriangleAlert,
      iconClass: 'bg-red-50 text-status-cancelled',
      title: 'Eliminar jornada',
      description: 'Se eliminarán permanentemente todos sus productos, pedidos, detalles y pagos asociados. Esta acción no se puede deshacer.',
      button: 'Sí, eliminar jornada',
      variant: 'danger',
    },
  }[action]
  const Icon = configuration.icon

  function cancel() {
    if (!isLoading) onCancel()
  }

  return (
    <Modal title={configuration.title} titleClassName="text-2xl" onClose={cancel}>
      <div className={`grid size-12 place-items-center rounded-full ${configuration.iconClass}`}>
        <Icon size={26} aria-hidden="true" />
      </div>
      <p className="mt-5 text-app-body leading-7 text-food-dark">
        ¿Desea continuar con la jornada <strong className="text-food-charcoal">{jornada.nombre}</strong>?
      </p>
      <p className="mt-3 text-app-body leading-7 text-food-dark">{configuration.description}</p>
      <div className="mt-5"><ErrorMessage>{error}</ErrorMessage></div>
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={cancel} disabled={isLoading}>Cancelar</Button>
        <Button variant={configuration.variant} onClick={onConfirm} disabled={isLoading}>{isLoading ? 'Actualizando...' : configuration.button}</Button>
      </div>
    </Modal>
  )
}

export default ConfirmDialog
