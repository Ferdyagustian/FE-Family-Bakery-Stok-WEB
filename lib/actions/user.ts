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

  try {
    const targetUser = await prisma.user.findUnique({ where: { id }, select: { name: true, username: true } })

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
