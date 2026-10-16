'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import prisma from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'

export async function clearAuditLogs(daysToKeep: number) {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { error: 'Unauthorized: Only Admin can clear logs' }
  }

  try {
    if (!daysToKeep || typeof daysToKeep !== 'number' || daysToKeep < 7) {
      return { error: 'Log audit hanya dapat dibersihkan untuk data yang telah berusia lebih dari 7 hari demi kepatuhan forensik keamanan.' }
    }

    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)
    const res = await prisma.auditLog.deleteMany({ 
      where: { createdAt: { lt: cutoffDate } } 
    })

    await writeAuditLog({
      userId: session.user.id,
      username: session.user.username,
      action: 'CLEAR_LOGS',
      entityType: 'AuditLog',
      detail: { daysToKeep, deletedCount: res.count }
    })

    revalidatePath('/audit')
    return { success: true, count: res.count }
  } catch (error) {
    console.error('Error clearing audit logs:', error)
    return { error: 'Gagal menghapus log dari database' }
  }
}
