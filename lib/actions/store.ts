'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getSession , getSessionToken} from '@/lib/session'
import { writeAuditLog } from '@/lib/audit'
import { ENV } from '@/lib/env'

const API_BASE = ENV.API_BASE

async function getSessionUser() {
  const session = await getSession()
  return session?.user ?? null
}

export async function createStore(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const name = formData.get('name') as string
  const location = formData.get('location') as string

  if (!name) return { error: 'Nama toko wajib diisi' }

  try {
    const token = await getSessionToken();
    const res = await fetch(`${API_BASE}/stores/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ name, location })
    })

    if (!res.ok) {
      throw new Error('Failed to create store via API')
    }
    const store = await res.json()

    revalidatePath('/stores')
    return { success: true, store }
  } catch (error) {
    return { error: 'Gagal membuat toko' }
  }
}

export async function updateStore(id: string, formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const name = formData.get('name') as string
  const location = formData.get('location') as string

  if (!name) return { error: 'Nama toko wajib diisi' }

  try {
    const token = await getSessionToken();
    const res = await fetch(`${API_BASE}/stores/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ name, location })
    })

    if (!res.ok) {
      throw new Error('Failed to update store via API')
    }

    revalidatePath('/stores')
    revalidatePath(`/stores/${id}`)
    return { success: true }
  } catch (error) {
    return { error: 'Gagal mengedit toko' }
  }
}

export async function deleteStore(id: string) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }

  try {
    const token = await getSessionToken();
    const res = await fetch(`${API_BASE}/stores/${id}`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      method: 'DELETE',
    })

    if (!res.ok) {
      throw new Error('Failed to delete store via API')
    }

    revalidatePath('/stores')
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    return { error: 'Gagal menghapus toko' }
  }
}
