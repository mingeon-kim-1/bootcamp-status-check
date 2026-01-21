import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper to get current time in KST
function getKSTDate(): Date {
  const now = new Date()
  // KST is UTC+9
  const kstOffset = 9 * 60 * 60 * 1000
  return new Date(now.getTime() + kstOffset)
}

// Check if it's morning (before 1 PM KST) or afternoon
function isMorningKST(): boolean {
  const kst = getKSTDate()
  return kst.getUTCHours() < 13 // Before 1 PM
}

// Check if afternoon code is still valid (before 9 PM KST)
function isAfternoonValidKST(): boolean {
  const kst = getKSTDate()
  return kst.getUTCHours() < 21 // Before 9 PM
}

// Get today's date string in KST (YYYY-MM-DD)
function getTodayKST(): string {
  const kst = getKSTDate()
  return kst.toISOString().split('T')[0]
}

// Check if student has verified attendance today
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const student = await prisma.student.findUnique({
      where: { id: session.user.id },
      select: { attendanceVerified: true },
    })

    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 })
    }

    // Check if verified today
    const todayKST = getTodayKST()
    const verifiedDate = student.attendanceVerified 
      ? new Date(student.attendanceVerified.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null

    const isVerifiedToday = verifiedDate === todayKST

    // Get current session info
    const isMorning = isMorningKST()
    const isAfternoonValid = isAfternoonValidKST()

    return NextResponse.json({
      isVerifiedToday,
      currentSession: isMorning ? 'morning' : 'afternoon',
      isSessionValid: isMorning || isAfternoonValid,
      verifiedDate,
    })
  } catch (error) {
    console.error('Get attendance status error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Verify attendance code
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await request.json()

    if (!code || !/^\d{4}$/.test(code)) {
      return NextResponse.json(
        { message: 'Invalid code format' },
        { status: 400 }
      )
    }

    // Get attendance codes
    const attendanceCodes = await prisma.attendanceCode.findUnique({
      where: { id: 'default' },
    })

    if (!attendanceCodes) {
      return NextResponse.json(
        { message: 'No attendance codes set' },
        { status: 400 }
      )
    }

    const isMorning = isMorningKST()
    const isAfternoonValid = isAfternoonValidKST()

    let isValidCode = false

    if (isMorning) {
      // Morning session - check morning code
      isValidCode = code === attendanceCodes.morningCode
    } else if (isAfternoonValid) {
      // Afternoon session - check afternoon code
      isValidCode = code === attendanceCodes.afternoonCode
    } else {
      return NextResponse.json(
        { message: '출석 시간이 종료되었습니다 (오후 9시 이후)' },
        { status: 400 }
      )
    }

    if (!isValidCode) {
      return NextResponse.json(
        { message: '잘못된 출석 코드입니다' },
        { status: 400 }
      )
    }

    // Update student's attendance verification
    await prisma.student.update({
      where: { id: session.user.id },
      data: { attendanceVerified: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: '출석이 확인되었습니다',
    })
  } catch (error) {
    console.error('Verify attendance error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
