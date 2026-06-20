'use server'

import { revalidatePath } from 'next/cache'
import { getSession , getSessionToken} from '@/lib/session'
import { ENV } from '@/lib/env'

const API_BASE = ENV.API_BASE

export async function clearAuditLogs(daysToKeep: number) {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { error: 'Unauthorized: Only Admin can clear logs' }
  }

  try {
    const token = await getSessionToken();
    const res = await fetch(`${API_BASE}/audits/clear?daysToKeep=${daysToKeep}`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      method: 'DELETE',
    })

    if (!res.ok) return { error: 'Gagal menghapus log dari database' }

    const data = await res.json()
    revalidatePath('/audit')
    return { success: true, count: data.count }
  } catch (error) {
    return { error: 'Gagal menghapus log dari database' }
  }
}
