import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { Note } from '../types/database'
import { downloadICS } from '../lib/icsGenerator'

interface StickyNoteProps {
  note: Note
  onBringToFront: () => void
  onToggleReplied: () => void
  onCycleStatus: () => void
  onCycleType: () => void
  onUpdateField: (field: string, value: string) => void
  onToggleCompleet: () => void
  onDelete: () => void
  onOpenDetail: () => void
}

const statusColors = {
  nieuw: 'bg-blue-500',
  in_behandeling: 'bg-amber-500',
  afgerond: 'bg-green-500',
  archief: 'bg-gray-500',
}

const statusLabels = {
  nieuw: 'Nieuw',
  in_behandeling: 'In behandeling',
  afgerond: 'Afgerond',
  archief: 'Archief',
}

const typeLabels = {
  offerte: 'Offerte',
  onderzoek: 'Onderzoek',
  overige: 'Overige',
}

export function StickyNote({ note, onBringToFront, onToggleReplied, onCycleStatus, onCycleType, onUpdateField, onToggleCompleet, onDelete, onOpenDetail }: StickyNoteProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: note.id,
    data: note,
  })

  const style = {
    left: note.position_x,
    top: note.position_y,
    zIndex: isDragging ? 9999 : note.z_index,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleCompleetClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onToggleCompleet()
  }

  const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onUpdateField('deadline', e.target.value)
  }

  const handleCalendarClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (note.deadline) {
      downloadICS(note)
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Only open detail if not clicking on an editable field or button
    if ((e.target as HTMLElement).closest('input, textarea, button, [data-clickable]')) {
      return
    }
    e.stopPropagation()
    e.preventDefault()
    onOpenDetail()
  }

  const handleReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onToggleReplied()
  }

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onCycleStatus()
  }

  const handleTypeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onCycleType()
  }

  const handleFieldDoubleClick = (e: React.MouseEvent, field: string, value: string) => {
    e.stopPropagation()
    e.preventDefault()
    setEditingField(field)
    setEditValue(value)
  }

  const handleFieldBlur = () => {
    if (editingField && editValue !== '') {
      onUpdateField(editingField, editValue)
    }
    setEditingField(null)
    setEditValue('')
  }

  const handleFieldKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleFieldBlur()
    }
    if (e.key === 'Escape') {
      setEditingField(null)
      setEditValue('')
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (window.confirm('Weet je zeker dat je deze notitie wilt verwijderen?')) {
      onDelete()
    }
  }

  // Combine onBringToFront with dnd-kit listeners
  const handleMouseDown = (e: React.MouseEvent) => {
    onBringToFront()
    if (listeners?.onMouseDown) {
      listeners.onMouseDown(e as unknown as MouseEvent)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`absolute w-[380px] cursor-grab select-none ${isDragging ? 'opacity-90 scale-105' : ''} transition-all`}
      {...listeners}
      {...attributes}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Post-it note container */}
      <div className="relative">
        {/* Tape effect on top */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-yellow-200/60 rounded-sm rotate-0 z-10" />

        {/* Main post-it body */}
        <div
          className="bg-gradient-to-b from-yellow-300 via-yellow-200 to-yellow-100 pt-5 pb-4 px-5 relative"
          style={{
            boxShadow: isDragging
              ? '8px 8px 20px rgba(0,0,0,0.3)'
              : '3px 3px 10px rgba(0,0,0,0.15), 1px 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          {/* Folded corner with delete button */}
          <div
            className="absolute bottom-0 right-0 w-0 h-0"
            style={{
              borderStyle: 'solid',
              borderWidth: '0 0 40px 40px',
              borderColor: 'transparent transparent #d4a000 transparent',
            }}
          />
          <div
            onClick={handleDeleteClick}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute bottom-0 right-0 w-[38px] h-[38px] cursor-pointer group"
            title="Verwijderen"
          >
            <div
              className="absolute bottom-0 right-0 w-0 h-0"
              style={{
                borderStyle: 'solid',
                borderWidth: '0 0 38px 38px',
                borderColor: 'transparent transparent #fef3c7 transparent',
              }}
            />
            <svg
              className="absolute bottom-0.5 right-0.5 w-4 h-4 text-red-500 group-hover:text-red-700 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>

          {/* Top row: All badges + date */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div
              onClick={handleReplyClick}
              onMouseDown={(e) => e.stopPropagation()}
              className={`text-xs px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
                note.replied
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
              }`}
              title={note.replied ? 'Beantwoord' : 'Nog niet beantwoord'}
            >
              Reply
            </div>
            <div
              onClick={handleTypeClick}
              onMouseDown={(e) => e.stopPropagation()}
              className="text-xs bg-amber-400/50 text-gray-800 px-2 py-0.5 rounded font-medium cursor-pointer hover:bg-amber-400/70 transition-all"
              title="Klik om type te wijzigen"
            >
              {note.note_type === 'overige' && note.note_type_other
                ? note.note_type_other
                : typeLabels[note.note_type]}
            </div>
            <div
              onClick={handleStatusClick}
              onMouseDown={(e) => e.stopPropagation()}
              data-clickable
              className={`${statusColors[note.status]} text-white text-xs px-2 py-0.5 rounded font-medium cursor-pointer transition-all hover:opacity-80`}
              title="Klik om status te wijzigen"
            >
              {statusLabels[note.status]}
            </div>
            <div
              onClick={handleCompleetClick}
              onMouseDown={(e) => e.stopPropagation()}
              data-clickable
              className={`text-xs px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
                note.compleet
                  ? 'bg-purple-500 text-white hover:bg-purple-600'
                  : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
              }`}
              title={note.compleet ? 'Compleet' : 'Niet compleet'}
            >
              {note.compleet ? '✓ Compleet' : 'Compleet'}
            </div>
          </div>

          {/* Date row */}
          <div className="text-xs text-gray-600 mb-2">
            {formatDateTime(note.email_received_at || note.created_at)}
          </div>

          {/* Deadline row */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-gray-700">Deadline:</span>
            <select
              value={note.deadline_type || ''}
              onChange={(e) => onUpdateField('deadline_type', e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              className={`text-xs px-1 py-0.5 rounded border cursor-pointer font-bold ${
                note.deadline_type === 'must'
                  ? 'bg-red-100 border-red-400 text-red-700'
                  : note.deadline_type === 'ca'
                    ? 'bg-sky-100 border-sky-400 text-sky-700'
                    : 'bg-white/70 border-amber-300 text-gray-600'
              }`}
            >
              <option value="">-</option>
              <option value="must">Must</option>
              <option value="ca">Ca.</option>
            </select>
            <input
              type="date"
              value={note.deadline ? note.deadline.split('T')[0] : ''}
              onChange={handleDeadlineChange}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              className={`text-xs px-2 py-1 rounded border cursor-pointer font-bold ${
                note.deadline_type === 'must'
                  ? 'bg-red-100 border-red-400 text-red-700'
                  : note.deadline_type === 'ca'
                    ? 'bg-sky-100 border-sky-400 text-sky-700'
                    : 'bg-white/70 border-amber-300'
              }`}
            />
            {note.deadline && (
              <button
                onClick={handleCalendarClick}
                onMouseDown={(e) => e.stopPropagation()}
                className="p-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition"
                title="Toevoegen aan agenda (Outlook/Google)"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            )}
          </div>

          {/* Customer info */}
          <div className="mb-2">
            {editingField === 'customer_name' ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleFieldBlur}
                onKeyDown={handleFieldKeyDown}
                autoFocus
                className="font-bold text-gray-900 text-lg w-full bg-white/70 rounded px-1 outline-none ring-2 ring-amber-500"
              />
            ) : (
              <p
                className="font-bold text-gray-900 text-lg truncate cursor-text"
                onDoubleClick={(e) => handleFieldDoubleClick(e, 'customer_name', note.customer_name)}
              >
                {note.customer_name}
              </p>
            )}
            {editingField === 'contact_person' ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleFieldBlur}
                onKeyDown={handleFieldKeyDown}
                autoFocus
                className="text-sm text-gray-700 w-full bg-white/70 rounded px-1 outline-none ring-2 ring-amber-500"
              />
            ) : (
              <p
                className="text-sm text-gray-700 truncate cursor-text"
                onDoubleClick={(e) => handleFieldDoubleClick(e, 'contact_person', note.contact_person)}
              >
                {note.contact_person}
              </p>
            )}
          </div>

          {/* Subject */}
          <div className="mb-3 flex items-start gap-2">
            {editingField === 'subject' ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleFieldBlur}
                onKeyDown={handleFieldKeyDown}
                autoFocus
                className="text-base text-gray-800 font-medium w-full bg-white/70 rounded px-1 outline-none ring-2 ring-amber-500"
              />
            ) : (
              <p
                className="text-base text-gray-800 font-medium line-clamp-2 flex-1 cursor-text"
                onDoubleClick={(e) => handleFieldDoubleClick(e, 'subject', note.subject)}
              >
                {note.subject}
              </p>
            )}
            {note.email_content && (
              <svg className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            )}
          </div>

          {/* Divider line */}
          <div className="border-t border-amber-300/50 mb-3" />

          {/* Remarks */}
          {editingField === 'remarks' ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleFieldBlur}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditingField(null)
                  setEditValue('')
                }
              }}
              autoFocus
              rows={3}
              className="text-base text-gray-800 w-full bg-white/70 rounded px-2 py-1 outline-none ring-2 ring-amber-500 resize-none"
              placeholder="Typ opmerking..."
            />
          ) : (
            <p
              className="cursor-text text-base line-clamp-1 min-h-[1.5rem]"
              onClick={(e) => handleFieldDoubleClick(e, 'remarks', note.remarks || '')}
            >
              {note.remarks ? (
                <span className="text-gray-700">{note.remarks}</span>
              ) : (
                <span className="text-gray-500 italic">Opmerkingen</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
