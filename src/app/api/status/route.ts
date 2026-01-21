import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Public endpoint for real-time status display
export async function GET() {
  try {
    const [students, config, branding, seatPositions] = await Promise.all([
      prisma.student.findMany({
        select: {
          id: true,
          name: true,
          seatNumber: true,
          status: true,
          lastActive: true,
        },
        orderBy: { seatNumber: 'asc' },
      }),
      prisma.bootcampConfig.findUnique({
        where: { id: 'default' },
      }),
      prisma.branding.findUnique({
        where: { id: 'default' },
      }),
      prisma.seatPosition.findMany({
        orderBy: { seatNumber: 'asc' },
      }),
    ])

    // Parse corridor arrays from JSON strings
    const corridorAfterRows = config?.corridorAfterRows 
      ? JSON.parse(config.corridorAfterRows) 
      : []
    const corridorAfterCols = config?.corridorAfterCols 
      ? JSON.parse(config.corridorAfterCols) 
      : []

    return NextResponse.json({
      students,
      config: {
        seatsPerRow: config?.seatsPerRow || 10,
        totalRows: config?.totalRows || 5,
        seatDirection: config?.seatDirection || 'bottom-right-horizontal',
        displayTitle: config?.displayTitle || 'Bootcamp Status',
        useCustomLayout: config?.useCustomLayout || false,
        corridorAfterRows,
        corridorAfterCols,
      },
      branding,
      seatPositions,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Get status error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
