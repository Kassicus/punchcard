import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types/database'

export async function getSession() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function requireAuth() {
  const user = await getSession()
  if (!user) {
    redirect('/login')
  }
  return user
}

export async function requireAdmin() {
  const profile = await getProfile()
  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }
  return profile
}
