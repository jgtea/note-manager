import type { Note } from '../types/database'

/**
 * Generate an ICS (iCalendar) file content for a note
 * This can be opened in Outlook, Google Calendar, Apple Calendar, etc.
 */
export function generateICS(note: Note): string {
  if (!note.deadline) {
    throw new Error('Note has no deadline')
  }

  // Parse deadline date
  const deadlineDate = new Date(note.deadline)
  const year = deadlineDate.getFullYear()
  const month = String(deadlineDate.getMonth() + 1).padStart(2, '0')
  const day = String(deadlineDate.getDate()).padStart(2, '0')

  // Format as all-day event date (YYYYMMDD)
  const dateStr = `${year}${month}${day}`

  // Next day for end date (all-day events need exclusive end date)
  const nextDay = new Date(deadlineDate)
  nextDay.setDate(nextDay.getDate() + 1)
  const endYear = nextDay.getFullYear()
  const endMonth = String(nextDay.getMonth() + 1).padStart(2, '0')
  const endDay = String(nextDay.getDate()).padStart(2, '0')
  const endDateStr = `${endYear}${endMonth}${endDay}`

  // Build title with deadline type
  const deadlineTypeLabel = note.deadline_type === 'must' ? '[MUST] ' : note.deadline_type === 'ca' ? '[Ca.] ' : ''
  const title = `${deadlineTypeLabel}${note.customer_name} - ${note.subject}`

  // Build description
  const descriptionLines = [
    `Klant: ${note.customer_name}`,
    `Contactpersoon: ${note.contact_person}`,
    `Onderwerp: ${note.subject}`,
    `Type: ${note.note_type === 'overige' && note.note_type_other ? note.note_type_other : note.note_type}`,
    `Status: ${note.status}`,
  ]

  if (note.remarks) {
    descriptionLines.push('', `Opmerkingen: ${note.remarks}`)
  }

  // Escape special characters for ICS
  const escapeICS = (str: string) => {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
  }

  // Generate unique ID
  const uid = `${note.id}@note-manager`

  // Current timestamp for DTSTAMP
  const now = new Date()
  const timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  // Build ICS content
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Note Manager//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${timestamp}`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${endDateStr}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(descriptionLines.join('\\n'))}`,
    note.deadline_type === 'must' ? 'PRIORITY:1' : 'PRIORITY:5',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return icsContent
}

/**
 * Download an ICS file for a note
 */
export function downloadICS(note: Note): void {
  const icsContent = generateICS(note)

  // Create blob and download
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  // Create temporary link and trigger download
  const link = document.createElement('a')
  link.href = url
  link.download = `${note.customer_name.replace(/[^a-zA-Z0-9]/g, '_')}_${note.subject.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}.ics`
  document.body.appendChild(link)
  link.click()

  // Cleanup
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
