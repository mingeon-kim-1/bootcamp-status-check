'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import SettingsModal from '@/components/SettingsModal'

interface StudentStatus {
  id: string
  seatNumber: number
  status: string
  lastActive: string | null
}

interface Announcement {
  content: string | null
  isActive: boolean
}

export default function StudentDashboardPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations()
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [studentData, setStudentData] = useState<StudentStatus | null>(null)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (sessionStatus === 'unauthenticated' || (session?.user?.role !== 'student')) {
      router.push(`/${locale}/student/login`)
    }
  }, [sessionStatus, session, router, locale])

  useEffect(() => {
    if (session?.user?.role === 'student') {
      fetchData()
    }
  }, [session])

  // Real-time announcement polling
  useEffect(() => {
    if (session?.user?.role === 'student') {
      const fetchAnnouncement = async () => {
        try {
          const res = await fetch('/api/admin/announcement', { cache: 'no-store' })
          if (res.ok) {
            setAnnouncement(await res.json())
          }
        } catch (error) {
          console.error('Error fetching announcement:', error)
        }
      }

      // Poll every 3 seconds for real-time updates
      const interval = setInterval(fetchAnnouncement, 3000)
      return () => clearInterval(interval)
    }
  }, [session])

  const fetchData = async () => {
    try {
      const [statusRes, announcementRes] = await Promise.all([
        fetch('/api/student/status'),
        fetch('/api/admin/announcement', { cache: 'no-store' }),
      ])
      
      if (statusRes.ok) {
        setStudentData(await statusRes.json())
      }
      if (announcementRes.ok) {
        setAnnouncement(await announcementRes.json())
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (newStatus: 'online' | 'need-help') => {
    setUpdating(true)
    try {
      const res = await fetch('/api/student/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const data = await res.json()
        setStudentData(prev => prev ? { ...prev, status: data.status } : null)
      }
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setUpdating(false)
    }
  }

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50 to-gray-100 dark:from-slate-900 dark:via-emerald-950 dark:to-slate-900 flex items-center justify-center transition-colors">
        <div className="text-gray-700 dark:text-white text-xl">{t('common.loading')}</div>
      </div>
    )
  }

  if (session?.user?.role !== 'student' || !studentData) {
    return null
  }

  const isNeedHelp = studentData.status === 'need-help'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50 to-gray-100 dark:from-slate-900 dark:via-emerald-950 dark:to-slate-900 flex flex-col transition-colors">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <Link href={`/${locale}`} className="text-gray-700 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors">
          ← {t('common.appName')}
        </Link>
        <div className="flex items-center gap-4">
          <SettingsModal />
          <button
            onClick={() => signOut({ callbackUrl: `/${locale}` })}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            {t('common.logout')}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-white/20">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              {t('student.dashboard')}
            </h1>

            {/* Seat Info */}
            <div className="text-center mb-6">
              <div className="text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-1">{t('student.yourSeat')}</div>
              <div className="text-6xl font-bold text-gray-900 dark:text-white">{studentData.seatNumber}</div>
            </div>

            {/* Attendance Verified Badge */}
            <div className="mb-6 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg text-center">
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                ✓ 출석 완료
              </span>
            </div>

            {/* Announcement with smooth transition */}
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
              announcement?.isActive && announcement?.content 
                ? 'max-h-96 opacity-100 mb-6' 
                : 'max-h-0 opacity-0 mb-0'
            }`}>
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📢</span>
                  <div>
                    <h3 className="font-semibold text-blue-800 dark:text-blue-400 mb-1">공지사항</h3>
                    <p className="text-blue-700 dark:text-blue-300 text-sm whitespace-pre-wrap">
                      {announcement?.content || ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="text-center mb-6">
              <div className="text-gray-500 dark:text-slate-400 text-sm mb-2">{t('student.currentStatus')}</div>
              <div
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${
                  isNeedHelp
                    ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/50 animate-pulse'
                    : 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-500/50'
                }`}
              >
                <span
                  className={`w-3 h-3 rounded-full ${
                    isNeedHelp ? 'bg-red-500' : 'bg-green-500'
                  }`}
                />
                {isNeedHelp ? t('common.needHelp') : t('common.ready')}
              </div>
            </div>

            {/* Status Message */}
            <p className="text-center text-gray-600 dark:text-slate-300 mb-8">
              {isNeedHelp ? t('student.helpRequested') : t('student.youAreReady')}
            </p>

            {/* Action Buttons */}
            <div className="space-y-4">
              {isNeedHelp ? (
                <button
                  onClick={() => updateStatus('online')}
                  disabled={updating}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 dark:disabled:bg-green-800 text-white font-semibold rounded-xl transition-all text-lg"
                >
                  {updating ? t('common.loading') : t('student.markReady')}
                </button>
              ) : (
                <button
                  onClick={() => updateStatus('need-help')}
                  disabled={updating}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 dark:disabled:bg-red-800 text-white font-semibold rounded-xl transition-all text-lg"
                >
                  {updating ? t('common.loading') : t('student.requestHelp')}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
