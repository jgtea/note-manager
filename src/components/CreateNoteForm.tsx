import { useState, type FormEvent } from 'react'
import type { NoteType, DeadlineType } from '../types/database'
import type { CreateNoteData } from '../hooks/useNotes'

interface CreateNoteFormProps {
  onSubmit: (data: CreateNoteData) => Promise<void>
  onCancel: () => void
  initialEmailData?: {
    content: string
    subject: string
    from: string
    receivedAt: string
  }
}

export function CreateNoteForm({ onSubmit, onCancel, initialEmailData }: CreateNoteFormProps) {
  const [customerName, setCustomerName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [subject, setSubject] = useState(initialEmailData?.subject || '')
  const [noteType, setNoteType] = useState<NoteType>('offerte')
  const [noteTypeOther, setNoteTypeOther] = useState('')
  const [remarks, setRemarks] = useState('')
  const [deadline, setDeadline] = useState('')
  const [deadlineType, setDeadlineType] = useState<DeadlineType | ''>('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    await onSubmit({
      customer_name: customerName,
      contact_person: contactPerson,
      subject,
      note_type: noteType,
      note_type_other: noteType === 'overige' ? noteTypeOther : undefined,
      remarks: remarks || undefined,
      deadline: deadline || undefined,
      deadline_type: deadlineType || undefined,
      email_content: initialEmailData?.content,
      email_subject: initialEmailData?.subject,
      email_from: initialEmailData?.from,
      email_received_at: initialEmailData?.receivedAt,
    })

    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="bg-yellow-400 px-6 py-4 rounded-t-lg">
          <h2 className="text-xl font-bold text-gray-800">Nieuwe Notitie</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {initialEmailData && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
              <p className="font-medium text-blue-800">Email bijgevoegd</p>
              <p className="text-blue-600 truncate">{initialEmailData.subject}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Klantnaam *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none"
              placeholder="Bedrijfsnaam"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contactpersoon *
            </label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none"
              placeholder="Naam contactpersoon"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Onderwerp *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none"
              placeholder="Korte omschrijving"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type *
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="noteType"
                  value="offerte"
                  checked={noteType === 'offerte'}
                  onChange={() => setNoteType('offerte')}
                  className="w-4 h-4 text-yellow-500 focus:ring-yellow-400"
                />
                <span>Offerte maken</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="noteType"
                  value="onderzoek"
                  checked={noteType === 'onderzoek'}
                  onChange={() => setNoteType('onderzoek')}
                  className="w-4 h-4 text-yellow-500 focus:ring-yellow-400"
                />
                <span>Onderzoek</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="noteType"
                  value="overige"
                  checked={noteType === 'overige'}
                  onChange={() => setNoteType('overige')}
                  className="w-4 h-4 text-yellow-500 focus:ring-yellow-400"
                />
                <span>Overige</span>
              </label>
            </div>

            {noteType === 'overige' && (
              <input
                type="text"
                value={noteTypeOther}
                onChange={(e) => setNoteTypeOther(e.target.value)}
                required
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none"
                placeholder="Specificeer..."
              />
            )}
          </div>

          {/* Deadline fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deadline Type
              </label>
              <select
                value={deadlineType}
                onChange={(e) => setDeadlineType(e.target.value as DeadlineType | '')}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none cursor-pointer font-bold ${
                  deadlineType === 'must'
                    ? 'bg-red-50 border-red-400 text-red-700'
                    : deadlineType === 'ca'
                      ? 'bg-sky-50 border-sky-400 text-sky-700'
                      : 'border-gray-300'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opmerkingen
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none resize-none"
              placeholder="Eventuele opmerkingen..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-yellow-400 text-gray-800 font-semibold rounded-lg hover:bg-yellow-500 transition disabled:opacity-50"
            >
              {loading ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
