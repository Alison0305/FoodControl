export function Button({ children, className = '', variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-food-dark text-food-white hover:bg-food-charcoal focus:ring-food-sage-light',
    secondary: 'border border-food-sage bg-food-white text-food-charcoal hover:bg-food-beige focus:ring-food-sage-light',
    ghost: 'text-food-dark hover:bg-food-sage-light/60 hover:text-food-charcoal focus:ring-food-sage-light',
    sidebar: 'text-food-white hover:bg-food-white/10 hover:text-food-white focus:ring-food-sage',
    danger: 'bg-status-cancelled text-food-white hover:bg-red-800 focus:ring-red-100',
  }

  return (
    <button
      className={`inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-app-base font-semibold transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '' }) {
  return <section className={`rounded-2xl border border-food-sage-light bg-food-white p-7 shadow-sm sm:p-8 ${className}`}>{children}</section>
}

export function PageHeader({ title, description, children }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-app-title font-bold tracking-tight text-food-charcoal">{title}</h1>
        <p className="mt-3 max-w-2xl text-app-subtitle leading-8 text-food-dark">{description}</p>
      </div>
      {children}
    </header>
  )
}

export function StatusBadge({ children = 'Disponible pronto', tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-food-sage-light text-food-charcoal',
    waiting: 'bg-yellow-100 text-status-waiting',
    preparing: 'bg-blue-100 text-status-preparing',
    delivered: 'bg-green-100 text-status-delivered',
    cancelled: 'bg-red-100 text-status-cancelled',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-app-status font-bold ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <Card className="flex min-h-56 flex-col items-center justify-center text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-food-sage-light text-food-dark">
        <Icon size={23} aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-app-subtitle font-bold text-food-charcoal">{title}</h2>
      <p className="mt-3 max-w-md text-app-description leading-7 text-food-dark">{description}</p>
    </Card>
  )
}

export function LoadingIndicator({ label = 'Cargando...' }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 text-app-body font-medium text-food-dark" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-food-sage-light border-t-food-dark" aria-hidden="true" />
      {label}
    </div>
  )
}

export function ErrorMessage({ children }) {
  if (!children) {
    return null
  }

  return <p className="rounded-xl bg-red-50 px-4 py-3.5 text-app-description font-medium text-status-cancelled" role="alert">{children}</p>
}

export function FormField({ label, id, endAdornment, ...props }) {
  return (
    <label className="block text-app-label font-semibold text-food-charcoal" htmlFor={id}>
      {label}
      <span className="relative mt-2 block">
        <input
          className={`min-h-[52px] w-full rounded-xl border border-food-sage bg-food-white px-4 py-3.5 text-app-label text-food-charcoal outline-none transition focus:border-food-dark focus:ring-4 focus:ring-food-sage-light ${endAdornment ? 'pr-14' : ''}`}
          id={id}
          {...props}
        />
        {endAdornment}
      </span>
    </label>
  )
}
