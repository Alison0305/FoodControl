import { useState } from 'react'

import DatePicker from './DatePicker.jsx'
import { Button, ErrorMessage, FormField } from './ui.jsx'
import Modal from './Modal.jsx'

function fechaBoliviaActual() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

function JornadaFormModal({ jornada, isSaving, onClose, onSave }) {
  const [nombre, setNombre] = useState(jornada?.nombre || '')
  const [fecha, setFecha] = useState(jornada?.fecha || fechaBoliviaActual())
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (!nombre.trim() || !fecha) {
      setError('Complete el nombre y la fecha de venta.')
      return
    }

    setError('')
    try {
      await onSave({ nombre: nombre.trim(), fecha })
    } catch (requestError) {
      const fieldErrors = requestError.data && Object.values(requestError.data).flat()
      setError(fieldErrors?.[0] || requestError.message)
    }
  }

  return (
    <Modal title={jornada ? 'Editar jornada' : 'Nueva jornada'} onClose={onClose}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <FormField id="jornada-nombre" label="Nombre de la jornada" value={nombre} onChange={(event) => setNombre(event.target.value)} autoFocus required />
        <DatePicker id="jornada-fecha" label="Fecha de venta" value={fecha} onChange={setFecha} required />
        <ErrorMessage>{error}</ErrorMessage>
        <div className="flex flex-col-reverse gap-3 border-t border-food-sage-light pt-5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar jornada'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default JornadaFormModal
