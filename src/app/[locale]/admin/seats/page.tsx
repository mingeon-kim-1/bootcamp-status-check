'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import SettingsModal from '@/components/SettingsModal'

interface SeatPosition {
  id?: string
  seatNumber: number
  gridRow: number
  gridCol: number
  label?: string
}

interface Config {
  seatsPerRow: number
  totalRows: number
  useCustomLayout: boolean
  corridorAfterRows: number[]
  corridorAfterCols: number[]
}

export default function AdminSeatsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [config, setConfig] = useState<Config | null>(null)
  const [seats, setSeats] = useState<SeatPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nextSeatNumber, setNextSeatNumber] = useState(1)
  const [assignMode, setAssignMode] = useState<'click' | 'sequential'>('click')

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

  useEffect(() => {
    if (seats.length > 0) {
      const maxSeat = Math.max(...seats.map(s => s.seatNumber))
      setNextSeatNumber(maxSeat + 1)
    } else {
      setNextSeatNumber(1)
    }
  }, [seats])

  const fetchData = async () => {
    try {
      const [configRes, seatsRes] = await Promise.all([
        fetch('/api/admin/config'),
        fetch('/api/admin/seats'),
      ])
      const configData = await configRes.json()
      setConfig({
        ...configData,
        corridorAfterRows: configData.corridorAfterRows || [],
        corridorAfterCols: configData.corridorAfterCols || [],
      })
      setSeats(await seatsRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCellClick = (row: number, col: number) => {
    const existingSeat = seats.find(s => s.gridRow === row && s.gridCol === col)
    
    if (existingSeat) {
      setSeats(seats.filter(s => !(s.gridRow === row && s.gridCol === col)))
    } else {
      if (assignMode === 'sequential') {
        setSeats([...seats, {
          seatNumber: nextSeatNumber,
          gridRow: row,
          gridCol: col,
        }])
        // Auto-increment for next sequential assignment
        setNextSeatNumber(nextSeatNumber + 1)
      } else {
        const input = prompt(`Enter seat number for position (Row ${row + 1}, Col ${col + 1}):`, nextSeatNumber.toString())
        if (input !== null) {
          const seatNum = parseInt(input)
          if (!isNaN(seatNum) && seatNum > 0) {
            const newSeats = seats.filter(s => s.seatNumber !== seatNum && !(s.gridRow === row && s.gridCol === col))
            newSeats.push({
              seatNumber: seatNum,
              gridRow: row,
              gridCol: col,
            })
            setSeats(newSeats)
            // Update next seat number to be after the manually entered number
            setNextSeatNumber(seatNum + 1)
          }
        }
      }
    }
  }

  const toggleRowCorridor = (afterRow: number) => {
    if (!config) return
    const corridors = [...config.corridorAfterRows]
    const index = corridors.indexOf(afterRow)
    if (index > -1) {
      corridors.splice(index, 1)
    } else {
      corridors.push(afterRow)
      corridors.sort((a, b) => a - b)
    }
    setConfig({ ...config, corridorAfterRows: corridors })
  }

  const toggleColCorridor = (afterCol: number) => {
    if (!config) return
    const corridors = [...config.corridorAfterCols]
    const index = corridors.indexOf(afterCol)
    if (index > -1) {
      corridors.splice(index, 1)
    } else {
      corridors.push(afterCol)
      corridors.sort((a, b) => a - b)
    }
    setConfig({ ...config, corridorAfterCols: corridors })
  }

  const saveAll = async () => {
    if (!config) return
    setSaving(true)
    try {
      await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      await fetch('/api/admin/seats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seats }),
      })
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setSaving(false)
    }
  }

  const clearAllSeats = () => {
    if (!confirm('Clear all seat positions?')) return
    setSeats([])
  }

  const clearAllCorridors = () => {
    if (!config || !confirm('Clear all corridors?')) return
    setConfig({ ...config, corridorAfterRows: [], corridorAfterCols: [] })
  }

  const autoFillSeats = () => {
    if (!config) return
    if (!confirm('This will replace all current seat assignments. Continue?')) return
    const newSeats: SeatPosition[] = []
    let seatNum = 1
    for (let row = 0; row < config.totalRows; row++) {
      for (let col = config.seatsPerRow - 1; col >= 0; col--) {
        newSeats.push({ seatNumber: seatNum++, gridRow: row, gridCol: col })
      }
    }
    setSeats(newSeats)
  }

  const getSeatAtPosition = (row: number, col: number) => seats.find(s => s.gridRow === row && s.gridCol === col)
  const hasRowCorridorAfter = (row: number) => config?.corridorAfterRows.includes(row) || false
  const hasColCorridorAfter = (col: number) => config?.corridorAfterCols.includes(col) || false

  if (status === 'loading' || loading || !config) {
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
        <nav className="mt-4 flex gap-4">
          <Link href={`/${locale}/admin/dashboard`} className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg transition-colors">{t('admin.config')}</Link>
          <Link href={`/${locale}/admin/seats`} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">{t('admin.seats')}</Link>
          <Link href={`/${locale}/admin/branding`} className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg transition-colors">{t('admin.branding')}</Link>
          <Link href={`/${locale}/admin/display`} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">{t('admin.display')}</Link>
        </nav>
      </header>

      <main className="p-6">
        <section className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('admin.customLayout')}</h2>
              <p className="text-gray-500 dark:text-slate-400 mt-1">Click squares to assign seats • Use side/top buttons to add corridors</p>
            </div>
            <div className="flex gap-2">
              <button onClick={autoFillSeats} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Auto Fill</button>
              <button onClick={clearAllSeats} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">Clear Seats</button>
              <button onClick={clearAllCorridors} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors">Clear Corridors</button>
              <button onClick={saveAll} disabled={saving} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg transition-colors">
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>

          {/* Assignment Mode */}
          <div className="mb-6 flex items-center gap-4">
            <span className="text-gray-700 dark:text-slate-300">Mode:</span>
            <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
              <button onClick={() => setAssignMode('click')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${assignMode === 'click' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'}`}>
                Custom Number
              </button>
              <button onClick={() => setAssignMode('sequential')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${assignMode === 'sequential' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'}`}>
                Sequential (Next: {nextSeatNumber})
              </button>
            </div>
          </div>

          {/* Grid with Column Corridor Toggles */}
          <div className="overflow-auto pb-4">
            <div className="text-gray-500 dark:text-slate-400 text-sm mb-2 text-center">↑ Front of Room ↑</div>
            
            {/* Column corridor toggle row */}
            <div className="flex gap-2 mb-2 ml-10">
              {Array.from({ length: config.seatsPerRow }).map((_, colIndex) => (
                <div key={`col-toggle-${colIndex}`} className="flex">
                  <div className="w-16" /> {/* Spacer for seat */}
                  {colIndex < config.seatsPerRow - 1 && (
                    <button
                      onClick={() => toggleColCorridor(colIndex)}
                      className={`w-4 h-8 rounded flex items-center justify-center text-xs transition-colors mx-1 ${
                        hasColCorridorAfter(colIndex)
                          ? 'bg-amber-500/30 text-amber-600 dark:text-amber-400 border-2 border-amber-500'
                          : 'bg-gray-200 dark:bg-slate-700/30 text-gray-400 dark:text-slate-500 border-2 border-gray-300 dark:border-slate-600 hover:border-amber-500 hover:text-amber-500'
                      }`}
                      title={hasColCorridorAfter(colIndex) ? 'Remove vertical corridor' : 'Add vertical corridor'}
                    >
                      {hasColCorridorAfter(colIndex) ? '┃' : '+'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Seat Grid */}
            <div className="flex flex-col gap-2 min-w-fit">
              {Array.from({ length: config.totalRows }).map((_, rowIndex) => {
                const row = config.totalRows - 1 - rowIndex
                return (
                  <div key={`row-group-${row}`}>
                    <div className="flex gap-2 items-center">
                      {/* Row corridor toggle */}
                      <button
                        onClick={() => toggleRowCorridor(row)}
                        className={`w-8 h-16 rounded flex items-center justify-center text-xs transition-colors ${
                          hasRowCorridorAfter(row)
                            ? 'bg-amber-500/30 text-amber-600 dark:text-amber-400 border-2 border-amber-500'
                            : 'bg-gray-200 dark:bg-slate-700/30 text-gray-400 dark:text-slate-500 border-2 border-gray-300 dark:border-slate-600 hover:border-amber-500 hover:text-amber-500'
                        }`}
                        title={hasRowCorridorAfter(row) ? 'Remove horizontal corridor' : 'Add horizontal corridor'}
                      >
                        {hasRowCorridorAfter(row) ? '━' : '+'}
                      </button>

                      {/* Seat cells with column corridors */}
                      {Array.from({ length: config.seatsPerRow }).map((_, colIndex) => {
                        const seat = getSeatAtPosition(row, colIndex)
                        return (
                          <div key={`cell-${row}-${colIndex}`} className="flex items-center">
                            <button
                              onClick={() => handleCellClick(row, colIndex)}
                              className={`w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center font-bold transition-all hover:scale-105 ${
                                seat
                                  ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30'
                                  : 'border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500 hover:border-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:text-indigo-600 dark:hover:text-indigo-400'
                              }`}
                            >
                              {seat ? (
                                <>
                                  <span className="text-xl">{seat.seatNumber}</span>
                                  <span className="text-[10px] opacity-60">remove</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-2xl">+</span>
                                  <span className="text-[10px] opacity-60">add</span>
                                </>
                              )}
                            </button>
                            {/* Column corridor indicator */}
                            {hasColCorridorAfter(colIndex) && colIndex < config.seatsPerRow - 1 && (
                              <div className="w-[6px] h-16 bg-amber-500 rounded-full mx-2" />
                            )}
                          </div>
                        )
                      })}
                      <span className="text-gray-500 dark:text-slate-500 text-sm ml-2">Row {row + 1}</span>
                    </div>

                    {/* Row corridor */}
                    {hasRowCorridorAfter(row) && row > 0 && (
                      <div className="flex gap-2 items-center my-2">
                        <div className="w-8" />
                        <div 
                          className="h-[6px] bg-amber-500 rounded-full"
                          style={{ width: `${config.seatsPerRow * 72 + (config.seatsPerRow - 1) * 8 + config.corridorAfterCols.filter(c => c < config.seatsPerRow - 1).length * 18}px` }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="text-gray-500 dark:text-slate-400 text-sm mt-4 text-center">↓ Back of Room ↓</div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border-2 border-emerald-500 bg-emerald-100 dark:bg-emerald-500/20" />
              <span className="text-gray-600 dark:text-slate-300">Seat ({seats.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border-2 border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700/50" />
              <span className="text-gray-600 dark:text-slate-300">Empty</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-3 bg-amber-500/20 border-y-2 border-dashed border-amber-500/50" />
              <span className="text-gray-600 dark:text-slate-300">Row Corridor ({config.corridorAfterRows.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-6 bg-amber-500/20 border-x-2 border-dashed border-amber-500/50" />
              <span className="text-gray-600 dark:text-slate-300">Column Corridor ({config.corridorAfterCols.length})</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
