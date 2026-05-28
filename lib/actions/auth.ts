'use server'

import prisma from '@/lib/db'
import { createSession, deleteSession, getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { writeAuditLog } from '@/lib/audit'

export async function loginAction(formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) {
    redirect('/login?error=EmptyFields')
  }

  try {
    const failedAttempts = await prisma.auditLog.count({
      where: {
        username,
        action: 'FAILED_LOGIN',
        createdAt: {
          gte: new Date(Date.now() - 15 * 60 * 1000)
        }
      }
    })

    if (failedAttempts >= 5) {
      redirect('/login?error=TooManyRequests')
    }

    const user = await prisma.user.findUnique({ where: { username } })

    if (!user) {
      await writeAuditLog({
        username,
        action: 'FAILED_LOGIN',
        entityType: 'User',
        detail: { reason: 'UserNotFound' }
      })
      redirect('/login?error=UserNotFound')
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash)

    if (!passwordMatch) {
      await writeAuditLog({
        userId: user.id,
        username,
        action: 'FAILED_LOGIN',
        entityType: 'User',
        entityId: user.id,
        detail: { reason: 'WrongPassword' }
      })
      redirect('/login?error=WrongPassword')
    }

    await createSession({
      id: user.id,
      role: user.role,
      storeId: user.storeId,
    })

    // Catat aktivitas login
    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      entityName: user.name ?? user.username,
    })
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error
    console.error('Login error:', error)
    redirect('/login?error=ServerError')
  }

  redirect('/')
}

export async function logoutAction() {
  const session = await getSession()

  // Catat aktivitas logout sebelum sesi dihapus
  if (session?.user) {
    await writeAuditLog({
      userId: session.user.id,
      username: session.user.username,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: session.user.id,
    })
  }

  await deleteSession()
  redirect('/login')
}
