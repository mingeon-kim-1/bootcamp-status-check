'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import SettingsModal from '@/components/SettingsModal'

interface Student {
  id: string
  email: string
  seatNumber: number
  status: string
  lastActive: string | null
}

interface Config {
  seatsPerRow: number
  totalRows: number
  seatDirection: string
  displayTitle: string
  useCustomLayout: boolean
}

export default function AdminDashboardPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated' || (session?.user?.role !== 'admin')) {
      router.push(`/${locale}/admin/login`)
    }
  }, [status, session, router, locale])

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchData()
    }
  }, [session])

  const fetchData = async () => {
    try {
      const [studentsRes, configRes] = await Promise.all([
        fetch('/api/admin/students'),
        fetch('/api/admin/config'),
      ])
      
      setStudents(await studentsRes.json())
      setConfig(await configRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfigChange = (field: keyof Config, value: string | number | boolean) => {
    if (!config) return
    setConfig({ ...config, [field]: value })
  }

  const saveConfig = async () => {
    if (!config) return
    setSaving(true)
    try {
      await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
    } catch (error) {
      console.error('Error saving config:', error)
    } finally {
      setSaving(false)
    }
  }

  const resetStudent = async (studentId: string) => {
    if (!confirm(t('admin.confirmResetStudent'))) return
    try {
      await fetch(`/api/admin/students?id=${studentId}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error resetting student:', error)
    }
  }

  const resetAllStudents = async () => {
    if (!confirm(t('admin.confirmResetAll'))) return
    try {
      await fetch('/api/admin/students?all=true', { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error resetting all students:', error)
    }
  }

  const updateStudentStatus = async (studentId: string, status: string) => {
    try {
      await fetch('/api/admin/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, status }),
      })
      fetchData()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-gray-700 dark:text-white text-xl">{t('common.loading')}</div>
      </div>
    )
  }

  if (session?.user?.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.dashboard')}</h1>
          <div className="flex items-center gap-4">
            <SettingsModal />
            <button
              onClick={() => signOut({ callbackUrl: `/${locale}` })}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              {t('common.logout')}
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="mt-4 flex gap-4 flex-wrap">
          <Link
            href={`/${locale}/admin/dashboard`}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            {t('admin.config')}
          </Link>
          <Link
            href={`/${locale}/admin/seats`}
            className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg transition-colors"
          >
            {t('admin.seats')}
          </Link>
          <Link
            href={`/${locale}/admin/students`}
            className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg transition-colors"
          >
            {t('admin.studentManagement')}
          </Link>
          <Link
            href={`/${locale}/admin/branding`}
            className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg transition-colors"
          >
            {t('admin.branding')}
          </Link>
          <Link
            href={`/${locale}/admin/display`}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            {t('admin.display')}
          </Link>
        </nav>
      </header>

      <main className="p-6 space-y-8">
        {/* Configuration */}
        {config && (
          <section className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('admin.config')}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('admin.displayTitle')}
                </label>
                <input
                  type="text"
                  value={config.displayTitle}
                  onChange={(e) => handleConfigChange('displayTitle', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('admin.seatsPerRow')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={config.seatsPerRow}
                  onChange={(e) => handleConfigChange('seatsPerRow', parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('admin.totalRows')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={config.totalRows}
                  onChange={(e) => handleConfigChange('totalRows', parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('admin.seatDirection')}
                </label>
                <select
                  value={config.seatDirection}
                  onChange={(e) => handleConfigChange('seatDirection', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="bottom-right-horizontal">{t('admin.seatDirections.bottom-right-horizontal')}</option>
                  <option value="bottom-left-horizontal">{t('admin.seatDirections.bottom-left-horizontal')}</option>
                  <option value="top-right-horizontal">{t('admin.seatDirections.top-right-horizontal')}</option>
                  <option value="top-left-horizontal">{t('admin.seatDirections.top-left-horizontal')}</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <label className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={config.useCustomLayout}
                  onChange={(e) => handleConfigChange('useCustomLayout', e.target.checked)}
                  className="w-5 h-5 rounded bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                />
                {t('admin.useCustomLayout')}
              </label>

              <button
                onClick={saveConfig}
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white rounded-lg transition-colors"
              >
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </section>
        )}

        {/* Student Management */}
        <section className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('admin.studentManagement')}</h2>
            <button
              onClick={resetAllStudents}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              {t('admin.resetAll')}
            </button>
          </div>

          {students.length === 0 ? (
            <p className="text-gray-500 dark:text-slate-400">{t('display.noStudents')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">
                    <th className="pb-3 pr-4">{t('common.seatNumber')}</th>
                    <th className="pb-3 pr-4">{t('common.email')}</th>
                    <th className="pb-3 pr-4">{t('common.status')}</th>
                    <th className="pb-3">{t('common.edit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-gray-100 dark:border-slate-700/50">
                      <td className="py-3 pr-4 text-gray-900 dark:text-white font-medium">{student.seatNumber}</td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-slate-300">{student.email}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            student.status === 'online'
                              ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                              : student.status === 'need-help'
                              ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                              : 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {student.status === 'online'
                            ? t('common.ready')
                            : student.status === 'need-help'
                            ? t('common.needHelp')
                            : t('common.absent')}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          {student.status === 'need-help' && (
                            <button
                              onClick={() => updateStudentStatus(student.id, 'online')}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                            >
                              {t('student.markReady')}
                            </button>
                          )}
                          <button
                            onClick={() => resetStudent(student.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                          >
                            {t('admin.resetStudent')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
