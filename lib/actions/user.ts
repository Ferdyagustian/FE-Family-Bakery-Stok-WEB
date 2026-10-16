'use server'

import prisma from '@/lib/db'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { writeAuditLog } from '@/lib/audit'

export async function createManager(formData: FormData) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const username = (formData.get('username') as string)?.trim()
  const password = formData.get('password') as string
  const name = (formData.get('name') as string)?.trim()
  const storeId = formData.get('storeId') as string

  if (!username || !password || !name || !storeId) {
    return { error: 'Semua field wajib diisi' }
  }

  if (password.length < 8) {
    return { error: 'Password minimal harus 8 karakter' }
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { error: 'Password harus mengandung kombinasi huruf dan angka' }
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { username } })
    if (existingUser) {
      return { error: 'Username sudah digunakan, silakan pilih username lain' }
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        name,
        role: 'MANAGER',
        storeId,
      }
    })

    await writeAuditLog({
      userId: session.user.id,
      username: session.user.username,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user.id,
      entityName: `${user.name} (${user.username})`,
      storeId,
      detail: { role: 'MANAGER' }
    })

    revalidatePath(`/stores/${storeId}`)
    return { success: true, user }
  } catch (error: any) {
    console.error('Error createManager:', error)
    return { error: error?.message || 'Gagal membuat akun kasir' }
  }
}

export async function deleteManager(id: string, storeId: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') return { error: 'Unauthorized' }

  if (session.user.id === id) {
    return { error: 'Anda tidak dapat menghapus akun Anda sendiri' }
  }

  try {
    const targetUser = await prisma.user.findUnique({ where: { id }, select: { name: true, username: true, role: true } })
    if (!targetUser) {
      return { error: 'Pengguna tidak ditemukan' }
    }
    if (targetUser.role === 'ADMIN') {
      return { error: 'Akun Administrator tidak dapat dihapus melalui fitur cabang toko' }
    }

    await prisma.user.delete({
      where: { id }
    })

    await writeAuditLog({
      userId: session.user.id,
      username: session.user.username,
      action: 'DELETE_USER',
      entityType: 'User',
      entityId: id,
      entityName: targetUser?.name || targetUser?.username,
      storeId,
    })

    revalidatePath(`/stores/${storeId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleteManager:', error)
    return { error: error?.message || 'Gagal menghapus akun kasir' }
  }
}
