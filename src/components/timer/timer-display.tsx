'use client'

import { useEffect, useState } from 'react'
import { useTimerStore } from '@/stores/timer-store'
import { formatDuration } from '@/lib/utils'

export function TimerDisplay() {
  const { isRunning, startTime, elapsedSeconds, setElapsedSeconds } = useTimerStore()
  const [displayTime, setDisplayTime] = useState('00:00:00')

  useEffect(() => {
    if (!isRunning || !startTime) {
      setDisplayTime(formatDuration(elapsedSeconds))
      return
    }

    const updateTimer = () => {
      const now = new Date()
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
      setElapsedSeconds(elapsed)
      setDisplayTime(formatDuration(elapsed))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [isRunning, startTime, setElapsedSeconds, elapsedSeconds])

  return (
    <div className={`text-6xl font-mono font-bold tabular-nums ${isRunning ? 'text-green-600' : 'text-gray-900'}`}>
      {displayTime}
    </div>
  )
}
