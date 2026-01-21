import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'student') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const student = await prisma.student.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        seatNumber: true,
        status: true,
        lastActive: true,
      },
    })

    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json(student)
  } catch (error) {
    console.error('Get status error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'student') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { status } = await request.json()

    if (!['online', 'need-help'].includes(status)) {
      return NextResponse.json(
        { message: 'Invalid status' },
        { status: 400 }
      )
    }

    const student = await prisma.student.update({
      where: { id: session.user.id },
      data: {
        status,
        lastActive: new Date(),
      },
    })

    return NextResponse.json({
      id: student.id,
      status: student.status,
      lastActive: student.lastActive,
    })
  } catch (error) {
    console.error('Update status error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
