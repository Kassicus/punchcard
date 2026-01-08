'use client'

import { useState, useEffect } from 'react'
import { useTimerStore } from '@/stores/timer-store'
import { Button, Select } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import type { Project, Category } from '@/types/database'

interface TimerControlsProps {
  onStop: () => void
}

export function TimerControls({ onStop }: TimerControlsProps) {
  const { isRunning, startTimer, selectedProjectId, selectedCategoryId } = useTimerStore()
  const [projects, setProjects] = useState<Project[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectionType, setSelectionType] = useState<'project' | 'category'>('project')
  const [selectedId, setSelectedId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
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

  const handleStart = async () => {
    if (!selectedId) return

    setIsLoading(true)

    const projectId = selectionType === 'project' ? selectedId : null
    const categoryId = selectionType === 'category' ? selectedId : null

    // Update profile with active timer
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({
          active_timer_start: new Date().toISOString(),
          active_timer_project_id: projectId,
          active_timer_category_id: categoryId,
        })
        .eq('id', user.id)
    }

    startTimer(projectId, categoryId)
    setIsLoading(false)
  }

  const handleStop = () => {
    onStop()
  }

  const options = selectionType === 'project'
    ? projects.map(p => ({ value: p.id, label: p.name }))
    : categories.map(c => ({ value: c.id, label: c.name }))

  if (isRunning) {
    const currentProject = projects.find(p => p.id === selectedProjectId)
    const currentCategory = categories.find(c => c.id === selectedCategoryId)
    const currentName = currentProject?.name || currentCategory?.name

    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-gray-600">Tracking: {currentName}</span>
        </div>
        <Button onClick={handleStop} variant="danger" size="lg" className="w-48">
          Stop Timer
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-4 w-full max-w-md">
      <div className="flex space-x-2 mb-2">
        <button
          onClick={() => { setSelectionType('project'); setSelectedId('') }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectionType === 'project'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Project
        </button>
        <button
          onClick={() => { setSelectionType('category'); setSelectedId('') }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectionType === 'category'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Category
        </button>
      </div>

      <Select
        options={options}
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        placeholder={`Select a ${selectionType}`}
        className="w-full"
      />

      <Button
        onClick={handleStart}
        size="lg"
        className="w-48"
        disabled={!selectedId}
        isLoading={isLoading}
      >
        Start Timer
      </Button>
    </div>
  )
}
