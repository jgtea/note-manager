import type { Note } from '../types/database'

interface WeekOverviewProps {
  notes: Note[]
  onClose: () => void
  onNoteClick: (note: Note) => void
}

export function WeekOverview({ notes, onClose, onNoteClick }: WeekOverviewProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Helper to format date as YYYY-MM-DD in local timezone
  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Get next 5 workdays (skip weekends)
  const getWorkdays = () => {
    const workdays: Date[] = []
    const current = new Date(today)

    while (workdays.length < 5) {
      const dayOfWeek = current.getDay()
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workdays.push(new Date(current))
      }
      current.setDate(current.getDate() + 1)
    }

    return workdays
  }

  const workdays = getWorkdays()

  const getDayInfo = (date: Date, index: number) => {
    const isToday = date.toDateString() === today.toDateString()
    return {
      date,
      dateString: formatDateLocal(date),
      dayName: isToday ? 'Vandaag' : date.toLocaleDateString('nl-NL', { weekday: 'long' }),
      dateFormatted: date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
      isToday,
      index,
    }
  }

  const days = workdays.map((date, index) => getDayInfo(date, index))

  const getNotesForDay = (dateString: string) => {
    return notes
      .filter(n => {
        if (!n.deadline) return false
        // Parse deadline and format in LOCAL timezone to handle UTC conversion
        const deadlineDate = new Date(n.deadline)
        const noteDeadline = formatDateLocal(deadlineDate)
        return noteDeadline === dateString
      })
      .sort((a, b) => a.customer_name.localeCompare(b.customer_name, 'nl'))
  }

  const getColumnColor = (index: number, isToday: boolean) => {
    if (isToday) return 'bg-red-50 border-red-200'
    switch (index) {
      case 1: return 'bg-orange-50 border-orange-200'
      case 2: return 'bg-yellow-50 border-yellow-200'
      case 3: return 'bg-green-50 border-green-200'
      case 4: return 'bg-blue-50 border-blue-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const getHeaderColor = (index: number, isToday: boolean) => {
    if (isToday) return 'bg-red-500 text-white'
    switch (index) {
      case 1: return 'bg-orange-500 text-white'
      case 2: return 'bg-yellow-500 text-gray-800'
      case 3: return 'bg-green-500 text-white'
      case 4: return 'bg-blue-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  return (
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white px-3 sm:px-6 py-3 flex items-center gap-2 sm:gap-4 shadow-lg">
          <button
            onClick={onClose}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Terug</span>
          </button>
          <h2 className="text-base sm:text-xl font-bold">Weekoverzicht</h2>
        </div>

        {/* Columns - 5 workdays */}
        <div className="flex-1 overflow-auto p-2 sm:p-6">
          {/* Mobile: horizontal scroll, Desktop: grid */}
          <div className="flex gap-3 sm:gap-4 h-full overflow-x-auto sm:overflow-x-visible pb-4 sm:pb-0 snap-x snap-mandatory sm:snap-none sm:grid sm:grid-cols-5">
            {days.map(day => {
              const dayNotes = getNotesForDay(day.dateString)
              return (
                <div
                  key={day.dateString}
                  className={`flex flex-col rounded-lg border-2 min-w-[200px] sm:min-w-0 flex-shrink-0 sm:flex-shrink snap-start ${getColumnColor(day.index, day.isToday)}`}
                >
                  {/* Day header */}
                  <div className={`px-3 py-2 rounded-t-md ${getHeaderColor(day.index, day.isToday)}`}>
                    <div className="font-bold text-base capitalize">{day.dayName}</div>
                    <div className="text-xs opacity-90">{day.dateFormatted}</div>
                    <div className="text-xs font-medium mt-0.5">{dayNotes.length} notities</div>
                  </div>

                  {/* Notes list */}
                  <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                    {dayNotes.length === 0 ? (
                      <div className="text-center text-gray-400 py-4 text-xs">
                        Geen deadlines
                      </div>
                    ) : (
                      dayNotes.map(note => (
                        <button
                          key={note.id}
                          onClick={() => onNoteClick(note)}
                          className="w-full text-left bg-white rounded shadow-sm border border-gray-200 p-1.5 hover:shadow hover:border-gray-300 transition"
                        >
                          <div className="font-semibold text-gray-800 text-[11px] truncate">
                            {note.customer_name}
                          </div>
                          <div className="text-[10px] text-gray-500 truncate">
                            {note.subject}
                          </div>
                          {note.deadline_type && (
                            <div className="mt-0.5">
                              <span className={`text-[9px] px-1 rounded font-medium ${
                                note.deadline_type === 'must'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {note.deadline_type === 'must' ? 'MUST' : 'Ca.'}
                              </span>
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
