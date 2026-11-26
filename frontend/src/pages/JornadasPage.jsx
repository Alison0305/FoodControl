import { CalendarDays, CheckCircle2, Eye, Pencil, Plus, RotateCcw, Search, Trash2, XCircle } from 'lucide-react'
import { useEffect, useEffectEvent, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog.jsx'
import JornadaFormModal from '../components/JornadaFormModal.jsx'
import JornadaStatusBadge from '../components/JornadaStatusBadge.jsx'
import Modal from '../components/Modal.jsx'
import { Button, Card, EmptyState, ErrorMessage, LoadingIndicator, PageHeader, StatusBadge } from '../components/ui.jsx'
import { useAuth } from '../context/auth.js'
import { useJornada } from '../context/jornada.js'
import { ApiError } from '../services/api.js'
import { closeJornada, createJornada, deleteJornada, getJornada, listJornadas, reopenJornada, updateJornada } from '../services/jornadas.js'

function formatDate(date) {
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'long', timeZone: 'America/La_Paz' }).format(new Date(`${date}T12:00:00Z`))
}

function JornadasPage() {
  const { clearSession } = useAuth()
  const { selectedJornada, selectJornada, clearSelectedJornada, syncSelectedJornada } = useJornada()
  const [jornadas, setJornadas] = useState([])
  const [filter, setFilter] = useState('todas')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formJornada, setFormJornada] = useState(undefined)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [isChangingState, setIsChangingState] = useState(false)
  const [detailJornada, setDetailJornada] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  async function loadJornadas() {
    setError('')
    try {
      setJornadas(await listJornadas())
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        clearSession()
        return
      }
      setError('No fue posible cargar las jornadas. Revise la conexión e intente nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadInitialJornadas = useEffectEvent(() => loadJornadas())

  useEffect(() => {
    const timer = window.setTimeout(() => loadInitialJornadas(), 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function handleSave(data) {
    if (isSaving) return
    setIsSaving(true)
    try {
      const saved = formJornada ? await updateJornada(formJornada.id, data) : await createJornada(data)
      syncSelectedJornada(saved)
      setFormJornada(undefined)
      setSuccess(formJornada ? 'La jornada fue actualizada correctamente.' : 'La jornada fue creada correctamente.')
      await loadJornadas()
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) clearSession()
      throw requestError
    } finally {
      setIsSaving(false)
    }
  }

  async function handleConfirmState() {
    if (isChangingState) return
    setIsChangingState(true)
    try {
      if (confirmation.action === 'eliminar') {
        await deleteJornada(confirmation.jornada.id)
        if (selectedJornada?.id === confirmation.jornada.id) clearSelectedJornada()
        if (detailJornada?.id === confirmation.jornada.id) setDetailJornada(null)
        setConfirmation(null)
        setSuccess('La jornada y sus datos asociados fueron eliminados correctamente.')
        await loadJornadas()
        return
      }

      const updated = confirmation.action === 'cerrar'
        ? await closeJornada(confirmation.jornada.id)
        : await reopenJornada(confirmation.jornada.id)
      syncSelectedJornada(updated)
      if (updated.estado === 'cerrada' && selectedJornada?.id === updated.id) {
        clearSelectedJornada()
      }
      setConfirmation(null)
      setSuccess(updated.estado === 'cerrada' ? 'La jornada fue cerrada correctamente.' : 'La jornada fue reabierta correctamente.')
      await loadJornadas()
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) clearSession()
      setError(requestError.message)
    } finally {
      setIsChangingState(false)
    }
  }

  async function handleView(jornada) {
    setDetailJornada(jornada)
    setIsLoadingDetail(true)
    try {
      setDetailJornada(await getJornada(jornada.id))
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) clearSession()
      setError(requestError.message)
      setDetailJornada(null)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const visibleJornadas = jornadas.filter((jornada) => {
    const matchesFilter = filter === 'todas' || jornada.estado === filter
    return matchesFilter && jornada.nombre.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim())
  })

  return (
    <div className="space-y-8">
      <PageHeader title="Jornadas de venta" description="Cree y organice las jornadas para trabajar cada venta de forma independiente.">
        <Button onClick={() => { setSuccess(''); setFormJornada(null) }}><Plus size={20} aria-hidden="true" />Nueva jornada</Button>
      </PageHeader>

      {success && <p className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3.5 text-app-description font-medium text-status-delivered" role="status"><CheckCircle2 size={20} aria-hidden="true" />{success}</p>}
      <ErrorMessage>{error}</ErrorMessage>

      <Card>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-app-label font-semibold text-food-charcoal">Mostrar jornadas</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar jornadas">
              {[['todas', 'Todas'], ['abierta', 'Abiertas'], ['cerrada', 'Cerradas']].map(([value, label]) => (
                <Button key={value} variant={filter === value ? 'primary' : 'secondary'} onClick={() => setFilter(value)}>{label}</Button>
              ))}
            </div>
          </div>
          <label className="relative block lg:w-96" htmlFor="buscar-jornada">
            <span className="sr-only">Buscar por nombre</span>
            <Search className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-food-dark" size={21} aria-hidden="true" />
            <input id="buscar-jornada" className="min-h-11 w-full rounded-xl border border-food-sage bg-food-white py-3 pl-12 pr-4 text-app-label text-food-charcoal outline-none focus:border-food-dark focus:ring-4 focus:ring-food-sage-light" placeholder="Buscar por nombre" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        </div>
      </Card>

      {isLoading ? <LoadingIndicator label="Cargando jornadas..." /> : visibleJornadas.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No hay jornadas para mostrar" description={jornadas.length === 0 ? 'Cree una jornada para comenzar a organizar una venta.' : 'No se encontraron jornadas con los filtros seleccionados.'} />
      ) : (
        <section className="grid gap-5 xl:grid-cols-2" aria-label="Listado de jornadas">
          {visibleJornadas.map((jornada) => {
            const isSelected = selectedJornada?.id === jornada.id
            const isOpen = jornada.estado === 'abierta'
            return (
              <Card className={isSelected ? 'border-food-sage bg-food-sage-light/35' : ''} key={jornada.id}>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3"><h2 className="text-app-subtitle font-bold text-food-charcoal">{jornada.nombre}</h2><JornadaStatusBadge estado={jornada.estado} />{isSelected && <StatusBadge>Seleccionada</StatusBadge>}</div>
                    <p className="mt-3 text-app-body text-food-dark">{formatDate(jornada.fecha)}</p>
                    <p className="mt-2 text-app-description text-food-dark">Registrada por {jornada.creado_por}</p>
                  </div>
                  <CalendarDays className="text-food-dark" size={28} aria-hidden="true" />
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => handleView(jornada)}><Eye size={19} aria-hidden="true" />Consultar</Button>
                  <Button variant="secondary" onClick={() => setFormJornada(jornada)} disabled={!isOpen}><Pencil size={19} aria-hidden="true" />Editar</Button>
                  <Button variant={isSelected ? 'secondary' : 'primary'} onClick={() => selectJornada(jornada)} disabled={!isOpen || isSelected}>{isSelected ? 'Jornada activa' : 'Seleccionar'}</Button>
                  <Button variant="secondary" onClick={() => setConfirmation({ action: isOpen ? 'cerrar' : 'abrir', jornada })}>{isOpen ? <><XCircle size={19} aria-hidden="true" />Cerrar</> : <><RotateCcw size={19} aria-hidden="true" />Reabrir</>}</Button>
                  <Button variant="danger" onClick={() => setConfirmation({ action: 'eliminar', jornada })}><Trash2 size={19} aria-hidden="true" />Eliminar</Button>
                </div>
              </Card>
            )
          })}
        </section>
      )}

      {formJornada !== undefined && <JornadaFormModal key={formJornada?.id || 'new'} jornada={formJornada} isSaving={isSaving} onClose={() => setFormJornada(undefined)} onSave={handleSave} />}
      {confirmation && <ConfirmDialog action={confirmation.action} jornada={confirmation.jornada} isLoading={isChangingState} onCancel={() => setConfirmation(null)} onConfirm={handleConfirmState} />}
      {detailJornada && (
        <Modal title="Detalle de jornada" onClose={() => setDetailJornada(null)}>
          {isLoadingDetail ? <LoadingIndicator label="Consultando jornada..." /> : <div className="space-y-4 text-app-description text-food-dark"><div><p className="font-semibold text-food-charcoal">{detailJornada.nombre}</p><p className="mt-1">{formatDate(detailJornada.fecha)}</p></div><JornadaStatusBadge estado={detailJornada.estado} /><p>Creada por {detailJornada.creado_por}.</p></div>}
        </Modal>
      )}
    </div>
  )
}

export default JornadasPage
