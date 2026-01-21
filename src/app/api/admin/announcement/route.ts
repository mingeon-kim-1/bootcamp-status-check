import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Get announcement
export async function GET() {
  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id: 'default' },
    })

    return NextResponse.json(announcement || { content: null, isActive: false })
  } catch (error) {
    console.error('Get announcement error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update announcement (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { content, isActive } = await request.json()

    const announcement = await prisma.announcement.upsert({
      where: { id: 'default' },
      update: {
        content: content || null,
        isActive: isActive ?? false,
      },
      create: {
        id: 'default',
        content: content || null,
        isActive: isActive ?? false,
      },
    })

    return NextResponse.json(announcement)
  } catch (error) {
    console.error('Update announcement error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
