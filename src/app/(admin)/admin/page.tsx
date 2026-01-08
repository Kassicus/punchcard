'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { formatDurationHuman } from '@/lib/utils'

interface Stats {
  totalUsers: number
  activeUsers: number
  totalProjects: number
  totalCategories: number
  totalTimeEntries: number
  totalHoursThisWeek: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalProjects: 0,
    totalCategories: 0,
    totalTimeEntries: 0,
    totalHoursThisWeek: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      const [
        usersRes,
        activeUsersRes,
        projectsRes,
        categoriesRes,
        entriesRes,
        weekEntriesRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('projects').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('categories').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('time_entries').select('id', { count: 'exact', head: true }),
        supabase.from('time_entries').select('duration_seconds').gte('start_time', startOfWeek.toISOString()),
      ])

      const totalSecondsThisWeek = weekEntriesRes.data?.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) || 0

      setStats({
        totalUsers: usersRes.count || 0,
        activeUsers: activeUsersRes.count || 0,
        totalProjects: projectsRes.count || 0,
        totalCategories: categoriesRes.count || 0,
        totalTimeEntries: entriesRes.count || 0,
        totalHoursThisWeek: totalSecondsThisWeek,
      })
      setIsLoading(false)
    }

    fetchStats()
  }, [])

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, subtext: `${stats.activeUsers} active` },
    { label: 'Projects', value: stats.totalProjects },
    { label: 'Categories', value: stats.totalCategories },
    { label: 'Time Entries', value: stats.totalTimeEntries },
    { label: 'Time This Week', value: formatDurationHuman(stats.totalHoursThisWeek) },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Overview of your organization</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-600">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="py-6">
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                {stat.subtext && (
                  <p className="text-sm text-gray-600 mt-1">{stat.subtext}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Quick Actions</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <a href="/admin/users" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <p className="font-medium text-gray-900">Manage Users</p>
                <p className="text-sm text-gray-600">View, edit, and manage user accounts</p>
              </a>
              <a href="/admin/projects" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <p className="font-medium text-gray-900">Manage Projects</p>
                <p className="text-sm text-gray-600">Create and organize projects</p>
              </a>
              <a href="/admin/reports" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <p className="font-medium text-gray-900">View Reports</p>
                <p className="text-sm text-gray-600">Analyze time entries across users</p>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">System Status</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Database</span>
                <span className="flex items-center text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Authentication</span>
                <span className="flex items-center text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Active
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
