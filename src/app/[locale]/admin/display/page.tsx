'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import SettingsModal from '@/components/SettingsModal'

interface Student {
  id: string
  name: string | null
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
  corridorAfterRows: number[]
  corridorAfterCols: number[]
}

interface Branding {
  displayImagePath: string | null
  displayText: string | null
  organizationName: string | null
}

interface SeatPosition {
  seatNumber: number
  gridRow: number
  gridCol: number
  label?: string
}

interface StatusData {
  students: Student[]
  config: Config
  branding: Branding | null
  seatPositions: SeatPosition[]
}

export default function DisplayPage() {
  const t = useTranslations()
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const [data, setData] = useState<StatusData | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/status', { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
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
    
    // Poll for updates every 2 seconds
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

  const getStatusCounts = () => {
    if (!data) return { online: 0, needHelp: 0, absent: 0 }
    
    const online = data.students.filter(s => s.status === 'online').length
    const needHelp = data.students.filter(s => s.status === 'need-help').length
    const totalSeats = data.config.seatsPerRow * data.config.totalRows
    const absent = totalSeats - online - needHelp
    
    return { online, needHelp, absent }
  }

  const counts = getStatusCounts()

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center transition-colors">
        <div className="text-gray-700 dark:text-white text-xl">{t('common.loading')}</div>
      </div>
    )
  }

  const studentMap = new Map(data.students.map(s => [s.seatNumber, s]))
  const customPositionMap = new Map(
    data.seatPositions.map(sp => [`${sp.gridRow}-${sp.gridCol}`, sp])
  )

  const getSeatNumberForPosition = (row: number, col: number): number => {
    const { seatsPerRow, totalRows, seatDirection } = data.config
    switch (seatDirection) {
      case 'bottom-right-horizontal':
        return (row * seatsPerRow) + (seatsPerRow - col)
      case 'bottom-left-horizontal':
        return (row * seatsPerRow) + col + 1
      case 'top-right-horizontal':
        return ((totalRows - 1 - row) * seatsPerRow) + (seatsPerRow - col)
      case 'top-left-horizontal':
        return ((totalRows - 1 - row) * seatsPerRow) + col + 1
      default:
        return (row * seatsPerRow) + (seatsPerRow - col)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'border-emerald-500 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
      case 'need-help':
        return 'border-red-500 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 animate-pulse'
      default:
        return 'border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700/50 text-gray-500 dark:text-slate-500'
    }
  }

  const hasRowCorridorAfter = (row: number) => {
    return data.config.corridorAfterRows?.includes(row) || false
  }

  const hasColCorridorAfter = (col: number) => {
    return data.config.corridorAfterCols?.includes(col) || false
  }

  // Build the grid matching admin seats page style
  const renderGrid = () => {
    const elements: JSX.Element[] = []
    
    for (let displayRow = data.config.totalRows - 1; displayRow >= 0; displayRow--) {
      // Add row of seats with column corridors
      const cells: JSX.Element[] = []
      
      for (let col = 0; col < data.config.seatsPerRow; col++) {
        let seatNumber: number | null = null

        if (data.config.useCustomLayout) {
          const customSeat = customPositionMap.get(`${displayRow}-${col}`)
          seatNumber = customSeat?.seatNumber || null
        } else {
          seatNumber = getSeatNumberForPosition(displayRow, col)
        }

        const student = seatNumber ? studentMap.get(seatNumber) : null
        const status = student?.status || 'offline'

        cells.push(
          <div
            key={`${displayRow}-${col}`}
            className={`w-14 h-14 md:w-16 md:h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
              seatNumber 
                ? getStatusColor(status) 
                : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/30 text-gray-400 dark:text-slate-600'
            } ${isFullscreen ? 'w-24 h-24' : ''}`}
          >
            {seatNumber && (
              <>
                <span className={`font-bold ${isFullscreen ? 'text-xl' : 'text-sm'}`}>
                  {seatNumber}
                </span>
                {student?.name && (
                  <span className={`truncate max-w-full px-1 ${isFullscreen ? 'text-xs' : 'text-[10px]'} opacity-80`}>
                    {student.name}
                  </span>
                )}
              </>
            )}
          </div>
        )

        // Add column corridor if needed (single line)
        if (hasColCorridorAfter(col) && col < data.config.seatsPerRow - 1) {
          cells.push(
            <div
              key={`col-corridor-${displayRow}-${col}`}
              className="w-[2px] bg-amber-500 dark:bg-amber-500/50 self-stretch mx-1"
            />
          )
        }
      }
      
      elements.push(
        <div 
          key={`row-${displayRow}`} 
          className="flex gap-2 items-center justify-center"
        >
          {cells}
          <span className="text-gray-500 dark:text-slate-500 text-sm ml-2 w-16">Row {displayRow + 1}</span>
        </div>
      )
      
      // Add row corridor if exists after this row (single line)
      if (hasRowCorridorAfter(displayRow) && displayRow > 0) {
        elements.push(
          <div 
            key={`corridor-${displayRow}`} 
            className="h-[2px] bg-amber-500 dark:bg-amber-500/50 my-1 mx-auto"
            style={{ width: `${data.config.seatsPerRow * 72 + (data.config.seatsPerRow - 1) * 8}px` }}
          />
        )
      }
    }
    
    return elements
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col transition-colors"
    >
      {/* Header */}
      <header className="p-4 md:p-6 flex items-center justify-between border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          {!isFullscreen && (
            <button
              onClick={() => router.push(`/${locale}/admin/dashboard`)}
              className="px-4 py-2 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-700 dark:text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <span>←</span>
              <span>{t('common.back')}</span>
            </button>
          )}
          {data.branding?.displayImagePath && (
            <div className="relative w-12 h-12 md:w-16 md:h-16">
              <Image
                src={data.branding.displayImagePath}
                alt="Logo"
                fill
                className="object-contain"
              />
            </div>
          )}
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white">
              {data.config.displayTitle}
            </h1>
            {data.branding?.organizationName && (
              <p className="text-gray-500 dark:text-slate-400 text-sm md:text-base">
                {data.branding.organizationName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!isFullscreen && (
            <>
              <SettingsModal />
              <LanguageSwitcher />
            </>
          )}
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-700 dark:text-white rounded-lg transition-colors"
          >
            {isFullscreen ? t('common.exitFullscreen') : t('common.fullscreen')}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 flex flex-col">
        {/* Front of Room indicator */}
        <div className="text-gray-500 dark:text-slate-500 text-sm mb-4 text-center">↑ {t('common.frontOfRoom') || 'Front of Room'} ↑</div>

        {/* Status Summary */}
        <div className="flex justify-center gap-4 md:gap-8 mb-6 md:mb-8">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg border border-emerald-300 dark:border-emerald-500/30">
            <div className="w-4 h-4 rounded border-2 border-emerald-500 bg-emerald-200 dark:bg-emerald-500/20"></div>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              {t('common.ready')}: {counts.online}
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-500/20 rounded-lg border border-red-300 dark:border-red-500/30">
            <div className="w-4 h-4 rounded border-2 border-red-500 bg-red-200 dark:bg-red-500/20 animate-pulse"></div>
            <span className="text-red-700 dark:text-red-400 font-semibold">
              {t('common.needHelp')}: {counts.needHelp}
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-500/20 rounded-lg border border-gray-300 dark:border-slate-500/30">
            <div className="w-4 h-4 rounded border-2 border-gray-400 dark:border-slate-600 bg-gray-200 dark:bg-slate-700/50"></div>
            <span className="text-gray-600 dark:text-slate-400 font-semibold">
              {t('common.absent')}: {counts.absent}
            </span>
          </div>
        </div>

        {/* Status Grid with Corridors */}
        <div className="flex-1 flex items-center justify-center overflow-auto">
          <div className="flex flex-col gap-2">
            {renderGrid()}
          </div>
        </div>

        {/* Back of Room indicator */}
        <div className="text-gray-500 dark:text-slate-500 text-sm mt-4 text-center">↓ {t('common.backOfRoom') || 'Back of Room'} ↓</div>
      </main>
    </div>
  )
}
