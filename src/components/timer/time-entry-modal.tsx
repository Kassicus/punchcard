'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Input, Textarea, Select } from '@/components/ui'
import { useTimerStore } from '@/stores/timer-store'
import { createClient } from '@/lib/supabase/client'
import { formatDateForInput } from '@/lib/utils'
import type { Project, Category } from '@/types/database'

interface TimeEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  mode?: 'timer' | 'quickEntry'
}

export function TimeEntryModal({ isOpen, onClose, onSave, mode = 'timer' }: TimeEntryModalProps) {
  const { startTime, selectedProjectId, selectedCategoryId, resetTimer } = useTimerStore()
  const isQuickEntry = mode === 'quickEntry'
  const [projects, setProjects] = useState<Project[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    projectId: '',
    categoryId: '',
    notes: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const [projectsRes, categoriesRes] = await Promise.all([
        supabase.from('projects').select('*').eq('is_active', true).is('deleted_at', null),
        supabase.from('categories').select('*').eq('is_active', true).is('deleted_at', null),
      ])

      if (projectsRes.data) setProjects(projectsRes.data)
      if (categoriesRes.data) setCategories(categoriesRes.data)
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (isOpen) {
      if (isQuickEntry) {
        // Quick entry mode: default to last hour
        const now = new Date()
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
        setFormData({
          startTime: formatDateForInput(oneHourAgo),
          endTime: formatDateForInput(now),
          projectId: '',
          categoryId: '',
          notes: '',
        })
        setError(null)
      } else if (startTime) {
        // Timer mode: use timer store values
        setFormData({
          startTime: formatDateForInput(startTime),
          endTime: formatDateForInput(new Date()),
          projectId: selectedProjectId || '',
          categoryId: selectedCategoryId || '',
          notes: '',
        })
        setError(null)
      }
    }
  }, [isOpen, startTime, selectedProjectId, selectedCategoryId, isQuickEntry])

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setIsLoading(false)
      return
    }

    const startDate = new Date(formData.startTime)
    const endDate = new Date(formData.endTime)

    if (endDate <= startDate) {
      setError('End time must be after start time')
      setIsLoading(false)
      return
    }

    if (!formData.projectId && !formData.categoryId) {
      setError('Please select a project or category')
      setIsLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('time_entries').insert({
      user_id: user.id,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      project_id: formData.projectId || null,
      category_id: formData.categoryId || null,
      notes: formData.notes || null,
    })

    if (insertError) {
      setError(insertError.message)
      setIsLoading(false)
      return
    }

    // Only clear active timer in timer mode (not quick entry)
    if (!isQuickEntry) {
      await supabase
        .from('profiles')
        .update({
          active_timer_start: null,
          active_timer_project_id: null,
          active_timer_category_id: null,
        })
        .eq('id', user.id)

      resetTimer()
    }

    setIsLoading(false)
    onSave()
    onClose()
  }

  const handleDiscard = async () => {
    // Only clear active timer in timer mode (not quick entry)
    if (!isQuickEntry) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({
            active_timer_start: null,
            active_timer_project_id: null,
            active_timer_category_id: null,
          })
          .eq('id', user.id)
      }
      resetTimer()
    }
    onClose()
  }

  const handleProjectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      projectId: value,
      categoryId: value ? '' : prev.categoryId,
    }))
  }

  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      categoryId: value,
      projectId: value ? '' : prev.projectId,
    }))
  }

  const duration = (() => {
    const start = new Date(formData.startTime)
    const end = new Date(formData.endTime)
    const diff = Math.max(0, end.getTime() - start.getTime())
    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    return `${hours}h ${minutes}m`
  })()

  const modalTitle = isQuickEntry ? 'Quick Time Entry' : 'Review Time Entry'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="md">
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

        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <span className="text-sm text-gray-600">Duration: </span>
          <span className="font-semibold text-gray-900">{duration}</span>
        </div>

        <Select
          label="Project"
          options={projects.map(p => ({ value: p.id, label: p.name }))}
          value={formData.projectId}
          onChange={(e) => handleProjectChange(e.target.value)}
          placeholder="Select a project"
          disabled={!!formData.categoryId}
        />

        <div className="text-center text-gray-600 text-sm">- or -</div>

        <Select
          label="Category"
          options={categories.map(c => ({ value: c.id, label: c.name }))}
          value={formData.categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          placeholder="Select a category"
          disabled={!!formData.projectId}
        />

        <Textarea
          label="Notes (optional)"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Add any notes about this time entry..."
          rows={3}
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="ghost" onClick={handleDiscard}>
            {isQuickEntry ? 'Cancel' : 'Discard'}
          </Button>
          <Button onClick={handleSave} isLoading={isLoading}>
            Save Entry
          </Button>
        </div>
      </div>
    </Modal>
  )
}
