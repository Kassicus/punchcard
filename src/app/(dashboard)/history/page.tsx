'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, Button, Input, Select, Modal, Textarea } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatTime, formatDurationHuman, formatDateForInput } from '@/lib/utils'
import type { TimeEntry, Project, Category } from '@/types/database'

type TimeEntryWithRelations = TimeEntry & { project?: Project; category?: Category }

export default function HistoryPage() {
  const [entries, setEntries] = useState<TimeEntryWithRelations[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingEntry, setEditingEntry] = useState<TimeEntryWithRelations | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const supabase = createClient()

  const fetchEntries = async () => {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('time_entries')
      .select(`
        *,
        project:projects(*),
        category:categories(*)
      `)
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })

    if (dateFrom) {
      query = query.gte('start_time', new Date(dateFrom).toISOString())
    }
    if (dateTo) {
      query = query.lte('start_time', new Date(dateTo + 'T23:59:59').toISOString())
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

  const fetchFilters = async () => {
    const [projectsRes, categoriesRes] = await Promise.all([
      supabase.from('projects').select('*').eq('is_active', true).is('deleted_at', null),
      supabase.from('categories').select('*').eq('is_active', true).is('deleted_at', null),
    ])

    if (projectsRes.data) setProjects(projectsRes.data)
    if (categoriesRes.data) setCategories(categoriesRes.data)
  }

  useEffect(() => {
    fetchFilters()
    fetchEntries()
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [dateFrom, dateTo, projectFilter, categoryFilter])

  const handleDelete = async (id: string) => {
    await supabase.from('time_entries').delete().eq('id', id)
    setDeleteConfirm(null)
    fetchEntries()
  }

  const handleEditSave = async (entry: TimeEntryWithRelations) => {
    const { error } = await supabase
      .from('time_entries')
      .update({
        start_time: entry.start_time,
        end_time: entry.end_time,
        project_id: entry.project_id,
        category_id: entry.category_id,
        notes: entry.notes,
      })
      .eq('id', entry.id)

    if (!error) {
      setEditingEntry(null)
      fetchEntries()
    }
  }

  const totalMinutes = entries.reduce((sum, e) => sum + e.duration_seconds, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Time Entry History</h1>
        <p className="text-gray-600">View and manage your past time entries</p>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      <div className="bg-blue-50 rounded-lg px-4 py-3">
        <span className="text-blue-700">
          Total: <span className="font-semibold">{formatDurationHuman(totalMinutes)}</span>
          {' '}across {entries.length} entries
        </span>
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
        <div className="space-y-2">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.category?.color || '#3B82F6' }}
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {entry.project?.name || entry.category?.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(entry.start_time)} &middot; {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                      </p>
                      {entry.notes && (
                        <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="font-semibold text-gray-900">
                      {formatDurationHuman(entry.duration_seconds)}
                    </span>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingEntry(entry)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(entry.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          projects={projects}
          categories={categories}
          onClose={() => setEditingEntry(null)}
          onSave={handleEditSave}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Time Entry"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete this time entry? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
            Delete
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
  onClose,
  onSave,
}: {
  entry: TimeEntryWithRelations
  projects: Project[]
  categories: Category[]
  onClose: () => void
  onSave: (entry: TimeEntryWithRelations) => void
}) {
  const [formData, setFormData] = useState({
    startTime: formatDateForInput(new Date(entry.start_time)),
    endTime: formatDateForInput(new Date(entry.end_time)),
    projectId: entry.project_id || '',
    categoryId: entry.category_id || '',
    notes: entry.notes || '',
  })
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
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

    onSave({
      ...entry,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      project_id: formData.projectId || null,
      category_id: formData.categoryId || null,
      notes: formData.notes || null,
    })
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Time Entry" size="md">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

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

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  )
}
