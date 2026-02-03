import { useState, useCallback, useEffect, useRef } from 'react'
import { DndContext, type DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { StickyNote } from './StickyNote'
import { CreateNoteForm } from './CreateNoteForm'
import { NoteDetailModal } from './NoteDetailModal'
import { Calendar } from './Calendar'
import { DeadlineCounters } from './DeadlineCounters'
import { WeekOverview } from './WeekOverview'
import { useNotes, type CreateNoteData } from '../hooks/useNotes'
import { useProfiles } from '../hooks/useProfiles'
import { parseEmailFile, type ParsedEmail } from '../lib/emailParser'
import type { Note, NoteStatus } from '../types/database'

interface BoardProps {
  onSignOut: () => void
}

export function Board({ onSignOut }: BoardProps) {
  const { profiles, currentProfile, isSupervisor } = useProfiles()
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const { notes, loading, createNote, updateNote, updatePosition, bringToFront, updateStatus, toggleReplied, deleteNote } = useNotes(viewingUserId)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [emailData, setEmailData] = useState<ParsedEmail | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [statusFilter, setStatusFilter] = useState<NoteStatus | 'all'>('all')
  const [letterFilter, setLetterFilter] = useState<string | 'all'>('all')
  const [companyFilter, setCompanyFilter] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [dateFilter, setDateFilter] = useState<string | null>(null)
  const [showWeekOverview, setShowWeekOverview] = useState(false)

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const SPECIAL_BUTTONS: Record<string, string[]> = {
    'P': ['PPG'],
    'V': ['Valk'],
  }

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  )

  const NOTE_WIDTH = 380 // w-[380px] from StickyNote
  const NOTE_HEIGHT = 280 // actual note height including all content
  const GRID_GAP = 15 // gap between notes in overview

  const filteredNotes = notes
    .filter(n => statusFilter === 'all' || n.status === statusFilter)
    .filter(n => {
      if (companyFilter) {
        return n.customer_name.toLowerCase().includes(companyFilter.toLowerCase())
      }
      if (letterFilter === 'all') return true
      return n.customer_name.toUpperCase().startsWith(letterFilter)
    })
    .filter(n => {
      if (!dateFilter) return true
      return n.deadline?.split('T')[0] === dateFilter
    })
    .sort((a, b) => a.customer_name.localeCompare(b.customer_name, 'nl'))

  // Get letters that have notes
  const lettersWithNotes = new Set(
    notes.map(n => n.customer_name.charAt(0).toUpperCase())
  )

  const handleOverview = useCallback(async () => {
    const notesToArrange = filteredNotes
    if (notesToArrange.length === 0) return

    // Calculate how many notes fit per row based on window width
    const boardWidth = window.innerWidth - 40 // account for padding
    const notesPerRow = Math.max(1, Math.floor(boardWidth / (NOTE_WIDTH + GRID_GAP)))

    // Position each note in a grid
    const updates = notesToArrange.map((note, index) => {
      const row = Math.floor(index / notesPerRow)
      const col = index % notesPerRow
      const newX = col * (NOTE_WIDTH + GRID_GAP) + 20
      const newY = row * (NOTE_HEIGHT + GRID_GAP) + 20
      return updatePosition(note.id, newX, newY)
    })

    await Promise.all(updates)
  }, [filteredNotes, updatePosition])

  // Track previous filters to auto-arrange when filter changes
  const prevFiltersRef = useRef({ statusFilter, letterFilter, companyFilter, dateFilter })

  useEffect(() => {
    const prev = prevFiltersRef.current
    const filterChanged =
      prev.statusFilter !== statusFilter ||
      prev.letterFilter !== letterFilter ||
      prev.companyFilter !== companyFilter ||
      prev.dateFilter !== dateFilter

    if (filterChanged && filteredNotes.length > 0) {
      handleOverview()
    }
    prevFiltersRef.current = { statusFilter, letterFilter, companyFilter, dateFilter }
  }, [statusFilter, letterFilter, companyFilter, dateFilter, filteredNotes.length, handleOverview])

  // Auto-arrange on initial load
  const initialArrangeRef = useRef(false)
  useEffect(() => {
    if (!initialArrangeRef.current && !loading && notes.length > 0) {
      initialArrangeRef.current = true
      handleOverview()
    }
  }, [loading, notes.length, handleOverview])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, delta } = event
    const note = notes.find(n => n.id === active.id)
    if (note) {
      // Snap to grid
      const GRID_SIZE_X = NOTE_WIDTH + GRID_GAP
      const GRID_SIZE_Y = NOTE_HEIGHT + GRID_GAP

      let rawX = note.position_x + delta.x
      let rawY = note.position_y + delta.y

      // Snap to nearest grid position
      let newX = Math.max(0, Math.round(rawX / GRID_SIZE_X) * GRID_SIZE_X + 20)
      let newY = Math.max(0, Math.round(rawY / GRID_SIZE_Y) * GRID_SIZE_Y + 20)

      // Check if position is occupied by another note
      const otherNotes = notes.filter(n => n.id !== note.id)
      let positionOccupied = true
      let attempts = 0
      const maxAttempts = 50

      while (positionOccupied && attempts < maxAttempts) {
        positionOccupied = otherNotes.some(other =>
          Math.abs(other.position_x - newX) < GRID_SIZE_X - 10 &&
          Math.abs(other.position_y - newY) < GRID_SIZE_Y - 10
        )

        if (positionOccupied) {
          // Try next position to the right, then next row
          newX += GRID_SIZE_X
          const boardWidth = window.innerWidth - 40
          if (newX > boardWidth - NOTE_WIDTH) {
            newX = 20
            newY += GRID_SIZE_Y
          }
        }
        attempts++
      }

      await updatePosition(note.id, newX, newY)
    }
  }, [notes, updatePosition])

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)

    const files = Array.from(e.dataTransfer.files)
    const emailFile = files.find(f => f.name.endsWith('.eml') || f.name.endsWith('.msg'))

    if (emailFile) {
      try {
        const parsed = await parseEmailFile(emailFile)
        setEmailData(parsed)
        setShowCreateForm(true)
      } catch (error) {
        alert('Kon email niet lezen: ' + (error as Error).message)
      }
    }
  }, [])

  const handleCreateNote = async (data: CreateNoteData) => {
    await createNote(data)
    setShowCreateForm(false)
    setEmailData(null)
    // Small delay to ensure the note is in the list, then rearrange all notes
    setTimeout(() => {
      handleOverview()
    }, 100)
  }

  const handleUpdateStatus = async (status: NoteStatus) => {
    if (selectedNote) {
      await updateStatus(selectedNote.id, status)
      setSelectedNote(prev => prev ? { ...prev, status } : null)
    }
  }

  const handleUpdateRemarks = async (remarks: string) => {
    if (selectedNote) {
      await updateNote(selectedNote.id, { remarks })
      setSelectedNote(prev => prev ? { ...prev, remarks } : null)
    }
  }

  const handleUpdateDeadline = async (deadline: string | null) => {
    if (selectedNote) {
      await updateNote(selectedNote.id, { deadline })
      setSelectedNote(prev => prev ? { ...prev, deadline } : null)
    }
  }

  const handleUpdateDeadlineType = async (deadline_type: 'must' | 'ca' | null) => {
    if (selectedNote) {
      await updateNote(selectedNote.id, { deadline_type })
      setSelectedNote(prev => prev ? { ...prev, deadline_type } : null)
    }
  }

  const handleToggleSelectedCompleet = async () => {
    if (selectedNote) {
      await updateNote(selectedNote.id, { compleet: !selectedNote.compleet })
      setSelectedNote(prev => prev ? { ...prev, compleet: !prev.compleet } : null)
    }
  }

  const handleDelete = async () => {
    if (selectedNote) {
      await deleteNote(selectedNote.id)
      setSelectedNote(null)
    }
  }

  const handleToggleReplied = async (noteId: string, currentReplied: boolean) => {
    await toggleReplied(noteId, !currentReplied)
  }

  const handleToggleCompleet = async (noteId: string, currentCompleet: boolean) => {
    await updateNote(noteId, { compleet: !currentCompleet })
  }

  const handleCycleStatus = async (noteId: string, currentStatus: NoteStatus) => {
    const statusOrder: NoteStatus[] = ['nieuw', 'in_behandeling', 'afgerond', 'archief']
    const currentIndex = statusOrder.indexOf(currentStatus)
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]
    await updateStatus(noteId, nextStatus)
  }

  const handleCycleType = async (noteId: string, currentType: Note['note_type']) => {
    const typeOrder: Note['note_type'][] = ['offerte', 'onderzoek', 'overige']
    const currentIndex = typeOrder.indexOf(currentType)
    const nextType = typeOrder[(currentIndex + 1) % typeOrder.length]
    await updateNote(noteId, { note_type: nextType })
  }

  const handleUpdateField = async (noteId: string, field: string, value: string) => {
    await updateNote(noteId, { [field]: value })
  }

  const noteCounts = {
    all: notes.length,
    nieuw: notes.filter(n => n.status === 'nieuw').length,
    in_behandeling: notes.filter(n => n.status === 'in_behandeling').length,
    afgerond: notes.filter(n => n.status === 'afgerond').length,
    archief: notes.filter(n => n.status === 'archief').length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Laden...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        {/* Top row - title and main controls */}
        <div className="px-2 sm:px-6 py-2 sm:py-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800">Note Manager</h1>
            {/* User selector for supervisors, or just show name for regular users */}
            {isSupervisor ? (
              <select
                value={viewingUserId || ''}
                onChange={(e) => setViewingUserId(e.target.value || null)}
                className="text-sm bg-purple-100 text-purple-800 border border-purple-300 rounded-lg px-2 py-1 font-medium"
              >
                <option value="">Alle gebruikers</option>
                {profiles.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.display_name} {profile.role === 'supervisor' ? '(S)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <span className="hidden sm:inline text-gray-600 font-medium">
                {currentProfile?.display_name || 'Gebruiker'}
              </span>
            )}
            <button
              onClick={() => {
                if (showCalendar) {
                  setShowCalendar(false)
                  setDateFilter(null)
                } else {
                  setShowCalendar(true)
                }
              }}
              className={`p-1.5 sm:p-2 rounded-lg transition ${
                showCalendar ? 'bg-yellow-400 text-gray-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title="Kalender"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <DeadlineCounters
              notes={notes}
              onWeekOverviewClick={() => setShowWeekOverview(true)}
            />
            {dateFilter && (
              <div className="flex items-center gap-1 sm:gap-2 bg-yellow-100 px-2 sm:px-3 py-1 rounded-lg">
                <span className="text-xs sm:text-sm font-medium text-gray-700">
                  {new Date(dateFilter).toLocaleDateString('nl-NL')}
                </span>
                <button
                  onClick={() => setDateFilter(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Only show create button when viewing own notes or when not filtering by user */}
            {(!viewingUserId || viewingUserId === currentProfile?.id) && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-semibold px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition flex items-center gap-1 sm:gap-2"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Nieuwe notitie</span>
                <span className="sm:hidden text-xs">Nieuw</span>
              </button>
            )}

            <button
              onClick={onSignOut}
              className="text-gray-600 hover:text-gray-800 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition text-sm"
            >
              <span className="hidden sm:inline">Uitloggen</span>
              <svg className="sm:hidden w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter buttons - scrollable on mobile */}
        <div className="px-2 sm:px-6 py-2 border-t border-gray-100 overflow-x-auto">
          <div className="flex gap-1 sm:gap-2 min-w-max">
            <button
              onClick={() => { setStatusFilter('all'); setLetterFilter('all'); setCompanyFilter(null); }}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Alle ({noteCounts.all})
            </button>
            <button
              onClick={() => { setStatusFilter('nieuw'); setLetterFilter('all'); setCompanyFilter(null); }}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                statusFilter === 'nieuw'
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              Nieuw ({noteCounts.nieuw})
            </button>
            <button
              onClick={() => { setStatusFilter('in_behandeling'); setLetterFilter('all'); setCompanyFilter(null); }}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                statusFilter === 'in_behandeling'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
            >
              <span className="hidden sm:inline">In behandeling</span>
              <span className="sm:hidden">Behandeling</span>
              ({noteCounts.in_behandeling})
            </button>
            <button
              onClick={() => { setStatusFilter('afgerond'); setLetterFilter('all'); setCompanyFilter(null); }}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                statusFilter === 'afgerond'
                  ? 'bg-green-500 text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              Afgerond ({noteCounts.afgerond})
            </button>
            <button
              onClick={() => { setStatusFilter('archief'); setLetterFilter('all'); setCompanyFilter(null); }}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                statusFilter === 'archief'
                  ? 'bg-gray-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Archief ({noteCounts.archief})
            </button>
          </div>
        </div>

        {/* Alphabet bar */}
        <div className="px-2 sm:px-6 py-1.5 sm:py-2 bg-gray-50 border-t border-gray-200 flex items-center gap-0.5 sm:gap-1 overflow-x-auto">
          <button
            onClick={() => { setLetterFilter('all'); setCompanyFilter(null); }}
            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded transition flex-shrink-0 ${
              letterFilter === 'all' && !companyFilter
                ? 'bg-yellow-400 text-gray-800'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            Alle
          </button>
          {ALPHABET.map(letter => (
            <span key={letter} className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              <button
                onClick={() => { setLetterFilter(letter); setCompanyFilter(null); }}
                disabled={!lettersWithNotes.has(letter)}
                className={`w-6 h-6 sm:w-8 sm:h-8 text-xs sm:text-sm font-bold rounded transition ${
                  letterFilter === letter && !companyFilter
                    ? 'bg-yellow-400 text-gray-800'
                    : lettersWithNotes.has(letter)
                      ? 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}
              >
                {letter}
              </button>
              {SPECIAL_BUTTONS[letter]?.map(company => (
                <button
                  key={company}
                  onClick={() => { setCompanyFilter(company); setLetterFilter('all'); }}
                  className={`px-1.5 sm:px-2 h-6 sm:h-8 text-[10px] sm:text-xs font-bold rounded transition ${
                    companyFilter === company
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
                  }`}
                >
                  {company}
                </button>
              ))}
            </span>
          ))}
        </div>
      </header>

      {/* Calendar panel */}
      {showCalendar && (
        <div className="absolute left-2 sm:left-4 top-32 sm:top-36 z-40">
          <Calendar
            notes={notes}
            onDateSelect={(date) => {
              setDateFilter(date === dateFilter ? null : date)
            }}
            selectedDate={dateFilter}
            onClose={() => {
              setShowCalendar(false)
              setDateFilter(null)
            }}
          />
        </div>
      )}

      {/* Board area */}
      <div
        className={`relative min-h-[calc(100vh-120px)] sm:min-h-[calc(100vh-80px)] p-2 sm:p-4 ${showCalendar ? 'sm:ml-[420px]' : ''} ${
          isDraggingOver ? 'bg-yellow-50 ring-4 ring-inset ring-yellow-300' : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDraggingOver(true)
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleFileDrop}
      >
        {/* Drop zone hint */}
        {isDraggingOver && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
            <div className="bg-yellow-400 text-gray-800 px-8 py-4 rounded-xl shadow-lg text-lg font-semibold">
              Sleep email hier om notitie te maken
            </div>
          </div>
        )}

        {/* Empty state */}
        {notes.length === 0 && !isDraggingOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
            <svg className="w-24 h-24 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg mb-2">Nog geen notities</p>
            <p className="text-sm">Klik op "Nieuwe notitie" of sleep een .eml bestand hierheen</p>
          </div>
        )}

        {/* Notes */}
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {filteredNotes.map(note => (
            <StickyNote
              key={note.id}
              note={note}
              onBringToFront={() => bringToFront(note.id)}
              onToggleReplied={() => handleToggleReplied(note.id, note.replied)}
              onCycleStatus={() => handleCycleStatus(note.id, note.status)}
              onCycleType={() => handleCycleType(note.id, note.note_type)}
              onUpdateField={(field, value) => handleUpdateField(note.id, field, value)}
              onToggleCompleet={() => handleToggleCompleet(note.id, note.compleet)}
              onDelete={() => deleteNote(note.id)}
              onOpenDetail={() => setSelectedNote(note)}
            />
          ))}
        </DndContext>
      </div>

      {/* Create form modal */}
      {showCreateForm && (
        <CreateNoteForm
          onSubmit={handleCreateNote}
          onCancel={() => {
            setShowCreateForm(false)
            setEmailData(null)
          }}
          initialEmailData={emailData ? {
            content: emailData.content,
            subject: emailData.subject,
            from: emailData.from,
            receivedAt: emailData.receivedAt,
          } : undefined}
        />
      )}

      {/* Detail modal */}
      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onUpdateStatus={handleUpdateStatus}
          onUpdateRemarks={handleUpdateRemarks}
          onUpdateDeadline={handleUpdateDeadline}
          onUpdateDeadlineType={handleUpdateDeadlineType}
          onToggleCompleet={handleToggleSelectedCompleet}
          onDelete={handleDelete}
        />
      )}

      {/* Week overview modal */}
      {showWeekOverview && (
        <WeekOverview
          notes={notes}
          onClose={() => setShowWeekOverview(false)}
          onNoteClick={(note) => {
            setShowWeekOverview(false)
            setSelectedNote(note)
          }}
        />
      )}
    </div>
  )
}
