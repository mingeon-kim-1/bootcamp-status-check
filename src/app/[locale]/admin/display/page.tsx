'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import SettingsModal from '@/components/SettingsModal'

interface Student {
  id: string
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

interface SeatPosition {
  seatNumber: number
  gridRow: number
  gridCol: number
  label?: string
}

interface StatusData {
  students: Student[]
  config: Config
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
    if (!data) return { online: 0, needHelp: 0, absent: 0, total: 0 }
    
    const online = data.students.filter(s => s.status === 'online').length
    const needHelp = data.students.filter(s => s.status === 'need-help').length
    
    // Calculate total seats based on custom layout if enabled
    let totalSeats: number
    if (data.config.useCustomLayout) {
      // Only count seats that have been manually assigned
      totalSeats = data.seatPositions.length
    } else {
      totalSeats = data.config.seatsPerRow * data.config.totalRows
    }
    
    const absent = totalSeats - online - needHelp
    
    return { online, needHelp, absent, total: totalSeats }
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

  // Calculate grid dimensions
  const cellSize = isFullscreen ? 96 : 64 // w-24 = 96px, w-16 = 64px
  const gap = 8 // gap-2 = 8px
  const corridorWidth = 6 // Wider corridor line

  // Build the grid with continuous corridor lines
  const renderGrid = () => {
    const seats: JSX.Element[] = []
    const rowLabels: JSX.Element[] = []
    
    // Calculate column positions accounting for corridors
    const getColPosition = (col: number) => {
      let pos = col * (cellSize + gap)
      // Add corridor widths for corridors before this column
      for (let c = 0; c < col; c++) {
        if (hasColCorridorAfter(c)) {
          pos += corridorWidth + gap
        }
      }
      return pos
    }

    // Calculate row positions accounting for corridors (rows are reversed for display)
    const getRowPosition = (displayRow: number) => {
      const actualRow = data.config.totalRows - 1 - displayRow
      let pos = actualRow * (cellSize + gap)
      // Add corridor widths for corridors after rows above this one
      for (let r = data.config.totalRows - 1; r > displayRow; r--) {
        if (hasRowCorridorAfter(r)) {
          pos += corridorWidth + gap
        }
      }
      return pos
    }

    // Render seats
    for (let displayRow = data.config.totalRows - 1; displayRow >= 0; displayRow--) {
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

        // In custom layout mode, skip cells without assigned seats
        if (data.config.useCustomLayout && !seatNumber) {
          continue
        }

        seats.push(
          <div
            key={`seat-${displayRow}-${col}`}
            className={`absolute rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-500 ease-in-out transform hover:scale-105 ${
              seatNumber 
                ? getStatusColor(status) 
                : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/30 text-gray-400 dark:text-slate-600'
            } ${status === 'need-help' ? 'scale-105 shadow-lg shadow-red-500/50 dark:shadow-red-500/30' : ''}`}
            style={{
              width: cellSize,
              height: cellSize,
              left: getColPosition(col),
              top: getRowPosition(displayRow),
            }}
          >
            {seatNumber && (
              <span className={`font-bold ${isFullscreen ? 'text-xl' : 'text-sm'}`}>
                {seatNumber}
              </span>
            )}
          </div>
        )
      }

      // Row label
      const lastColPos = getColPosition(data.config.seatsPerRow - 1)
      rowLabels.push(
        <span 
          key={`label-${displayRow}`}
          className="absolute text-gray-500 dark:text-slate-500 text-sm whitespace-nowrap"
          style={{
            left: lastColPos + cellSize + 12,
            top: getRowPosition(displayRow) + cellSize / 2 - 10,
          }}
        >
          Row {displayRow + 1}
        </span>
      )
    }

    // Calculate total grid dimensions
    const totalWidth = getColPosition(data.config.seatsPerRow - 1) + cellSize
    const totalHeight = getRowPosition(0) + cellSize

    // Render continuous vertical corridors (centered between columns)
    const verticalCorridors = data.config.corridorAfterCols?.map(col => {
      if (col >= data.config.seatsPerRow - 1) return null
      // Position corridor in the center of the gap space: cellEnd + gap + corridorWidth/2
      const xPos = getColPosition(col) + cellSize + gap + corridorWidth / 2
      return (
        <div
          key={`v-corridor-${col}`}
          className="absolute bg-amber-500 dark:bg-amber-400 rounded-full"
          style={{
            width: corridorWidth,
            height: totalHeight,
            left: xPos - corridorWidth / 2,
            top: 0,
          }}
        />
      )
    }) || []

    // Render continuous horizontal corridors (centered between rows)
    const horizontalCorridors = data.config.corridorAfterRows?.map(row => {
      if (row <= 0) return null
      // Position corridor in the center of the gap space: rowEnd + gap + corridorWidth/2
      const yPos = getRowPosition(row) - gap - corridorWidth / 2
      return (
        <div
          key={`h-corridor-${row}`}
          className="absolute bg-amber-500 dark:bg-amber-400 rounded-full"
          style={{
            width: totalWidth,
            height: corridorWidth,
            left: 0,
            top: yPos - corridorWidth / 2,
          }}
        />
      )
    }) || []

    return (
      <div 
        className="relative"
        style={{ 
          width: totalWidth + 80, // Extra space for row labels
          height: totalHeight,
        }}
      >
        {horizontalCorridors}
        {verticalCorridors}
        {seats}
        {rowLabels}
      </div>
    )
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
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {data.config.displayTitle}
          </h1>
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
