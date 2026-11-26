import { useState } from 'react'

import Modal from './Modal.jsx'
import { Button, ErrorMessage, FormField } from './ui.jsx'

function ProductoFormModal({ producto, isSaving, onClose, onSave }) {
  const [nombre, setNombre] = useState(producto?.nombre || '')
  const [tipo, setTipo] = useState(producto?.tipo || 'plato')
  const [precio, setPrecio] = useState(producto?.precio || '')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const normalizedName = nombre.trim()
    if (!normalizedName) {
      setError('Ingrese el nombre del producto.')
      return
    }
    if (precio === '' || Number(precio) < 0) {
      setError('Ingrese un precio válido igual o mayor a Bs 0.00.')
      return
    }
    if (!/^\d+(\.\d{1,2})?$/.test(precio)) {
      setError('El precio debe tener como máximo dos decimales.')
      return
    }

    setError('')
    try {
      await onSave({ nombre: normalizedName, tipo, precio: Number(precio).toFixed(2) })
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <Modal title={producto ? 'Editar producto' : 'Nuevo producto'} onClose={isSaving ? () => {} : onClose}>
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <FormField id="producto-nombre" label="Nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Ej.: Silpancho" disabled={isSaving} autoFocus />
        <label className="block text-app-label font-semibold text-food-charcoal" htmlFor="producto-tipo">
          Tipo
          <select id="producto-tipo" className="mt-2 min-h-[52px] w-full rounded-xl border border-food-sage bg-food-white px-4 py-3.5 text-app-label text-food-charcoal outline-none focus:border-food-dark focus:ring-4 focus:ring-food-sage-light" value={tipo} onChange={(event) => setTipo(event.target.value)} disabled={isSaving}>
            <option value="plato">Plato</option>
            <option value="bebida">Bebida</option>
          </select>
        </label>
        <FormField id="producto-precio" label="Precio" type="number" min="0" step="0.01" inputMode="decimal" value={precio} onChange={(event) => setPrecio(event.target.value)} placeholder="0.00" disabled={isSaving} endAdornment={<span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-app-label font-semibold text-food-dark">Bs</span>} />
        <ErrorMessage>{error}</ErrorMessage>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar producto'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default ProductoFormModal
