export type NoteType = 'offerte' | 'onderzoek' | 'overige'
export type NoteStatus = 'nieuw' | 'in_behandeling' | 'afgerond' | 'archief'
export type DeadlineType = 'must' | 'ca'

export interface Note {
  id: string
  user_id: string
  customer_name: string
  contact_person: string
  subject: string
  note_type: NoteType
  note_type_other: string | null
  status: NoteStatus
  position_x: number
  position_y: number
  z_index: number
  remarks: string | null
  replied: boolean
  deadline: string | null
  deadline_type: DeadlineType | null
  compleet: boolean
  email_content: string | null
  email_subject: string | null
  email_from: string | null
  email_received_at: string | null
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      notes: {
        Row: Note
        Insert: Omit<Note, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Note, 'id' | 'user_id'>>
      }
    }
  }
}
