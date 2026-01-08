'use client'

import { useEffect, useState, useCallback, ReactNode } from 'react'
import { useAuth } from './auth-provider'
import { Modal, Button } from '@/components/ui'

const TIMEOUT_DURATION = 8 * 60 * 60 * 1000 // 8 hours in ms
const WARNING_BEFORE = 5 * 60 * 1000 // 5 minutes before timeout

interface SessionTimeoutProviderProps {
  children: ReactNode
}

export function SessionTimeoutProvider({ children }: SessionTimeoutProviderProps) {
  const { user, signOut } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [lastActivity, setLastActivity] = useState(Date.now())

  const resetTimer = useCallback(() => {
    setLastActivity(Date.now())
    setShowWarning(false)
  }, [])

  const handleStayLoggedIn = () => {
    resetTimer()
  }

  useEffect(() => {
    if (!user) return

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']

    const handleActivity = () => {
      if (!showWarning) {
        setLastActivity(Date.now())
      }
    }

    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [user, showWarning])

  useEffect(() => {
    if (!user) return

    const checkTimeout = setInterval(() => {
      const now = Date.now()
      const elapsed = now - lastActivity

      if (elapsed >= TIMEOUT_DURATION) {
        signOut()
        window.location.href = '/login'
      } else if (elapsed >= TIMEOUT_DURATION - WARNING_BEFORE) {
        setShowWarning(true)
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(checkTimeout)
  }, [user, lastActivity, signOut])

  return (
    <>
      {children}
      <Modal
        isOpen={showWarning}
        onClose={handleStayLoggedIn}
        title="Session Expiring"
        size="sm"
      >
        <div className="text-center">
          <p className="text-gray-600 mb-6">
            Your session will expire in 5 minutes due to inactivity.
          </p>
          <Button onClick={handleStayLoggedIn} size="lg">
            Stay Logged In
          </Button>
        </div>
      </Modal>
    </>
  )
}
