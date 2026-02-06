'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import StatusDisplayContent, { type StatusData } from '@/components/StatusDisplayContent'

export default function ViewClient() {
  const t = useTranslations()
  const [data, setData] = useState<StatusData | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/status', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error('Error fetching status:', error)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [fetchData])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center transition-colors">
        <div className="text-gray-700 dark:text-white text-xl">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col transition-colors"
    >
      <header className="p-4 md:p-6 flex items-center justify-between border-b border-gray-200 dark:border-slate-800">
        <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white">
          {data.config.displayTitle}
        </h1>
        <button
          onClick={toggleFullscreen}
          className="px-4 py-2 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-700 dark:text-white rounded-lg transition-colors"
        >
          {isFullscreen ? t('common.exitFullscreen') : t('common.fullscreen')}
        </button>
      </header>

      <main className="flex-1 p-4 md:p-8 flex flex-col">
        <StatusDisplayContent data={data} isFullscreen={isFullscreen} />
      </main>
    </div>
  )
}
