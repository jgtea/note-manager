import { useState, useMemo } from 'react'
import type { Note } from '../types/database'

interface CalendarProps {
  notes: Note[]
  onDateSelect: (date: string) => void
  selectedDate: string | null
  onClose: () => void
}

export function Calendar({ notes, onDateSelect, selectedDate, onClose }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // Get notes grouped by deadline date
  const notesByDate = useMemo(() => {
    const map = new Map<string, Note[]>()
    notes.forEach(note => {
      if (note.deadline) {
        const dateKey = note.deadline.split('T')[0]
        const existing = map.get(dateKey) || []
        existing.push(note)
        map.set(dateKey, existing)
      }
    })
    return map
  }, [notes])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Monday = 0
    const daysInMonth = lastDay.getDate()

    const days: (number | null)[] = []

    // Add empty cells for days before the first day of month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }, [year, month])

  const monthNames = [
    'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
    'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
  ]

  const dayNames = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

  const getDateKey = (day: number) => {
    // Format as YYYY-MM-DD without timezone conversion
    const y = year
    const m = String(month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const getDateInfo = (day: number) => {
    const dateKey = getDateKey(day)
    const notesOnDate = notesByDate.get(dateKey) || []
    const hasMust = notesOnDate.some(n => n.deadline_type === 'must')
    const hasCa = notesOnDate.some(n => n.deadline_type === 'ca')
    const hasOther = notesOnDate.some(n => !n.deadline_type)
    return { notesOnDate, hasMust, hasCa, hasOther, count: notesOnDate.length }
  }

  const isToday = (day: number) => {
    const today = new Date()
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const handleDateClick = (day: number) => {
    const dateKey = getDateKey(day)
    onDateSelect(dateKey)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md">
      {/* Header with month navigation and close button */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-800">
          {monthNames[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-500 hover:text-gray-700"
            title="Sluiten"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="h-10" />
          }

          const dateKey = getDateKey(day)
          const { hasMust, hasCa, hasOther, count } = getDateInfo(day)
          const isSelected = selectedDate === dateKey
          const today = isToday(day)

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              onDoubleClick={() => handleDateClick(day)}
              className={`
                h-10 rounded-lg relative flex items-center justify-center text-sm font-medium transition
                ${isSelected ? 'ring-2 ring-yellow-400' : ''}
                ${today ? 'bg-yellow-100' : ''}
                ${count > 0 ? 'cursor-pointer hover:opacity-80' : 'hover:bg-gray-50'}
                ${hasMust ? 'bg-red-500 text-white' : hasCa ? 'bg-sky-500 text-white' : hasOther ? 'bg-gray-400 text-white' : 'text-gray-700'}
              `}
            >
              {day}
              {count > 1 && (
                <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-800 text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Must</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-sky-500" />
          <span>Ca.</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-400" />
          <span>Geen type</span>
        </div>
      </div>
    </div>
  )
}
