import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Get attendance codes
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const codes = await prisma.attendanceCode.findUnique({
      where: { id: 'default' },
    })

    if (!codes) {
      return NextResponse.json({
        morningCode: null,
        afternoonCode: null,
      })
    }

    return NextResponse.json(codes)
  } catch (error) {
    console.error('Get attendance codes error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Set attendance codes
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { morningCode, afternoonCode } = await request.json()

    // Validate codes are 4 digits
    if (morningCode && !/^\d{4}$/.test(morningCode)) {
      return NextResponse.json(
        { message: 'Morning code must be 4 digits' },
        { status: 400 }
      )
    }
    if (afternoonCode && !/^\d{4}$/.test(afternoonCode)) {
      return NextResponse.json(
        { message: 'Afternoon code must be 4 digits' },
        { status: 400 }
      )
    }

    const codes = await prisma.attendanceCode.upsert({
      where: { id: 'default' },
      update: {
        morningCode: morningCode || null,
        afternoonCode: afternoonCode || null,
      },
      create: {
        id: 'default',
        morningCode: morningCode || null,
        afternoonCode: afternoonCode || null,
      },
    })

    return NextResponse.json(codes)
  } catch (error) {
    console.error('Set attendance codes error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
