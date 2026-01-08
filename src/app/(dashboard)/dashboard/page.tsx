'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui'
import { TimerDisplay, TimerControls, TimeEntryModal } from '@/components/timer'
import { useTimerStore } from '@/stores/timer-store'
import { useAuth } from '@/components/providers'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatTime, formatDurationHuman } from '@/lib/utils'
import type { TimeEntry, Project, Category } from '@/types/database'

export default function DashboardPage() {
  const [showModal, setShowModal] = useState(false)
  const [recentEntries, setRecentEntries] = useState<(TimeEntry & { project?: Project; category?: Category })[]>([])
  const { profile } = useAuth()
  const { stopTimer, resumeTimer, isRunning } = useTimerStore()
  const supabase = createClient()

  // Check for active timer on mount
  useEffect(() => {
    const checkActiveTimer = async () => {
      if (profile?.active_timer_start && !isRunning) {
        resumeTimer(
          new Date(profile.active_timer_start),
          profile.active_timer_project_id,
          profile.active_timer_category_id
        )
      }
    }

    checkActiveTimer()
  }, [profile, isRunning, resumeTimer])

  // Fetch recent entries
  const fetchRecentEntries = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('time_entries')
      .select(`
        *,
        project:projects(*),
        category:categories(*)
      `)
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })
      .limit(5)

    if (data) {
      setRecentEntries(data)
    }
  }

  useEffect(() => {
    fetchRecentEntries()
  }, [])

  const handleStop = () => {
    stopTimer()
    setShowModal(true)
  }

  const handleSave = () => {
    fetchRecentEntries()
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {profile?.first_name}</p>
      </div>

      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center space-y-8">
            <TimerDisplay />
            <TimerControls onStop={handleStop} />
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Time Entries</h2>
        {recentEntries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-600">
              No time entries yet. Start tracking to see your history.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentEntries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.category?.color || '#3B82F6' }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {entry.project?.name || entry.category?.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDate(entry.start_time)} &middot; {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatDurationHuman(entry.duration_seconds)}
                      </p>
                      {entry.notes && (
                        <p className="text-sm text-gray-600 truncate max-w-xs">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <TimeEntryModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
      />
    </div>
  )
}
