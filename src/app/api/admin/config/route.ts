import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const config = await prisma.bootcampConfig.findUnique({
      where: { id: 'default' },
    })

    if (!config) {
      // Create default config if it doesn't exist
      const newConfig = await prisma.bootcampConfig.create({
        data: {
          id: 'default',
          seatsPerRow: 10,
          totalRows: 5,
          seatDirection: 'bottom-right-horizontal',
          displayTitle: 'Bootcamp Status',
          useCustomLayout: false,
          corridorAfterRows: '[]',
          corridorAfterCols: '[]',
          breakMode: false,
        },
      })
      return NextResponse.json({
        ...newConfig,
        corridorAfterRows: [],
        corridorAfterCols: [],
      })
    }

    // Parse corridor arrays from JSON strings
    return NextResponse.json({
      ...config,
      corridorAfterRows: JSON.parse(config.corridorAfterRows || '[]'),
      corridorAfterCols: JSON.parse(config.corridorAfterCols || '[]'),
    })
  } catch (error) {
    console.error('Get config error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Convert corridor arrays to JSON strings for storage
    const corridorAfterRows = Array.isArray(data.corridorAfterRows) 
      ? JSON.stringify(data.corridorAfterRows) 
      : '[]'
    const corridorAfterCols = Array.isArray(data.corridorAfterCols) 
      ? JSON.stringify(data.corridorAfterCols) 
      : '[]'

    const config = await prisma.bootcampConfig.upsert({
      where: { id: 'default' },
      update: {
        seatsPerRow: data.seatsPerRow,
        totalRows: data.totalRows,
        seatDirection: data.seatDirection,
        displayTitle: data.displayTitle,
        useCustomLayout: data.useCustomLayout,
        corridorAfterRows,
        corridorAfterCols,
        breakMode: data.breakMode ?? false,
      },
      create: {
        id: 'default',
        seatsPerRow: data.seatsPerRow || 10,
        totalRows: data.totalRows || 5,
        seatDirection: data.seatDirection || 'bottom-right-horizontal',
        displayTitle: data.displayTitle || 'Bootcamp Status',
        useCustomLayout: data.useCustomLayout || false,
        corridorAfterRows,
        corridorAfterCols,
        breakMode: data.breakMode ?? false,
      },
    })

    return NextResponse.json({
      ...config,
      corridorAfterRows: JSON.parse(config.corridorAfterRows || '[]'),
      corridorAfterCols: JSON.parse(config.corridorAfterCols || '[]'),
    })
  } catch (error) {
    console.error('Update config error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
