import { useState } from 'react'
import type { Note, NoteStatus, DeadlineType } from '../types/database'
import { downloadICS } from '../lib/icsGenerator'

interface NoteDetailModalProps {
  note: Note
  onClose: () => void
  onUpdateStatus: (status: NoteStatus) => Promise<void>
  onUpdateRemarks: (remarks: string) => Promise<void>
  onUpdateDeadline: (deadline: string | null) => Promise<void>
  onUpdateDeadlineType: (deadlineType: DeadlineType | null) => Promise<void>
  onToggleCompleet: () => Promise<void>
  onDelete: () => Promise<void>
}

const statusLabels = {
  nieuw: 'Nieuw',
  in_behandeling: 'In behandeling',
  afgerond: 'Afgerond',
  archief: 'Archief',
}

const typeLabels = {
  offerte: 'Offerte maken',
  onderzoek: 'Onderzoek',
  overige: 'Overige',
}

export function NoteDetailModal({ note, onClose, onUpdateStatus, onUpdateRemarks, onUpdateDeadline, onUpdateDeadlineType, onToggleCompleet, onDelete }: NoteDetailModalProps) {
  const [status, setStatus] = useState<NoteStatus>(note.status)
  const [remarks, setRemarks] = useState(note.remarks || '')
  const [deadline, setDeadline] = useState(note.deadline || '')
  const [deadlineType, setDeadlineType] = useState<DeadlineType | null>(note.deadline_type)
  const [compleet, setCompleet] = useState(note.compleet)
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleStatusChange = async (newStatus: NoteStatus) => {
    setLoading(true)
    setStatus(newStatus)
    await onUpdateStatus(newStatus)
    setLoading(false)
  }

  const handleRemarksBlur = async () => {
    if (remarks !== (note.remarks || '')) {
      setLoading(true)
      await onUpdateRemarks(remarks)
      setLoading(false)
    }
  }

  const handleDeadlineChange = async (newDeadline: string) => {
    setDeadline(newDeadline)
    setLoading(true)
    await onUpdateDeadline(newDeadline || null)
    setLoading(false)
  }

  const handleDeadlineTypeChange = async (newType: string) => {
    const type = newType === '' ? null : newType as DeadlineType
    setDeadlineType(type)
    setLoading(true)
    await onUpdateDeadlineType(type)
    setLoading(false)
  }

  const handleCompleetToggle = async () => {
    setCompleet(!compleet)
    setLoading(true)
    await onToggleCompleet()
    setLoading(false)
  }

  const handleDelete = async () => {
    setLoading(true)
    await onDelete()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-yellow-400 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">{note.subject}</h2>
          <button
            onClick={onClose}
            className="text-gray-700 hover:text-gray-900 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Customer info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm text-gray-500">Klant</label>
              <p className="font-semibold text-gray-800">{note.customer_name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Contactpersoon</label>
              <p className="font-semibold text-gray-800">{note.contact_person}</p>
            </div>
          </div>

          {/* Type */}
          <div className="mb-6">
            <label className="text-sm text-gray-500">Type</label>
            <p className="font-medium text-gray-800">
              {note.note_type === 'overige' && note.note_type_other
                ? note.note_type_other
                : typeLabels[note.note_type]}
            </p>
          </div>

          {/* Status checkboxes */}
          <div className="mb-6">
            <label className="text-sm text-gray-500 block mb-2">Status</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={status === 'nieuw'}
                  onChange={() => handleStatusChange('nieuw')}
                  disabled={loading}
                  className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                />
                <span className={`${status === 'nieuw' ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                  {statusLabels.nieuw}
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={status === 'in_behandeling'}
                  onChange={() => handleStatusChange('in_behandeling')}
                  disabled={loading}
                  className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                />
                <span className={`${status === 'in_behandeling' ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                  {statusLabels.in_behandeling}
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={status === 'afgerond'}
                  onChange={() => handleStatusChange('afgerond')}
                  disabled={loading}
                  className="w-5 h-5 rounded border-gray-300 text-green-500 focus:ring-green-400"
                />
                <span className={`${status === 'afgerond' ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                  {statusLabels.afgerond}
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={status === 'archief'}
                  onChange={() => handleStatusChange('archief')}
                  disabled={loading}
                  className="w-5 h-5 rounded border-gray-300 text-gray-500 focus:ring-gray-400"
                />
                <span className={`${status === 'archief' ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                  {statusLabels.archief}
                </span>
              </label>
            </div>
          </div>

          {/* Deadline and Compleet */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <label className="text-sm text-gray-500 block mb-1">Deadline Type</label>
              <select
                value={deadlineType || ''}
                onChange={(e) => handleDeadlineTypeChange(e.target.value)}
                disabled={loading}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none font-bold ${
                  deadlineType === 'must'
                    ? 'bg-red-50 border-red-400 text-red-700'
                    : deadlineType === 'ca'
                      ? 'bg-sky-50 border-sky-400 text-sky-700'
                      : 'border-gray-300'
                }`}
              >
                <option value="">-</option>
                <option value="must">Must</option>
                <option value="ca">Ca.</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">Deadline</label>
              <input
                type="date"
                value={deadline ? deadline.split('T')[0] : ''}
                onChange={(e) => handleDeadlineChange(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                disabled={loading}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none font-bold cursor-pointer ${
                  deadlineType === 'must'
                    ? 'bg-red-50 border-red-400 text-red-700'
                    : deadlineType === 'ca'
                      ? 'bg-sky-50 border-sky-400 text-sky-700'
                      : 'border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">Agenda</label>
              <button
                onClick={() => note.deadline && downloadICS(note)}
                disabled={!note.deadline}
                className={`w-full px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition ${
                  note.deadline
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title={note.deadline ? 'Download ICS voor Outlook/Google Calendar' : 'Stel eerst een deadline in'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Toevoegen
              </button>
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">Compleet</label>
              <label className="flex items-center gap-3 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={compleet}
                  onChange={handleCompleetToggle}
                  disabled={loading}
                  className="w-5 h-5 rounded border-gray-300 text-purple-500 focus:ring-purple-400"
                />
                <span className={`${compleet ? 'font-medium text-purple-700' : 'text-gray-600'}`}>
                  {compleet ? 'Compleet' : 'Niet compleet'}
                </span>
              </label>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm text-gray-500">Aangemaakt</label>
              <p className="text-gray-800">{formatDateTime(note.created_at)}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Email ontvangen</label>
              <p className="text-gray-800">{formatDateTime(note.email_received_at)}</p>
            </div>
          </div>

          {/* Remarks */}
          <div className="mb-6">
            <label className="text-sm text-gray-500 block mb-1">Opmerkingen</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              onBlur={handleRemarksBlur}
              rows={4}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none resize-none"
              placeholder="Voeg opmerkingen toe..."
            />
          </div>

          {/* Email content */}
          {note.email_content && (
            <div className="mb-6">
              <label className="text-sm text-gray-500 block mb-2">Email inhoud</label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                {note.email_from && (
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Van:</span> {note.email_from}
                  </p>
                )}
                {note.email_subject && (
                  <p className="text-sm text-gray-600 mb-3">
                    <span className="font-medium">Onderwerp:</span> {note.email_subject}
                  </p>
                )}
                <div className="border-t border-gray-200 pt-3">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {note.email_content}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Delete section */}
          <div className="border-t border-gray-200 pt-6">
            {showDeleteConfirm ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 mb-3">Weet je zeker dat je deze notitie wilt verwijderen?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {loading ? 'Verwijderen...' : 'Ja, verwijderen'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Notitie verwijderen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
