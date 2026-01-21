'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import SettingsModal from '@/components/SettingsModal'

export default function StudentSignupPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations()
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [seatNumber, setSeatNumber] = useState('')
  const [preRegisteredName, setPreRegisteredName] = useState<string | null>(null)
  const [seatTaken, setSeatTaken] = useState(false)

  // Check seat number when it changes
  useEffect(() => {
    const checkSeat = async () => {
      if (!seatNumber || parseInt(seatNumber) < 1) {
        setPreRegisteredName(null)
        setSeatTaken(false)
        return
      }

      try {
        const res = await fetch(`/api/student/check-seat?seatNumber=${seatNumber}`)
        const data = await res.json()
        
        if (data.taken) {
          setSeatTaken(true)
          setPreRegisteredName(null)
        } else if (data.preRegistered) {
          setSeatTaken(false)
          setPreRegisteredName(data.name)
        } else {
          setSeatTaken(false)
          setPreRegisteredName(null)
        }
      } catch {
        // Ignore errors
      }
    }

    const timer = setTimeout(checkSeat, 300)
    return () => clearTimeout(timer)
  }, [seatNumber])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      setLoading(false)
      return
    }

    if (!email || !email.includes('@')) {
      setError(t('auth.invalidEmail'))
      setLoading(false)
      return
    }

    const seatNum = parseInt(seatNumber)
    if (isNaN(seatNum) || seatNum < 1) {
      setError(t('auth.invalidSeatNumber'))
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/student/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, seatNumber: seatNum, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.code === 'EMAIL_EXISTS') {
          setError(t('auth.emailExists'))
        } else if (data.code === 'SEAT_TAKEN') {
          setError(t('auth.seatTaken'))
        } else {
          setError(data.message || t('common.error'))
        }
        setLoading(false)
        return
      }

      router.push(`/${locale}/student/login?registered=true`)
    } catch {
      setError(t('common.error'))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50 to-gray-100 dark:from-slate-900 dark:via-emerald-950 dark:to-slate-900 flex flex-col transition-colors">
      <header className="p-6 flex justify-between items-center">
        <Link href={`/${locale}`} className="text-gray-700 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors">
          ← {t('common.appName')}
        </Link>
        <SettingsModal />
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-white/20">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              {t('auth.studentSignupTitle')}
            </h1>
            
            {/* Welcome message for pre-registered students */}
            {preRegisteredName && (
              <div className="mb-6 p-4 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/50 rounded-xl text-center">
                <p className="text-emerald-800 dark:text-emerald-200 font-medium">
                  🎉 {t('auth.welcomePreregistered') || `환영합니다, ${preRegisteredName}님!`}
                </p>
                <p className="text-emerald-700 dark:text-emerald-300 text-sm mt-1">
                  {preRegisteredName}
                </p>
              </div>
            )}

            {!preRegisteredName && <div className="mb-6" />}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="seatNumber" className="block text-sm font-medium text-gray-700 dark:text-emerald-200 mb-2">
                  {t('common.seatNumber')}
                </label>
                <input
                  type="number"
                  id="seatNumber"
                  name="seatNumber"
                  min="1"
                  required
                  value={seatNumber}
                  onChange={(e) => setSeatNumber(e.target.value)}
                  className={`w-full px-4 py-3 bg-white dark:bg-white/10 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                    seatTaken 
                      ? 'border-red-500 dark:border-red-500' 
                      : preRegisteredName 
                        ? 'border-emerald-500 dark:border-emerald-500' 
                        : 'border-gray-300 dark:border-white/20'
                  }`}
                  placeholder="1"
                />
                {seatTaken && (
                  <p className="text-red-500 text-sm mt-1">{t('auth.seatTaken')}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-emerald-200 mb-2">
                  {t('common.email')}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="student@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-emerald-200 mb-2">
                  {t('common.password')}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  minLength={4}
                  className="w-full px-4 py-3 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-emerald-200 mb-2">
                  {t('common.confirmPassword')}
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  minLength={4}
                  className="w-full px-4 py-3 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-200 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || seatTaken}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 dark:disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all"
              >
                {loading ? t('common.loading') : t('common.signup')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href={`/${locale}/student/login`}
                className="text-emerald-600 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-white transition-colors underline underline-offset-4"
              >
                {t('common.login')}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
