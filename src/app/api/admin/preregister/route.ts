import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Get all pre-registered students
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const preRegistered = await prisma.preRegisteredStudent.findMany({
      orderBy: { seatNumber: 'asc' },
    })

    return NextResponse.json(preRegistered)
  } catch (error) {
    console.error('Get pre-registered error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Add a pre-registered student
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { name, seatNumber } = await request.json()

    if (!name || !seatNumber) {
      return NextResponse.json(
        { message: 'Name and seat number are required' },
        { status: 400 }
      )
    }

    // Check if seat is already taken by a registered student
    const existingStudent = await prisma.student.findUnique({
      where: { seatNumber },
    })

    if (existingStudent) {
      return NextResponse.json(
        { message: 'This seat already has a registered student' },
        { status: 400 }
      )
    }

    // Upsert pre-registered student
    const preRegistered = await prisma.preRegisteredStudent.upsert({
      where: { seatNumber },
      update: { name },
      create: { name, seatNumber },
    })

    return NextResponse.json(preRegistered)
  } catch (error) {
    console.error('Pre-register error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Bulk add pre-registered students
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { students } = await request.json()

    if (!Array.isArray(students)) {
      return NextResponse.json(
        { message: 'Students array is required' },
        { status: 400 }
      )
    }

    // Delete all existing pre-registered students and add new ones
    await prisma.preRegisteredStudent.deleteMany({})
    
    if (students.length > 0) {
      await prisma.preRegisteredStudent.createMany({
        data: students.map((s: { name: string; seatNumber: number }) => ({
          name: s.name,
          seatNumber: s.seatNumber,
        })),
        skipDuplicates: true,
      })
    }

    const preRegistered = await prisma.preRegisteredStudent.findMany({
      orderBy: { seatNumber: 'asc' },
    })

    return NextResponse.json(preRegistered)
  } catch (error) {
    console.error('Bulk pre-register error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete a pre-registered student
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const seatNumber = searchParams.get('seatNumber')

    if (!seatNumber) {
      return NextResponse.json(
        { message: 'Seat number is required' },
        { status: 400 }
      )
    }

    await prisma.preRegisteredStudent.delete({
      where: { seatNumber: parseInt(seatNumber) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete pre-registered error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
