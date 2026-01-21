import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

// Helper function to check if attendance code is valid
async function isAttendanceCodeValid(code: string): Promise<boolean> {
  const attendanceCode = await prisma.attendanceCode.findUnique({
    where: { id: 'default' },
  })

  if (!attendanceCode) return false

  // Get current time in KST (UTC+9)
  const now = new Date()
  const kstHour = (now.getUTCHours() + 9) % 24

  // Morning code valid until 1 PM (13:00) KST
  if (kstHour < 13 && attendanceCode.morningCode === code) {
    return true
  }

  // Afternoon code valid until 9 PM (21:00) KST
  if (kstHour >= 13 && kstHour < 21 && attendanceCode.afternoonCode === code) {
    return true
  }

  // Also accept morning code if afternoon hasn't started or afternoon code in morning for flexibility
  if (attendanceCode.morningCode === code || attendanceCode.afternoonCode === code) {
    return true
  }

  return false
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'admin-login',
      name: 'Admin Login',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const admin = await prisma.admin.findUnique({
          where: { username: credentials.username },
        })

        if (!admin) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, admin.passwordHash)

        if (!isValid) {
          return null
        }

        return {
          id: admin.id,
          name: admin.username,
          role: 'admin',
        }
      },
    }),
    CredentialsProvider({
      id: 'student-login',
      name: 'Student Login',
      credentials: {
        seatNumber: { label: 'Seat Number', type: 'text' },
        attendanceCode: { label: 'Attendance Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.seatNumber || !credentials?.attendanceCode) {
          return null
        }

        const seatNumber = parseInt(credentials.seatNumber)
        if (isNaN(seatNumber) || seatNumber < 1) {
          return null
        }

        // Verify attendance code
        const isCodeValid = await isAttendanceCodeValid(credentials.attendanceCode)
        if (!isCodeValid) {
          return null
        }

        // Find or create student
        let student = await prisma.student.findUnique({
          where: { seatNumber },
        })

        if (!student) {
          // Create new student record
          student = await prisma.student.create({
            data: {
              seatNumber,
              status: 'online',
              lastActive: new Date(),
              attendanceVerified: new Date(),
            },
          })
        } else {
          // Update existing student
          student = await prisma.student.update({
            where: { id: student.id },
            data: {
              status: 'online',
              lastActive: new Date(),
              attendanceVerified: new Date(),
            },
          })
        }

        return {
          id: student.id,
          seatNumber: student.seatNumber,
          role: 'student',
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.seatNumber = user.seatNumber
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string
        session.user.role = token.role as string
        session.user.seatNumber = token.seatNumber as number | undefined
      }
      return session
    },
  },
  pages: {
    signIn: '/admin/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 12 * 60 * 60, // 12 hours in seconds
  },
  jwt: {
    maxAge: 12 * 60 * 60, // 12 hours in seconds
  },
  secret: process.env.NEXTAUTH_SECRET || 'bootcamp-status-secret-key-change-in-production',
}

declare module 'next-auth' {
  interface User {
    role?: string
    seatNumber?: number
  }
  
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
      seatNumber?: number
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    seatNumber?: number
  }
}
