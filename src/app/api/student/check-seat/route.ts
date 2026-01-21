import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Check if a seat has a pre-registered student
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const seatNumber = searchParams.get('seatNumber')

    if (!seatNumber) {
      return NextResponse.json(
        { message: 'Seat number is required' },
        { status: 400 }
      )
    }

    const seatNum = parseInt(seatNumber)

    // Check if seat is already taken by a registered student
    const existingStudent = await prisma.student.findUnique({
      where: { seatNumber: seatNum },
    })

    if (existingStudent) {
      return NextResponse.json({
        available: false,
        taken: true,
        message: 'This seat is already taken',
      })
    }

    // Check if there's a pre-registered student for this seat
    const preRegistered = await prisma.preRegisteredStudent.findUnique({
      where: { seatNumber: seatNum },
    })

    if (preRegistered) {
      return NextResponse.json({
        available: true,
        taken: false,
        preRegistered: true,
        name: preRegistered.name,
      })
    }

    return NextResponse.json({
      available: true,
      taken: false,
      preRegistered: false,
    })
  } catch (error) {
    console.error('Check seat error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
