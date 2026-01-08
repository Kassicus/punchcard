'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, Button, Modal, Input, Textarea } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import type { Project } from '@/types/database'

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_name: '',
    is_active: true,
  })
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const supabase = createClient()

  const fetchProjects = async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (data) {
      setProjects(data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const openCreateModal = () => {
    setEditingProject(null)
    setFormData({ name: '', description: '', client_name: '', is_active: true })
    setError(null)
    setShowModal(true)
  }

  const openEditModal = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description || '',
      client_name: project.client_name || '',
      is_active: project.is_active,
    })
    setError(null)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Project name is required')
      return
    }

    setActionLoading(true)
    setError(null)

    if (editingProject) {
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          name: formData.name,
          description: formData.description || null,
          client_name: formData.client_name || null,
          is_active: formData.is_active,
        })
        .eq('id', editingProject.id)

      if (updateError) {
        setError(updateError.message)
        setActionLoading(false)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from('projects')
        .insert({
          name: formData.name,
          description: formData.description || null,
          client_name: formData.client_name || null,
          is_active: formData.is_active,
        })

      if (insertError) {
        setError(insertError.message)
        setActionLoading(false)
        return
      }
    }

    setShowModal(false)
    setEditingProject(null)
    fetchProjects()
    setActionLoading(false)
  }

  const handleDelete = async (id: string) => {
    setActionLoading(true)
    await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    setDeleteConfirm(null)
    fetchProjects()
    setActionLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600">Manage projects for time tracking</p>
        </div>
        <Button onClick={openCreateModal}>Add Project</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-600">Loading...</div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-600">
            No projects yet. Create your first project to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="py-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    project.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {project.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {project.client_name && (
                  <p className="text-sm text-gray-600 mb-1">Client: {project.client_name}</p>
                )}
                {project.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                )}
                <p className="text-xs text-gray-600 mb-3">Created {formatDate(project.created_at)}</p>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(project)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(project.id)}>
                    Archive
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingProject(null) }}
        title={editingProject ? 'Edit Project' : 'Create Project'}
        size="md"
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Input
            label="Project Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter project name"
            required
          />

          <Input
            label="Client Name (optional)"
            value={formData.client_name}
            onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
            placeholder="Enter client name"
          />

          <Textarea
            label="Description (optional)"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Enter project description"
            rows={3}
          />

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => { setShowModal(false); setEditingProject(null) }}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={actionLoading}>
              {editingProject ? 'Save Changes' : 'Create Project'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Archive Project"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to archive this project? It will no longer be available for new time entries.
        </p>
        <div className="flex justify-end space-x-3">
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} isLoading={actionLoading}>
            Archive
          </Button>
        </div>
      </Modal>
    </div>
  )
}
