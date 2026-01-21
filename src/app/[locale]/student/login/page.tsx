'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import SettingsModal from '@/components/SettingsModal'

interface SeatPosition {
  seatNumber: number
  gridRow: number
  gridCol: number
}

interface Config {
  seatsPerRow: number
  totalRows: number
  useCustomLayout: boolean
}

export default function StudentLoginPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations()
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [seatNumber, setSeatNumber] = useState<number | null>(null)
  const [attendanceCode, setAttendanceCode] = useState('')
  const [config, setConfig] = useState<Config | null>(null)
  const [seatPositions, setSeatPositions] = useState<SeatPosition[]>([])
  const [fetchingConfig, setFetchingConfig] = useState(true)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/status')
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config)
        setSeatPositions(data.seatPositions || [])
      }
    } catch (error) {
      console.error('Error fetching config:', error)
    } finally {
      setFetchingConfig(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!seatNumber) {
      setError('좌석을 선택해주세요')
      return
    }
    if (attendanceCode.length !== 4) {
      setError('4자리 출석 코드를 입력해주세요')
      return
    }

    setLoading(true)
    setError('')

    const result = await signIn('student-login', {
      seatNumber: seatNumber.toString(),
      attendanceCode,
      redirect: false,
    })

    if (result?.error) {
      setError('출석 코드가 올바르지 않습니다')
      setLoading(false)
    } else {
      router.push(`/${locale}/student/dashboard`)
    }
  }

  // Get available seat numbers
  const getAvailableSeats = (): number[] => {
    if (!config) return []
    
    if (config.useCustomLayout && seatPositions.length > 0) {
      return seatPositions.map(sp => sp.seatNumber).sort((a, b) => a - b)
    } else {
      const total = config.seatsPerRow * config.totalRows
      return Array.from({ length: total }, (_, i) => i + 1)
    }
  }

  const availableSeats = getAvailableSeats()

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              {t('auth.studentLoginTitle')}
            </h1>

            {fetchingConfig ? (
              <div className="text-center text-gray-500 dark:text-slate-400">
                {t('common.loading')}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Seat Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-emerald-200 mb-2">
                    {t('common.seatNumber')}
                  </label>
                  <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
                    {availableSeats.map((seat) => (
                      <button
                        key={seat}
                        type="button"
                        onClick={() => setSeatNumber(seat)}
                        className={`p-3 rounded-lg font-bold text-sm transition-all ${
                          seatNumber === seat
                            ? 'bg-emerald-500 text-white scale-105 shadow-lg'
                            : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-white hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-gray-200 dark:border-slate-600'
                        }`}
                      >
                        {seat}
                      </button>
                    ))}
                  </div>
                  {seatNumber && (
                    <p className="mt-2 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                      선택된 좌석: {seatNumber}번
                    </p>
                  )}
                </div>

                {/* Attendance Code */}
                <div>
                  <label htmlFor="attendanceCode" className="block text-sm font-medium text-gray-700 dark:text-emerald-200 mb-2">
                    출석 코드 (4자리)
                  </label>
                  <input
                    type="text"
                    id="attendanceCode"
                    maxLength={4}
                    value={attendanceCode}
                    onChange={(e) => setAttendanceCode(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full px-4 py-4 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl text-gray-900 dark:text-white text-center text-2xl font-bold tracking-widest placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="0000"
                  />
                </div>

                {error && (
                  <div className="bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-200 px-4 py-3 rounded-xl text-sm text-center">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !seatNumber || attendanceCode.length !== 4}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 dark:disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all text-lg"
                >
                  {loading ? t('common.loading') : t('common.login')}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
