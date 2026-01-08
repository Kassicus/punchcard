'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, Button, Input, Select, Modal, Textarea } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatTime, formatDurationHuman, formatDateForInput } from '@/lib/utils'
import type { TimeEntry, Project, Category, Profile } from '@/types/database'

type TimeEntryWithRelations = TimeEntry & {
  project?: Project
  category?: Category
  profile?: Profile
}

export default function AdminReportsPage() {
  const [entries, setEntries] = useState<TimeEntryWithRelations[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Entry management
  const [selectedEntry, setSelectedEntry] = useState<TimeEntryWithRelations | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = createClient()

  const fetchFilters = async () => {
    const [usersRes, projectsRes, categoriesRes] = await Promise.all([
      supabase.from('profiles').select('*').order('first_name'),
      supabase.from('projects').select('*').is('deleted_at', null),
      supabase.from('categories').select('*').is('deleted_at', null),
    ])

    if (usersRes.data) setUsers(usersRes.data)
    if (projectsRes.data) setProjects(projectsRes.data)
    if (categoriesRes.data) setCategories(categoriesRes.data)
  }

  const fetchEntries = async () => {
    setIsLoading(true)

    let query = supabase
      .from('time_entries')
      .select(`
        *,
        project:projects(*),
        category:categories(*),
        profile:profiles(*)
      `)
      .order('start_time', { ascending: false })

    if (dateFrom) {
      query = query.gte('start_time', new Date(dateFrom).toISOString())
    }
    if (dateTo) {
      query = query.lte('start_time', new Date(dateTo + 'T23:59:59').toISOString())
    }
    if (userFilter) {
      query = query.eq('user_id', userFilter)
    }
    if (projectFilter) {
      query = query.eq('project_id', projectFilter)
    }
    if (categoryFilter) {
      query = query.eq('category_id', categoryFilter)
    }

    const { data } = await query

    if (data) {
      setEntries(data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchFilters()
    fetchEntries()
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [dateFrom, dateTo, userFilter, projectFilter, categoryFilter])

  const handleRowClick = (entry: TimeEntryWithRelations) => {
    setSelectedEntry(entry)
    setShowEditModal(true)
  }

  const handleDelete = async () => {
    if (!selectedEntry) return
    setActionLoading(true)

    await supabase.from('time_entries').delete().eq('id', selectedEntry.id)

    setShowDeleteModal(false)
    setShowEditModal(false)
    setSelectedEntry(null)
    setActionLoading(false)
    fetchEntries()
  }

  const totalMinutes = entries.reduce((sum, e) => sum + e.duration_seconds, 0)

  // Group by user
  const byUser = entries.reduce((acc, entry) => {
    const userName = entry.profile ? `${entry.profile.first_name} ${entry.profile.last_name}` : 'Unknown'
    acc[userName] = (acc[userName] || 0) + entry.duration_seconds
    return acc
  }, {} as Record<string, number>)

  // Group by project
  const byProject = entries.reduce((acc, entry) => {
    const name = entry.project?.name || entry.category?.name || 'Unknown'
    acc[name] = (acc[name] || 0) + entry.duration_seconds
    return acc
  }, {} as Record<string, number>)

  const exportCSV = () => {
    const headers = ['Date', 'User', 'Project/Category', 'Start Time', 'End Time', 'Duration (minutes)', 'Notes']
    const rows = entries.map(e => [
      formatDate(e.start_time),
      e.profile ? `${e.profile.first_name} ${e.profile.last_name}` : '',
      e.project?.name || e.category?.name || '',
      formatTime(e.start_time),
      formatTime(e.end_time),
      e.duration_seconds.toString(),
      e.notes || '',
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `time-entries-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Time Entry Reports</h1>
          <p className="text-gray-600">View and analyze time entries across all users</p>
        </div>
        <Button onClick={exportCSV} disabled={entries.length === 0}>
          Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <Select
              label="User"
              options={users.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }))}
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="All users"
            />
            <Select
              label="Project"
              options={projects.map(p => ({ value: p.id, label: p.name }))}
              value={projectFilter}
              onChange={(e) => { setProjectFilter(e.target.value); setCategoryFilter('') }}
              placeholder="All projects"
            />
            <Select
              label="Category"
              options={categories.map(c => ({ value: c.id, label: c.name }))}
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setProjectFilter('') }}
              placeholder="All categories"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-600">Total Time</p>
            <p className="text-2xl font-bold text-gray-900">{formatDurationHuman(totalMinutes)}</p>
            <p className="text-sm text-gray-600">{entries.length} entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-medium text-gray-600">By User</h3>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {Object.entries(byUser)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([name, mins]) => (
                  <div key={name} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate">{name}</span>
                    <span className="font-medium">{formatDurationHuman(mins)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-medium text-gray-600">By Project/Category</h3>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {Object.entries(byProject)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([name, mins]) => (
                  <div key={name} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate">{name}</span>
                    <span className="font-medium">{formatDurationHuman(mins)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-600">Loading...</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-600">
            No time entries found matching your filters.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">User</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Project/Category</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Time</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Duration</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRowClick(entry)}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(entry.start_time)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {entry.profile?.first_name} {entry.profile?.last_name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: entry.category?.color || '#3B82F6' }}
                        />
                        <span className="text-sm text-gray-900">
                          {entry.project?.name || entry.category?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatDurationHuman(entry.duration_seconds)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {entry.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Edit Entry Modal */}
      {selectedEntry && (
        <EditEntryModal
          entry={selectedEntry}
          projects={projects}
          categories={categories}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedEntry(null)
          }}
          onSave={() => {
            setShowEditModal(false)
            setSelectedEntry(null)
            fetchEntries()
          }}
          onDelete={() => {
            setShowDeleteModal(true)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Time Entry"
        size="sm"
      >
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete this time entry?
        </p>
        {selectedEntry && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-900 font-medium">
              {selectedEntry.profile?.first_name} {selectedEntry.profile?.last_name}
            </p>
            <p className="text-sm text-gray-600">
              {formatDate(selectedEntry.start_time)} &middot; {formatDurationHuman(selectedEntry.duration_seconds)}
            </p>
            <p className="text-sm text-gray-600">
              {selectedEntry.project?.name || selectedEntry.category?.name}
            </p>
          </div>
        )}
        <p className="text-sm text-red-600 mb-6">
          This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={actionLoading}>
            Delete Entry
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function EditEntryModal({
  entry,
  projects,
  categories,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: {
  entry: TimeEntryWithRelations
  projects: Project[]
  categories: Category[]
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  onDelete: () => void
}) {
  const [formData, setFormData] = useState({
    startTime: formatDateForInput(new Date(entry.start_time)),
    endTime: formatDateForInput(new Date(entry.end_time)),
    projectId: entry.project_id || '',
    categoryId: entry.category_id || '',
    notes: entry.notes || '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setFormData({
      startTime: formatDateForInput(new Date(entry.start_time)),
      endTime: formatDateForInput(new Date(entry.end_time)),
      projectId: entry.project_id || '',
      categoryId: entry.category_id || '',
      notes: entry.notes || '',
    })
    setError(null)
  }, [entry])

  const handleSave = async () => {
    const startDate = new Date(formData.startTime)
    const endDate = new Date(formData.endTime)

    if (endDate <= startDate) {
      setError('End time must be after start time')
      return
    }

    if (!formData.projectId && !formData.categoryId) {
      setError('Please select a project or category')
      return
    }

    setIsLoading(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('time_entries')
      .update({
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        project_id: formData.projectId || null,
        category_id: formData.categoryId || null,
        notes: formData.notes || null,
      })
      .eq('id', entry.id)

    if (updateError) {
      setError(updateError.message)
      setIsLoading(false)
      return
    }

    setIsLoading(false)
    onSave()
  }

  const duration = (() => {
    const start = new Date(formData.startTime)
    const end = new Date(formData.endTime)
    const diffSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000))
    return formatDurationHuman(diffSeconds)
  })()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Time Entry" size="md">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">User</p>
          <p className="font-medium text-gray-900">
            {entry.profile?.first_name} {entry.profile?.last_name}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Time"
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
          />
          <Input
            label="End Time"
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
          />
        </div>

        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <span className="text-sm text-gray-600">Duration: </span>
          <span className="font-semibold text-gray-900">{duration}</span>
        </div>

        <Select
          label="Project"
          options={projects.map(p => ({ value: p.id, label: p.name }))}
          value={formData.projectId}
          onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value, categoryId: '' }))}
          placeholder="Select a project"
          disabled={!!formData.categoryId}
        />

        <div className="text-center text-gray-600 text-sm">- or -</div>

        <Select
          label="Category"
          options={categories.map(c => ({ value: c.id, label: c.name }))}
          value={formData.categoryId}
          onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value, projectId: '' }))}
          placeholder="Select a category"
          disabled={!!formData.projectId}
        />

        <Textarea
          label="Notes (optional)"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
        />

        <div className="flex justify-between pt-4">
          <Button variant="danger" onClick={onDelete}>
            Delete Entry
          </Button>
          <div className="flex space-x-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={isLoading}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
