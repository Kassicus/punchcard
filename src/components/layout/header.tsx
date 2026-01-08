'use client'

import Link from 'next/link'
import { useAuth } from '@/components/providers'
import { Button } from '@/components/ui'
import { useRouter } from 'next/navigation'

export function Header() {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href={user ? '/dashboard' : '/'} className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">PunchCard</span>
            </Link>

            {user && (
              <nav className="hidden md:flex items-center space-x-4">
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100">
                  Dashboard
                </Link>
                <Link href="/history" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100">
                  History
                </Link>
                {profile?.role === 'admin' && (
                  <Link href="/admin" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100">
                    Admin
                  </Link>
                )}
              </nav>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/settings" className="text-gray-600 hover:text-gray-900">
                  <span className="hidden sm:inline">{profile?.first_name} {profile?.last_name}</span>
                </Link>
                <Button variant="ghost" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/signup">
                  <Button>Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
