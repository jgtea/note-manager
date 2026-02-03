import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { UserProfile } from '../types/database'
import { useAuth } from './useAuth'

export function useProfiles() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const fetchProfiles = useCallback(async () => {
    if (!user) return

    setLoading(true)

    // First get current user's profile
    const { data: myProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (myProfile) {
      setCurrentProfile(myProfile as UserProfile)

      // Update last_login
      await supabase
        .from('user_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id)

      // If supervisor, fetch all profiles
      if (myProfile.role === 'supervisor') {
        const { data: allProfiles } = await supabase
          .from('user_profiles')
          .select('*')
          .order('display_name')

        if (allProfiles) {
          setProfiles(allProfiles as UserProfile[])
        }
      }
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  const isSupervisor = currentProfile?.role === 'supervisor'

  return {
    profiles,
    currentProfile,
    isSupervisor,
    loading,
    refetch: fetchProfiles,
  }
}
