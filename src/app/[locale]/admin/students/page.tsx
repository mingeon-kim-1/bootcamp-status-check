'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import SettingsModal from '@/components/SettingsModal'

interface PreRegisteredStudent {
  id: string
  name: string
  seatNumber: number
}

interface Student {
  id: string
  name: string | null
  email: string
  seatNumber: number
  status: string
}

export default function AdminStudentsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [preRegistered, setPreRegistered] = useState<PreRegisteredStudent[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSeatNumber, setNewSeatNumber] = useState('')
  const [bulkInput, setBulkInput] = useState('')
  const [showBulkInput, setShowBulkInput] = useState(false)

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
      const [preRegRes, studentsRes] = await Promise.all([
        fetch('/api/admin/preregister'),
        fetch('/api/admin/students'),
      ])
      setPreRegistered(await preRegRes.json())
      setStudents(await studentsRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addPreRegistered = async () => {
    if (!newName.trim() || !newSeatNumber) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/preregister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), seatNumber: parseInt(newSeatNumber) }),
      })
      if (res.ok) {
        setNewName('')
        setNewSeatNumber('')
        fetchData()
      } else {
        const data = await res.json()
        alert(data.message)
      }
    } catch (error) {
      console.error('Error adding pre-registered student:', error)
    } finally {
      setSaving(false)
    }
  }

  const deletePreRegistered = async (seatNumber: number) => {
    if (!confirm('Delete this pre-registration?')) return
    try {
      await fetch(`/api/admin/preregister?seatNumber=${seatNumber}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error deleting:', error)
    }
  }

  const handleBulkImport = async () => {
    if (!bulkInput.trim()) return
    setSaving(true)
    try {
      // Parse bulk input (format: "seatNumber,name" per line)
      const lines = bulkInput.trim().split('\n')
      const students = lines.map(line => {
        const [seatStr, ...nameParts] = line.split(',')
        return {
          seatNumber: parseInt(seatStr.trim()),
          name: nameParts.join(',').trim(),
        }
      }).filter(s => !isNaN(s.seatNumber) && s.name)

      const res = await fetch('/api/admin/preregister', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students }),
      })
      
      if (res.ok) {
        setBulkInput('')
        setShowBulkInput(false)
        fetchData()
      }
    } catch (error) {
      console.error('Error bulk importing:', error)
    } finally {
      setSaving(false)
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
          <Link href={`/${locale}/admin/branding`} className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg transition-colors">{t('admin.branding')}</Link>
          <Link href={`/${locale}/admin/display`} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">{t('admin.display')}</Link>
        </nav>
      </header>

      <main className="p-6 space-y-6">
        {/* Pre-registration Section */}
        <section className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">학생 사전 등록</h2>
              <p className="text-gray-500 dark:text-slate-400 mt-1">학생들이 회원가입할 때 이름이 자동으로 표시됩니다</p>
            </div>
            <button
              onClick={() => setShowBulkInput(!showBulkInput)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {showBulkInput ? '개별 입력' : '일괄 입력'}
            </button>
          </div>

          {showBulkInput ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  일괄 입력 (한 줄에 &quot;좌석번호,이름&quot; 형식)
                </label>
                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder={`1,김철수\n2,이영희\n3,박민수`}
                  className="w-full h-40 px-4 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white"
                />
              </div>
              <button
                onClick={handleBulkImport}
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg transition-colors"
              >
                {saving ? t('common.loading') : '일괄 등록 (기존 데이터 대체)'}
              </button>
            </div>
          ) : (
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('common.seatNumber')}
                </label>
                <input
                  type="number"
                  value={newSeatNumber}
                  onChange={(e) => setNewSeatNumber(e.target.value)}
                  min="1"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white"
                  placeholder="1"
                />
              </div>
              <div className="flex-[2]">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white"
                  placeholder="홍길동"
                />
              </div>
              <button
                onClick={addPreRegistered}
                disabled={saving || !newName.trim() || !newSeatNumber}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg transition-colors"
              >
                {t('common.save')}
              </button>
            </div>
          )}

          {/* Pre-registered List */}
          {preRegistered.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">사전 등록 목록 ({preRegistered.length}명)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {preRegistered.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg"
                  >
                    <div>
                      <span className="font-bold text-amber-800 dark:text-amber-400">{s.seatNumber}</span>
                      <span className="text-gray-700 dark:text-slate-300 ml-2">{s.name}</span>
                    </div>
                    <button
                      onClick={() => deletePreRegistered(s.seatNumber)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Registered Students Section */}
        <section className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('admin.studentManagement')}</h2>
          
          {students.length === 0 ? (
            <p className="text-gray-500 dark:text-slate-400">등록된 학생이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-slate-400">{t('common.seatNumber')}</th>
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-slate-400">이름</th>
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-slate-400">{t('common.email')}</th>
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-slate-400">{t('common.status')}</th>
                    <th className="text-right py-3 px-4 text-gray-600 dark:text-slate-400"></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-gray-100 dark:border-slate-700/50">
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">{student.seatNumber}</td>
                      <td className="py-3 px-4 text-gray-700 dark:text-slate-300">{student.name || '-'}</td>
                      <td className="py-3 px-4 text-gray-700 dark:text-slate-300">{student.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          student.status === 'online' ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400' :
                          student.status === 'need-help' ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400' :
                          'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-400'
                        }`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => resetStudent(student.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
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
