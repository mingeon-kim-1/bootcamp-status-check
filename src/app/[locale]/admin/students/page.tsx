'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import SettingsModal from '@/components/SettingsModal'

interface Student {
  id: string
  seatNumber: number
  status: string
  lastActive: string | null
}

export default function AdminStudentsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

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
      const res = await fetch('/api/admin/students')
      setStudents(await res.json())
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetStudent = async (id: string) => {
    if (!confirm(t('admin.confirmResetStudent'))) return
    try {
      await fetch(`/api/admin/students?id=${id}`, { method: 'DELETE' })
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

  const updateStudentStatus = async (id: string, newStatus: string) => {
    try {
      await fetch('/api/admin/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: id, status: newStatus }),
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

  if (session?.user?.role !== 'admin') return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.dashboard')}</h1>
          <div className="flex items-center gap-4">
            <SettingsModal />
            <button onClick={() => signOut({ callbackUrl: `/${locale}` })} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
              {t('common.logout')}
            </button>
          </div>
        </div>
        <nav className="mt-4 flex gap-4 flex-wrap">
          <Link href={`/${locale}/admin/dashboard`} className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg transition-colors">{t('admin.config')}</Link>
          <Link href={`/${locale}/admin/seats`} className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg transition-colors">{t('admin.seats')}</Link>
          <Link href={`/${locale}/admin/students`} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">{t('admin.studentManagement')}</Link>
          <Link href={`/${locale}/admin/display`} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">{t('admin.display')}</Link>
        </nav>
      </header>

      <main className="p-6">
        {/* Registered Students Section */}
        <section className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('admin.studentManagement')}</h2>
              <p className="text-gray-500 dark:text-slate-400 mt-1">현재 로그인한 학생 목록</p>
            </div>
            {students.length > 0 && (
              <button
                onClick={resetAllStudents}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                {t('admin.resetAll')}
              </button>
            )}
          </div>
          
          {students.length === 0 ? (
            <p className="text-gray-500 dark:text-slate-400">로그인한 학생이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-slate-400">{t('common.seatNumber')}</th>
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-slate-400">{t('common.status')}</th>
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-slate-400">마지막 활동</th>
                    <th className="text-right py-3 px-4 text-gray-600 dark:text-slate-400">{t('common.edit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-gray-100 dark:border-slate-700/50">
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-white text-lg">{student.seatNumber}번</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          student.status === 'online' ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400' :
                          student.status === 'need-help' ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400' :
                          'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-400'
                        }`}>
                          {student.status === 'online' ? t('common.ready') :
                           student.status === 'need-help' ? t('common.needHelp') :
                           t('common.absent')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-slate-400 text-sm">
                        {student.lastActive ? new Date(student.lastActive).toLocaleString('ko-KR') : '-'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
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
