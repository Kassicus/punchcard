'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, Button, Input } from '@/components/ui'
import { useAuth } from '@/components/providers'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
  })
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setIsLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: formData.firstName,
        last_name: formData.lastName,
      })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess('Profile updated successfully')
      refreshProfile()
    }

    setIsLoading(false)
  }

  // Update form when profile loads
  if (profile && formData.firstName === '' && formData.lastName === '') {
    setFormData({
      firstName: profile.first_name,
      lastName: profile.last_name,
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Profile Information</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            <Input
              label="Email"
              value={profile?.email || ''}
              disabled
              className="bg-gray-50"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                required
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                required
              />
            </div>

            <div className="pt-4">
              <Button type="submit" isLoading={isLoading}>
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Account Information</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Role</p>
              <p className="font-medium capitalize">{profile?.role}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Account Status</p>
              <p className="font-medium">{profile?.is_active ? 'Active' : 'Inactive'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Password</p>
              <p className="text-sm text-gray-600">
                Contact an administrator to reset your password.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
