import { RotateCcw, ToggleLeft, ToggleRight, TriangleAlert, XCircle } from 'lucide-react'

import { Button, ErrorMessage } from './ui.jsx'
import Modal from './Modal.jsx'

function ConfirmDialog({ action, subject, isLoading, error, onCancel, onConfirm }) {
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
      isDeletion: true,
      title: 'Eliminar jornada',
      description: 'Se eliminarán permanentemente todos sus productos, pedidos, detalles y pagos asociados. Esta acción no se puede deshacer.',
      button: 'Sí, eliminar jornada',
      variant: 'danger',
    },
    desactivar: {
      icon: ToggleLeft,
      iconClass: 'bg-yellow-100 text-status-waiting',
      title: 'Desactivar producto',
      description: 'El producto dejará de estar disponible para nuevos pedidos.',
      button: 'Desactivar producto',
      variant: 'danger',
    },
    activar: {
      icon: ToggleRight,
      iconClass: 'bg-food-sage-light text-food-dark',
      title: 'Activar producto',
      description: 'El producto volverá a estar disponible para nuevos pedidos.',
      button: 'Activar producto',
      variant: 'primary',
    },
    eliminarProducto: {
      icon: TriangleAlert,
      iconClass: 'bg-red-50 text-status-cancelled',
      isDeletion: true,
      title: 'Eliminar producto',
      description: 'Esta acción no se puede deshacer. Los productos con pedidos asociados deben desactivarse.',
      button: 'Sí, eliminar producto',
      variant: 'danger',
    },
  }[action]
  const Icon = configuration.icon

  function cancel() {
    if (!isLoading) onCancel()
  }

  return (
    <Modal title={configuration.title} titleIcon={configuration.isDeletion ? Icon : undefined} titleIconClassName={configuration.isDeletion ? configuration.iconClass : ''} titleClassName="text-2xl" onClose={cancel}>
      {!configuration.isDeletion && <div className={`grid size-12 place-items-center rounded-full ${configuration.iconClass}`}><Icon size={26} aria-hidden="true" /></div>}
      <p className={`${configuration.isDeletion ? '' : 'mt-5'} text-app-body leading-7 text-food-dark`}>
        ¿Desea continuar con <strong className="text-food-charcoal">{subject}</strong>?
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
