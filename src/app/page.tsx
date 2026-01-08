import Link from 'next/link'
import { Button } from '@/components/ui'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="flex items-center justify-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">PunchCard</h1>
        </div>

        <p className="text-gray-600 mb-8">Time tracking for your team</p>

        <div className="flex flex-col space-y-3 w-64 mx-auto">
          <Link href="/login">
            <Button className="w-full" size="lg">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button variant="secondary" className="w-full" size="lg">Create Account</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
