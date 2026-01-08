'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        setProfile(null)
        return
      }

      setProfile(data)
    } catch (err) {
      console.error('Error fetching profile:', err)
      setProfile(null)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true
    let hasCompletedAuth = false

    // Safety timeout - if auth takes too long, stop loading anyway
    const timeoutId = setTimeout(() => {
      if (isMounted && !hasCompletedAuth) {
        console.warn('Auth check timed out after 5s, proceeding without auth')
        setIsLoading(false)
      }
    }, 5000)

    const completeAuth = () => {
      hasCompletedAuth = true
      clearTimeout(timeoutId)
      if (isMounted) {
        setIsLoading(false)
      }
    }

    // Get initial user
    const getUser = async () => {
      try {
        console.log('Checking auth state...')
        const { data: { user: currentUser }, error } = await supabase.auth.getUser()

        if (!isMounted) return

        if (error) {
          console.error('Error getting user:', error)
          setUser(null)
          setProfile(null)
          completeAuth()
          return
        }

        console.log('Auth check complete, user:', currentUser?.email || 'none')
        setUser(currentUser)
        // Complete auth immediately, fetch profile in background
        completeAuth()
        if (currentUser) {
          fetchProfile(currentUser.id) // Don't await - load in background
        }
      } catch (err) {
        console.error('Error in getUser:', err)
        if (isMounted) {
          setUser(null)
          setProfile(null)
        }
        completeAuth()
      }
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return
        console.log('Auth state changed:', event)
        const currentUser = session?.user ?? null
        setUser(currentUser)
        // Complete auth immediately
        completeAuth()

        if (currentUser) {
          fetchProfile(currentUser.id) // Don't await - load in background
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const supabase = createClient()
    try {
      console.log('Signing out...')
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      }
      setUser(null)
      setProfile(null)
      // Force a hard navigation to ensure cookies are cleared
      window.location.href = '/login'
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
