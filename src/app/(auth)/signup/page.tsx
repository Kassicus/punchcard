'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { signUp } from '../actions'

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    const result = await signUp(formData)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">PunchCard</span>
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Create your account</h2>
          <p className="mt-2 text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
              Sign in
            </Link>
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form action={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First name"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  placeholder="John"
                />
                <Input
                  label="Last name"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  placeholder="Doe"
                />
              </div>

              <Input
                label="Email address"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />

              <Input
                label="Password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="At least 6 characters"
              />

              <Input
                label="Confirm password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Confirm your password"
              />

              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
