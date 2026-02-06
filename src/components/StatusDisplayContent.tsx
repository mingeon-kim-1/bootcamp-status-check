'use client'

import { useTranslations } from 'next-intl'

export interface Student {
  id: string
  seatNumber: number
  status: string
  lastActive: string | null
  needHelpSince?: string | null
}

export interface Config {
  seatsPerRow: number
  totalRows: number
  seatDirection: string
  displayTitle: string
  useCustomLayout: boolean
  corridorAfterRows: number[]
  corridorAfterCols: number[]
  breakMode?: boolean
}

export interface SeatPosition {
  seatNumber: number
  gridRow: number
  gridCol: number
  label?: string
}

export interface StatusData {
  students: Student[]
  config: Config
  seatPositions: SeatPosition[]
}

interface StatusDisplayContentProps {
  data: StatusData | null
  isFullscreen: boolean
}

function getStatusCounts(data: StatusData) {
  const online = data.students.filter(s => s.status === 'online').length
  const needHelp = data.students.filter(s => s.status === 'need-help').length
  let totalSeats: number
  if (data.config.useCustomLayout) {
    totalSeats = data.seatPositions.length
  } else {
    totalSeats = data.config.seatsPerRow * data.config.totalRows
  }
  const absent = totalSeats - online - needHelp
  return { online, needHelp, absent, total: totalSeats }
}

export default function StatusDisplayContent({ data, isFullscreen }: StatusDisplayContentProps) {
  const t = useTranslations()

  if (!data) return null

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

  const cellSize = isFullscreen ? 96 : 64
  const gap = 8
  const corridorWidth = 6

  const getColPosition = (col: number) => {
    let pos = col * (cellSize + gap)
    for (let c = 0; c < col; c++) {
      if (hasColCorridorAfter(c)) {
        pos += corridorWidth + gap
      }
    }
    return pos
  }

  const getRowPosition = (displayRow: number) => {
    const actualRow = data.config.totalRows - 1 - displayRow
    let pos = actualRow * (cellSize + gap)
    for (let r = data.config.totalRows - 1; r > displayRow; r--) {
      if (hasRowCorridorAfter(r)) {
        pos += corridorWidth + gap
      }
    }
    return pos
  }

  const renderGrid = () => {
    const seats: JSX.Element[] = []
    const rowLabels: JSX.Element[] = []

    for (let displayRow = data.config.totalRows - 1; displayRow >= 0; displayRow--) {
      for (let col = 0; col < data.config.seatsPerRow; col++) {
        let seatNumber: number | null = null

        if (data.config.useCustomLayout) {
          const customSeat = customPositionMap.get(`${displayRow}-${col}`)
          seatNumber = customSeat?.seatNumber ?? null
        } else {
          seatNumber = getSeatNumberForPosition(displayRow, col)
        }

        const student = seatNumber ? studentMap.get(seatNumber) : null
        const status = student?.status || 'offline'

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

    const totalWidth = getColPosition(data.config.seatsPerRow - 1) + cellSize
    const totalHeight = getRowPosition(0) + cellSize

    const verticalCorridors = data.config.corridorAfterCols?.map(col => {
      if (col >= data.config.seatsPerRow - 1) return null
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

    const horizontalCorridors = data.config.corridorAfterRows?.map(row => {
      if (row <= 0) return null
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
          width: totalWidth + 80,
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

  const counts = getStatusCounts(data)

  if (data.config.breakMode) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-2xl md:text-4xl font-semibold text-gray-600 dark:text-slate-400 text-center px-4">
          {t('display.breakMessage')}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="text-gray-500 dark:text-slate-500 text-sm mb-4 text-center">
        ↑ {t('common.frontOfRoom') || 'Front of Room'} ↑
      </div>

      <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-6 md:mb-8">
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg border border-emerald-300 dark:border-emerald-500/30">
          <div className="w-4 h-4 rounded border-2 border-emerald-500 bg-emerald-200 dark:bg-emerald-500/20" />
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
            {t('common.ready')}: {counts.online}
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-500/20 rounded-lg border border-red-300 dark:border-red-500/30">
          <div className="w-4 h-4 rounded border-2 border-red-500 bg-red-200 dark:bg-red-500/20 animate-pulse" />
          <span className="text-red-700 dark:text-red-400 font-semibold">
            {t('common.needHelp')}: {counts.needHelp}
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-500/20 rounded-lg border border-gray-300 dark:border-slate-500/30">
          <div className="w-4 h-4 rounded border-2 border-gray-400 dark:border-slate-600 bg-gray-200 dark:bg-slate-700/50" />
          <span className="text-gray-600 dark:text-slate-400 font-semibold">
            {t('common.absent')}: {counts.absent}
          </span>
        </div>
      </div>

      {counts.needHelp > 0 && (() => {
        const needHelpStudents = data.students
          .filter(s => s.status === 'need-help' && s.needHelpSince)
          .sort((a, b) => new Date(a.needHelpSince!).getTime() - new Date(b.needHelpSince!).getTime())
        const now = Date.now()
        const queueText = needHelpStudents
          .map(s => `Seat ${s.seatNumber} (${Math.max(0, Math.floor((now - new Date(s.needHelpSince!).getTime()) / 60000))}m)`)
          .join(', ')
        return (
          <div className="flex flex-wrap justify-center gap-x-4 mb-4 text-sm text-red-700 dark:text-red-400 font-medium">
            {t('display.helpQueue')}: {queueText}
          </div>
        )
      })()}

      <div className="flex-1 flex items-center justify-center overflow-auto">
        <div className="flex flex-col gap-2">
          {renderGrid()}
        </div>
      </div>

      <div className="text-gray-500 dark:text-slate-500 text-sm mt-4 text-center">
        ↓ {t('common.backOfRoom') || 'Back of Room'} ↓
      </div>
    </>
  )
}
