'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, Button, Input, Select } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils'
import type { AuditLog, Profile } from '@/types/database'

type AuditLogWithUser = AuditLog & { profile?: Profile }

const ACTION_LABELS: Record<string, string> = {
  'time_entry.created': 'Created time entry',
  'time_entry.updated': 'Updated time entry',
  'time_entry.deleted': 'Deleted time entry',
  'project.created': 'Created project',
  'project.updated': 'Updated project',
  'project.archived': 'Archived project',
  'category.created': 'Created category',
  'category.updated': 'Updated category',
  'category.archived': 'Archived category',
  'user.created': 'User registered',
  'user.updated': 'Updated user',
  'user.deactivated': 'Deactivated user',
  'user.role_changed': 'Changed user role',
  'user.password_reset': 'Reset password',
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogWithUser[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  // Filters
  const [userFilter, setUserFilter] = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const supabase = createClient()

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('first_name')
    if (data) setUsers(data)
  }

  const fetchLogs = async (reset = false) => {
    setIsLoading(true)
    const currentPage = reset ? 0 : page

    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        profile:profiles(*)
      `)
      .order('created_at', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1)

    if (userFilter) {
      query = query.eq('user_id', userFilter)
    }
    if (entityTypeFilter) {
      query = query.eq('entity_type', entityTypeFilter)
    }
    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString())
    }
    if (dateTo) {
      query = query.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString())
    }

    const { data } = await query

    if (data) {
      if (reset) {
        setLogs(data)
        setPage(0)
      } else {
        setLogs(prev => [...prev, ...data])
      }
      setHasMore(data.length === PAGE_SIZE)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchUsers()
    fetchLogs(true)
  }, [])

  useEffect(() => {
    fetchLogs(true)
  }, [userFilter, entityTypeFilter, dateFrom, dateTo])

  const loadMore = () => {
    setPage(prev => prev + 1)
    fetchLogs(false)
  }

  const getActionColor = (action: string) => {
    if (action.includes('created')) return 'bg-green-100 text-green-700'
    if (action.includes('updated')) return 'bg-blue-100 text-blue-700'
    if (action.includes('deleted') || action.includes('archived') || action.includes('deactivated')) return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-600">Track all user actions and system changes</p>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              label="User"
              options={users.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }))}
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="All users"
            />
            <Select
              label="Entity Type"
              options={[
                { value: 'time_entry', label: 'Time Entries' },
                { value: 'project', label: 'Projects' },
                { value: 'category', label: 'Categories' },
                { value: 'user', label: 'Users' },
              ]}
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              placeholder="All types"
            />
            <Input
              type="date"
              label="From"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              type="date"
              label="To"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading && logs.length === 0 ? (
        <div className="text-center py-12 text-gray-600">Loading...</div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-600">
            No audit logs found matching your filters.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Timestamp</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">User</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Action</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Entity</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.profile?.first_name} {log.profile?.last_name}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                        {log.entity_type.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {log.new_values ? (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:text-blue-700">View changes</summary>
                            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-w-md">
                              {JSON.stringify(log.new_values, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {hasMore && (
            <div className="text-center">
              <Button variant="secondary" onClick={loadMore} isLoading={isLoading}>
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
