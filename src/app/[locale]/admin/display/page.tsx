'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import LanguageSwitcher from '@/components/LanguageSwitcher'

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
  const [data, setData] = useState<StatusData | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/status')
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">{t('common.loading')}</div>
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
        return 'bg-green-500 shadow-lg shadow-green-500/30'
      case 'need-help':
        return 'bg-red-500 shadow-lg shadow-red-500/30 animate-pulse'
      default:
        return 'bg-gray-600'
    }
  }

  const hasRowCorridorAfter = (row: number) => {
    return data.config.corridorAfterRows?.includes(row) || false
  }

  const hasColCorridorAfter = (col: number) => {
    return data.config.corridorAfterCols?.includes(col) || false
  }

  // Build the grid with corridors
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
            className={`aspect-square rounded-lg flex items-center justify-center text-white font-bold transition-all duration-300 ${
              seatNumber 
                ? getStatusColor(status) 
                : 'bg-slate-800/50'
            } ${isFullscreen ? 'text-2xl' : 'text-lg'}`}
          >
            {seatNumber || ''}
          </div>
        )

        // Add column corridor if needed
        if (hasColCorridorAfter(col) && col < data.config.seatsPerRow - 1) {
          cells.push(
            <div
              key={`col-corridor-${displayRow}-${col}`}
              className="w-3 md:w-4 bg-amber-500/10 border-x border-dashed border-amber-500/30 self-stretch"
            />
          )
        }
      }
      
      elements.push(
        <div 
          key={`row-${displayRow}`} 
          className="flex gap-2 justify-center"
        >
          {cells}
        </div>
      )
      
      // Add row corridor if exists after this row
      if (hasRowCorridorAfter(displayRow) && displayRow > 0) {
        elements.push(
          <div 
            key={`corridor-${displayRow}`} 
            className="h-4 md:h-6 bg-amber-500/10 border-y border-dashed border-amber-500/30 flex items-center justify-center my-1"
          >
            <span className="text-amber-400/60 text-xs font-medium tracking-widest">
              AISLE
            </span>
          </div>
        )
      }
    }
    
    return elements
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col"
    >
      {/* Header */}
      <header className="p-4 md:p-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-4">
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
            <h1 className="text-2xl md:text-4xl font-bold text-white">
              {data.config.displayTitle}
            </h1>
            {data.branding?.organizationName && (
              <p className="text-slate-400 text-sm md:text-base">
                {data.branding.organizationName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!isFullscreen && <LanguageSwitcher />}
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            {isFullscreen ? t('common.exitFullscreen') : t('common.fullscreen')}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 flex flex-col">
        {/* Status Summary */}
        <div className="flex justify-center gap-4 md:gap-8 mb-6 md:mb-8">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-lg">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-green-400 font-semibold">
              {t('common.ready')}: {counts.online}
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-lg">
            <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-red-400 font-semibold">
              {t('common.needHelp')}: {counts.needHelp}
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-500/20 rounded-lg">
            <div className="w-4 h-4 rounded-full bg-gray-500"></div>
            <span className="text-gray-400 font-semibold">
              {t('common.absent')}: {counts.absent}
            </span>
          </div>
        </div>

        {/* Status Grid with Corridors */}
        <div className="flex-1 flex items-center justify-center overflow-auto">
          <div className="w-full max-w-6xl flex flex-col gap-2">
            {renderGrid()}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex justify-center gap-6 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span>{t('common.ready')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span>{t('common.needHelp')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-600"></div>
            <span>{t('common.absent')}</span>
          </div>
        </div>
      </main>
    </div>
  )
}
