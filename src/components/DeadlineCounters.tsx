import type { Note } from '../types/database'

interface DeadlineCountersProps {
  notes: Note[]
  onWeekOverviewClick: () => void
}

export function DeadlineCounters({ notes, onWeekOverviewClick }: DeadlineCountersProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Helper to format date as YYYY-MM-DD in local timezone
  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getDateString = (daysFromNow: number) => {
    const date = new Date(today)
    date.setDate(date.getDate() + daysFromNow)
    return formatDateLocal(date)
  }

  const countByDays = (daysFromNow: number) => {
    const targetDate = getDateString(daysFromNow)
    return notes.filter(n => {
      if (!n.deadline) return false
      // Parse deadline and format in LOCAL timezone to handle UTC conversion
      const deadlineDate = new Date(n.deadline)
      const noteDeadline = formatDateLocal(deadlineDate)
      return noteDeadline === targetDate
    }).length
  }

  const todayCount = countByDays(0)
  const tomorrowCount = countByDays(1)
  const twoDaysCount = countByDays(2)

  return (
    <div className="flex items-center gap-1 sm:gap-3">
      {/* Static counters - compact on mobile */}
      <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
        <div className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded ${todayCount > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
          <span className="hidden sm:inline">Vandaag:</span>
          <span className="sm:hidden text-[10px]">V</span>
          <span className="font-bold">{todayCount}</span>
        </div>
        <div className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded ${tomorrowCount > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
          <span className="hidden sm:inline">Morgen:</span>
          <span className="sm:hidden text-[10px]">M</span>
          <span className="font-bold">{tomorrowCount}</span>
        </div>
        <div className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded ${twoDaysCount > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
          <span className="hidden sm:inline">+2 dagen:</span>
          <span className="sm:hidden text-[10px]">+2</span>
          <span className="font-bold">{twoDaysCount}</span>
        </div>
      </div>

      {/* Week overview button - icon only on mobile */}
      <button
        onClick={onWeekOverviewClick}
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span className="hidden sm:inline">Weekoverzicht</span>
      </button>
    </div>
  )
}
