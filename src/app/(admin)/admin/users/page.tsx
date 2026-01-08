'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, Button, Modal, Select, Input } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/types/database'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user')
  const [newPassword, setNewPassword] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const supabase = createClient()

  const fetchUsers = async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setUsers(data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleToggleActive = async (user: Profile) => {
    setActionLoading(true)
    await supabase
      .from('profiles')
      .update({ is_active: !user.is_active })
      .eq('id', user.id)

    fetchUsers()
    setActionLoading(false)
  }

  const handleRoleChange = async () => {
    if (!selectedUser) return
    setActionLoading(true)

    await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', selectedUser.id)

    setShowRoleModal(false)
    setSelectedUser(null)
    fetchUsers()
    setActionLoading(false)
  }

  const handlePasswordReset = async () => {
    if (!selectedUser || !newPassword) return
    setActionLoading(true)

    // Note: In production, this would need to use Supabase Admin API
    // For now, we'll show a message that admin needs to use Supabase dashboard
    alert('Password reset functionality requires Supabase Admin API. Please use the Supabase dashboard to reset user passwords.')

    setShowResetModal(false)
    setSelectedUser(null)
    setNewPassword('')
    setActionLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600">Manage user accounts and permissions</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-600">Loading...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">User</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Joined</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user)
                          setNewRole(user.role as 'user' | 'admin')
                          setShowRoleModal(true)
                        }}
                      >
                        Change Role
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(user)}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user)
                          setShowResetModal(true)
                        }}
                      >
                        Reset Password
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Role Change Modal */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => { setShowRoleModal(false); setSelectedUser(null) }}
        title="Change User Role"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Change role for <span className="font-medium">{selectedUser?.first_name} {selectedUser?.last_name}</span>
          </p>
          <Select
            label="Role"
            options={[
              { value: 'user', label: 'User' },
              { value: 'admin', label: 'Admin' },
            ]}
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => { setShowRoleModal(false); setSelectedUser(null) }}>
              Cancel
            </Button>
            <Button onClick={handleRoleChange} isLoading={actionLoading}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => { setShowResetModal(false); setSelectedUser(null); setNewPassword('') }}
        title="Reset User Password"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Reset password for <span className="font-medium">{selectedUser?.first_name} {selectedUser?.last_name}</span>
          </p>
          <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
            Note: Password reset requires Supabase Admin API access. For now, please use the Supabase dashboard to reset passwords.
          </p>
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => { setShowResetModal(false); setSelectedUser(null); setNewPassword('') }}>
              Cancel
            </Button>
            <Button onClick={handlePasswordReset} isLoading={actionLoading} disabled>
              Reset Password
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
