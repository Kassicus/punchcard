'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, Button, Modal, Input, Textarea } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import type { Category } from '@/types/database'

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
]

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: DEFAULT_COLORS[0],
    is_active: true,
  })
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const supabase = createClient()

  const fetchCategories = async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from('categories')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (data) {
      setCategories(data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const openCreateModal = () => {
    setEditingCategory(null)
    setFormData({ name: '', description: '', color: DEFAULT_COLORS[0], is_active: true })
    setError(null)
    setShowModal(true)
  }

  const openEditModal = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || DEFAULT_COLORS[0],
      is_active: category.is_active,
    })
    setError(null)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Category name is required')
      return
    }

    setActionLoading(true)
    setError(null)

    if (editingCategory) {
      const { error: updateError } = await supabase
        .from('categories')
        .update({
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
          is_active: formData.is_active,
        })
        .eq('id', editingCategory.id)

      if (updateError) {
        setError(updateError.message)
        setActionLoading(false)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from('categories')
        .insert({
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
          is_active: formData.is_active,
        })

      if (insertError) {
        setError(insertError.message)
        setActionLoading(false)
        return
      }
    }

    setShowModal(false)
    setEditingCategory(null)
    fetchCategories()
    setActionLoading(false)
  }

  const handleDelete = async (id: string) => {
    setActionLoading(true)
    await supabase
      .from('categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    setDeleteConfirm(null)
    fetchCategories()
    setActionLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600">Manage categories for time tracking</p>
        </div>
        <Button onClick={openCreateModal}>Add Category</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-600">Loading...</div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-600">
            No categories yet. Create your first category to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardContent className="py-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color || '#3B82F6' }}
                    />
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    category.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {category.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {category.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{category.description}</p>
                )}
                <p className="text-xs text-gray-600 mb-3">Created {formatDate(category.created_at)}</p>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(category)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(category.id)}>
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
        onClose={() => { setShowModal(false); setEditingCategory(null) }}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        size="md"
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Input
            label="Category Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter category name"
            required
          />

          <Textarea
            label="Description (optional)"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Enter category description"
            rows={3}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    formData.color === color ? 'border-gray-900 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

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
            <Button variant="ghost" onClick={() => { setShowModal(false); setEditingCategory(null) }}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={actionLoading}>
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Archive Category"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to archive this category? It will no longer be available for new time entries.
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
