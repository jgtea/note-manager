import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Note, NoteType, NoteStatus } from '../types/database'
import { useAuth } from './useAuth'

export interface CreateNoteData {
  customer_name: string
  contact_person: string
  subject: string
  note_type: NoteType
  note_type_other?: string
  remarks?: string
  deadline?: string
  deadline_type?: 'must' | 'ca'
  email_content?: string
  email_subject?: string
  email_from?: string
  email_received_at?: string
}

export function useNotes(viewUserId?: string | null) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchNotes = useCallback(async () => {
    if (!user) return

    setLoading(true)

    // Build query - if viewUserId is provided, filter by that user
    let query = supabase
      .from('notes')
      .select('*')

    if (viewUserId) {
      query = query.eq('user_id', viewUserId)
    }

    const { data, error } = await query.order('z_index', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setNotes((data as Note[]) || [])
    }
    setLoading(false)
  }, [user, viewUserId])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const createNote = async (noteData: CreateNoteData) => {
    if (!user) return { error: new Error('Not authenticated') }

    const maxZIndex = notes.length > 0
      ? Math.max(...notes.map(n => n.z_index)) + 1
      : 0

    // Stack notes so headers remain visible (offset ~100px per note vertically)
    const HEADER_HEIGHT = 100
    const NOTE_WIDTH = 440 // w-[420px] + margin
    const NOTES_PER_COLUMN = 6
    const column = Math.floor(notes.length / NOTES_PER_COLUMN)
    const row = notes.length % NOTES_PER_COLUMN

    const { data, error } = await supabase
      .from('notes')
      .insert({
        ...noteData,
        user_id: user.id,
        status: 'nieuw',
        position_x: 20 + column * (NOTE_WIDTH + 20),
        position_y: 20 + row * HEADER_HEIGHT,
        z_index: maxZIndex,
      })
      .select()
      .single()

    if (!error && data) {
      setNotes(prev => [...prev, data as Note])
    }

    return { data, error }
  }

  const updateNote = async (id: string, updates: Partial<Note>) => {
    const { data, error } = await supabase
      .from('notes')
      .update(updates as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      setNotes(prev => prev.map(n => n.id === id ? (data as Note) : n))
    }

    return { data, error }
  }

  const updatePosition = async (id: string, x: number, y: number) => {
    return updateNote(id, { position_x: x, position_y: y })
  }

  const bringToFront = async (id: string) => {
    const maxZIndex = Math.max(...notes.map(n => n.z_index)) + 1
    return updateNote(id, { z_index: maxZIndex })
  }

  const updateStatus = async (id: string, status: NoteStatus) => {
    return updateNote(id, { status })
  }

  const toggleReplied = async (id: string, replied: boolean) => {
    return updateNote(id, { replied })
  }

  const deleteNote = async (id: string) => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)

    if (!error) {
      setNotes(prev => prev.filter(n => n.id !== id))
    }

    return { error }
  }

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    updatePosition,
    bringToFront,
    updateStatus,
    toggleReplied,
    deleteNote,
    refetch: fetchNotes,
  }
}
