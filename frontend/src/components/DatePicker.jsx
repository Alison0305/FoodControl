import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { es } from 'react-day-picker/locale'

function parseIsoDate(value) {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayInBolivia() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return new Date(Number(values.year), Number(values.month) - 1, Number(values.day))
}

function formatDisplayDate(value) {
  const date = parseIsoDate(value)
  if (!date) return 'Seleccionar fecha'
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function DatePicker({ id, label, value, onChange, required = false }) {
  const selectedDate = parseIsoDate(value)
  const boliviaToday = todayInBolivia()
  const [month, setMonth] = useState(selectedDate || boliviaToday)
  const [isOpen, setIsOpen] = useState(false)
  const years = Array.from({ length: 16 }, (_, index) => 2020 + index)
  const months = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat('es-BO', { month: 'long' }).format(new Date(2024, index, 1)))

  function selectDate(date) {
    if (!date) return
    onChange(formatIsoDate(date))
    setMonth(date)
    setIsOpen(false)
  }

  function selectToday() {
    onChange(formatIsoDate(boliviaToday))
    setMonth(boliviaToday)
    setIsOpen(false)
  }

  function changeMonth(monthIndex, year = month.getFullYear()) {
    setMonth(new Date(year, monthIndex, 1))
  }

  function changeYear(year) {
    changeMonth(month.getMonth(), Number(year))
  }

  function previousMonth() {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1)
    if (nextMonth >= new Date(2020, 0, 1)) setMonth(nextMonth)
  }

  function nextMonth() {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1)
    if (nextMonth <= new Date(2035, 11, 1)) setMonth(nextMonth)
  }

  return (
    <div className="w-full max-w-[380px]">
      <span className="block text-app-label font-semibold text-food-charcoal" id={`${id}-label`}>
        {label}{required && <span aria-hidden="true"> *</span>}
      </span>
      <button
        aria-controls={`${id}-calendar`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-labelledby={`${id}-label`}
        className="mt-2 flex min-h-[52px] w-full items-center justify-between rounded-xl border border-food-sage bg-food-white px-4 text-app-label text-food-charcoal outline-none transition focus:border-food-dark focus:ring-4 focus:ring-food-sage-light"
        id={id}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        {formatDisplayDate(value)}
        <CalendarDays size={22} className="text-food-dark" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className="mt-3 w-full max-w-[380px] rounded-2xl border border-food-sage-light bg-food-beige p-4 shadow-sm"
          id={`${id}-calendar`}
          role="dialog"
          aria-label="Calendario de fecha de venta"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation()
              setIsOpen(false)
            }
          }}
        >
          <div className="mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <button className="grid size-11 place-items-center rounded-xl text-food-dark hover:bg-food-sage-light focus:outline-none focus:ring-2 focus:ring-food-sage disabled:opacity-40" type="button" onClick={previousMonth} disabled={month.getFullYear() === 2020 && month.getMonth() === 0} aria-label="Mes anterior">
              <ChevronLeft size={24} aria-hidden="true" />
            </button>
            <div className="grid grid-cols-2 gap-2">
              <select className="min-h-11 rounded-xl border border-food-sage bg-food-white px-2 text-app-description text-food-charcoal outline-none focus:ring-2 focus:ring-food-sage" value={month.getMonth()} onChange={(event) => changeMonth(Number(event.target.value))} aria-label="Seleccionar mes">
                {months.map((monthName, index) => <option key={monthName} value={index}>{monthName}</option>)}
              </select>
              <select className="min-h-11 rounded-xl border border-food-sage bg-food-white px-2 text-app-description text-food-charcoal outline-none focus:ring-2 focus:ring-food-sage" value={month.getFullYear()} onChange={(event) => changeYear(event.target.value)} aria-label="Seleccionar año">
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
            <button className="grid size-11 place-items-center rounded-xl text-food-dark hover:bg-food-sage-light focus:outline-none focus:ring-2 focus:ring-food-sage disabled:opacity-40" type="button" onClick={nextMonth} disabled={month.getFullYear() === 2035 && month.getMonth() === 11} aria-label="Mes siguiente">
              <ChevronRight size={24} aria-hidden="true" />
            </button>
          </div>
          <DayPicker
            hideNavigation
            className="fc-calendar"
            classNames={{
              root: 'w-full text-app-description',
              months: 'w-full',
              month: 'w-full',
              month_caption: 'sr-only',
              month_grid: 'w-full border-collapse',
              weekdays: 'text-app-status text-food-dark',
              weekday: 'h-10 text-center font-bold',
              week: 'h-11',
              day: 'p-0 text-center',
              day_button: 'mx-auto grid size-11 place-items-center rounded-xl text-[18px] font-medium text-food-charcoal hover:bg-food-sage-light focus:outline-none focus:ring-2 focus:ring-food-dark',
              selected: '[&>button]:bg-food-dark [&>button]:text-food-white hover:[&>button]:bg-food-charcoal',
              today: '[&>button]:border-2 [&>button]:border-food-sage [&>button]:font-bold',
              outside: 'opacity-45',
            }}
            endMonth={new Date(2035, 11)}
            locale={es}
            mode="single"
            month={month}
            onMonthChange={setMonth}
            onSelect={selectDate}
            selected={selectedDate}
            showOutsideDays
            startMonth={new Date(2020, 0)}
            today={boliviaToday}
            weekStartsOn={1}
          />
          <button className="mt-3 min-h-11 rounded-xl px-3 text-app-description font-semibold text-food-dark hover:bg-food-sage-light focus:outline-none focus:ring-2 focus:ring-food-sage" type="button" onClick={selectToday}>Hoy</button>
        </div>
      )}
    </div>
  )
}

export default DatePicker
