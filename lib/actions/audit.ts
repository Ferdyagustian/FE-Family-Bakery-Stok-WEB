'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { writeAuditLog } from '@/lib/audit'

export async function clearAuditLogs(daysToKeep: number) {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { error: 'Unauthorized: Only Admin can clear logs' }
  }

  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    // Jika daysToKeep = 0, hapus semua
    const result = await prisma.auditLog.deleteMany({
      where: daysToKeep > 0 ? {
        createdAt: {
          lt: cutoffDate,
        },
      } : {},
    })

    // Catat bahwa admin melakukan pembersihan log (hanya jika tidak menghapus SEMUA)
    if (daysToKeep > 0) {
      await writeAuditLog({
        userId: session.user.id,
        username: session.user.username,
        action: 'CLEAR_LOGS',
        entityType: 'AuditLog',
        detail: { deletedCount: result.count, olderThanDays: daysToKeep },
      })
    }

    revalidatePath('/audit')
    return { success: true, count: result.count }
  } catch (error) {
    console.error('Failed to clear logs:', error)
    return { error: 'Gagal menghapus log dari database' }
  }
}
