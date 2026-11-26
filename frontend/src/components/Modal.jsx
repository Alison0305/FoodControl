import { X } from 'lucide-react'
import { useEffect, useEffectEvent, useId, useRef } from 'react'

const modalStack = []

function Modal({ title, titleIcon: TitleIcon, titleIconClassName = '', titleClassName = 'text-app-subtitle', children, onClose }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const modalId = useId()
  const close = useEffectEvent(() => onClose())

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

    function handleKeyDown(event) {
      if (modalStack.at(-1) !== modalId) return
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = [...dialogRef.current.querySelectorAll(focusableSelector)]
      if (focusable.length === 0) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    modalStack.push(modalId)
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    const frame = window.requestAnimationFrame(() => dialogRef.current?.querySelector(focusableSelector)?.focus())

    return () => {
      window.cancelAnimationFrame(frame)
      modalStack.splice(modalStack.lastIndexOf(modalId), 1)
      if (modalStack.length === 0) document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [modalId])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button className="absolute inset-0 bg-food-charcoal/45" type="button" onClick={onClose} aria-label="Cerrar ventana" />
      <section className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-food-white p-7 shadow-xl sm:p-9" ref={dialogRef} tabIndex="-1">
        <header className="flex items-center gap-3 pr-14">
          {TitleIcon && <span className={`grid size-10 shrink-0 place-items-center rounded-full ${titleIconClassName}`}><TitleIcon size={22} aria-hidden="true" /></span>}
          <h2 className={`${titleClassName} font-bold text-food-charcoal`} id={titleId}>{title}</h2>
        </header>
        <button
          className="absolute top-6 right-6 grid size-12 place-items-center rounded-xl text-food-dark outline-none transition hover:bg-food-sage-light focus-visible:ring-4 focus-visible:ring-food-sage sm:top-8 sm:right-8"
          type="button"
          onClick={onClose}
          aria-label="Cerrar ventana"
        >
          <X size={26} strokeWidth={2.5} aria-hidden="true" />
        </button>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  )
}

export default Modal
