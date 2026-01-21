'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Image from 'next/image'
import LanguageSwitcher from '@/components/LanguageSwitcher'

interface Branding {
  loginImagePath: string | null
  loginText: string | null
  displayImagePath: string | null
  displayText: string | null
  organizationName: string | null
}

export default function AdminBrandingPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [branding, setBranding] = useState<Branding | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'login' | 'display' | null>(null)
  
  const loginFileRef = useRef<HTMLInputElement>(null)
  const displayFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated' || (session?.user?.role !== 'admin')) {
      router.push(`/${locale}/admin/login`)
    }
  }, [status, session, router, locale])

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchBranding()
    }
  }, [session])

  const fetchBranding = async () => {
    try {
      const res = await fetch('/api/admin/branding')
      setBranding(await res.json())
    } catch (error) {
      console.error('Error fetching branding:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (type: 'login' | 'display', file: File) => {
    setUploading(type)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setBranding(prev => prev ? {
          ...prev,
          [type === 'login' ? 'loginImagePath' : 'displayImagePath']: data.path
        } : null)
      }
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(null)
    }
  }

  const removeImage = async (type: 'login' | 'display') => {
    const path = type === 'login' ? branding?.loginImagePath : branding?.displayImagePath
    if (!path) return

    try {
      await fetch(`/api/upload?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
      setBranding(prev => prev ? {
        ...prev,
        [type === 'login' ? 'loginImagePath' : 'displayImagePath']: null
      } : null)
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const saveBranding = async () => {
    if (!branding) return
    setSaving(true)
    try {
      await fetch('/api/admin/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding),
      })
    } catch (error) {
      console.error('Error saving branding:', error)
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">{t('common.loading')}</div>
      </div>
    )
  }

  if (session?.user?.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">{t('admin.dashboard')}</h1>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
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
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            {t('admin.config')}
          </Link>
          <Link
            href={`/${locale}/admin/seats`}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            {t('admin.seats')}
          </Link>
          <Link
            href={`/${locale}/admin/students`}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            {t('admin.studentManagement')}
          </Link>
          <Link
            href={`/${locale}/admin/branding`}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
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
        {branding && (
          <>
            {/* Organization Name */}
            <section className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">{t('admin.organizationName')}</h2>
              <input
                type="text"
                value={branding.organizationName || ''}
                onChange={(e) => setBranding({ ...branding, organizationName: e.target.value })}
                className="w-full max-w-md px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Organization Name"
              />
            </section>

            {/* Login Screen Branding */}
            <section className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">{t('admin.loginImage')}</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    {branding.loginImagePath ? (
                      <div className="relative w-full h-48 bg-slate-700 rounded-lg overflow-hidden">
                        <Image
                          src={branding.loginImagePath}
                          alt="Login Image"
                          fill
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-slate-700 rounded-lg flex items-center justify-center">
                        <span className="text-slate-500">No image uploaded</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={loginFileRef}
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => e.target.files?.[0] && handleUpload('login', e.target.files[0])}
                      className="hidden"
                    />
                    <button
                      onClick={() => loginFileRef.current?.click()}
                      disabled={uploading === 'login'}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white rounded-lg transition-colors"
                    >
                      {uploading === 'login' ? t('common.loading') : t('admin.uploadImage')}
                    </button>
                    {branding.loginImagePath && (
                      <button
                        onClick={() => removeImage('login')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        {t('admin.removeImage')}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('admin.loginText')}
                  </label>
                  <textarea
                    value={branding.loginText || ''}
                    onChange={(e) => setBranding({ ...branding, loginText: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Welcome message for login screen"
                  />
                </div>
              </div>
            </section>

            {/* Display Screen Branding */}
            <section className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">{t('admin.displayImage')}</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    {branding.displayImagePath ? (
                      <div className="relative w-full h-48 bg-slate-700 rounded-lg overflow-hidden">
                        <Image
                          src={branding.displayImagePath}
                          alt="Display Image"
                          fill
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-slate-700 rounded-lg flex items-center justify-center">
                        <span className="text-slate-500">No image uploaded</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={displayFileRef}
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => e.target.files?.[0] && handleUpload('display', e.target.files[0])}
                      className="hidden"
                    />
                    <button
                      onClick={() => displayFileRef.current?.click()}
                      disabled={uploading === 'display'}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white rounded-lg transition-colors"
                    >
                      {uploading === 'display' ? t('common.loading') : t('admin.uploadImage')}
                    </button>
                    {branding.displayImagePath && (
                      <button
                        onClick={() => removeImage('display')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        {t('admin.removeImage')}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('admin.displayText')}
                  </label>
                  <textarea
                    value={branding.displayText || ''}
                    onChange={(e) => setBranding({ ...branding, displayText: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Text shown on status display"
                  />
                </div>
              </div>
            </section>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={saveBranding}
                disabled={saving}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-semibold rounded-lg transition-colors"
              >
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
