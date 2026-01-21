import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const students = await prisma.student.findMany({
      select: {
        id: true,
        seatNumber: true,
        status: true,
        lastActive: true,
        createdAt: true,
      },
      orderBy: { seatNumber: 'asc' },
    })

    return NextResponse.json(students)
  } catch (error) {
    console.error('Get students error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('id')
    const resetAll = searchParams.get('all') === 'true'

    if (resetAll) {
      // Delete all students
      await prisma.student.deleteMany()
      return NextResponse.json({ message: 'All students deleted' })
    }

    if (studentId) {
      await prisma.student.delete({
        where: { id: studentId },
      })
      return NextResponse.json({ message: 'Student deleted' })
    }

    return NextResponse.json(
      { message: 'Student ID or all flag required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Delete student error:', error)
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

    const { studentId, status } = await request.json()

    if (!studentId) {
      return NextResponse.json(
        { message: 'Student ID required' },
        { status: 400 }
      )
    }

    const student = await prisma.student.update({
      where: { id: studentId },
      data: {
        status: status || 'online',
        lastActive: new Date(),
      },
    })

    return NextResponse.json(student)
  } catch (error) {
    console.error('Update student error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
