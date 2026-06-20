'use server'

import { getSession , getSessionToken} from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { ENV } from '@/lib/env'

const API_BASE = ENV.API_BASE

export async function createManager(formData: FormData) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const storeId = formData.get('storeId') as string

  if (!username || !password || !name) {
    return { error: 'Semua field wajib diisi' }
  }

  try {
    const token = await getSessionToken();
    const res = await fetch(`${API_BASE}/users/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ username, password, name, storeId })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => null)
      return { error: err?.detail || 'Username sudah digunakan atau gagal membuat akun' }
    }

    revalidatePath(`/stores/${storeId}`)
    return { success: true }
  } catch (error) {
    return { error: 'Gagal membuat akun kasir' }
  }
}

export async function deleteManager(id: string, storeId: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') return { error: 'Unauthorized' }

  try {
    const token = await getSessionToken();
    const res = await fetch(`${API_BASE}/users/${id}`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      method: 'DELETE',
    })

    if (!res.ok) return { error: 'Gagal menghapus akun kasir' }

    revalidatePath(`/stores/${storeId}`)
    return { success: true }
  } catch (error) {
    return { error: 'Gagal menghapus akun kasir' }
  }
}
