'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { writeAuditLog } from '@/lib/audit'

async function getSessionUser() {
  const session = await getSession()
  return session?.user ?? null
}

export async function createStore(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return { error: 'Unauthorized' }

  const name = formData.get('name') as string
  const location = formData.get('location') as string

  if (!name) return { error: 'Nama toko wajib diisi' }

  try {
    const store = await prisma.store.create({
      data: { name, location }
    })

    // Auto-populate all master products into the new store with 0 stock
    const products = await prisma.product.findMany({ select: { id: true } })
    if (products.length > 0) {
      await prisma.storeProduct.createMany({
        data: products.map(p => ({
          storeId: store.id,
          productId: p.id,
          stockQuantity: 0
        }))
      })
    }

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'CREATE_STORE',
      entityType: 'Store',
      entityId: store.id,
      entityName: name,
      detail: { location: location || null },
    })

    revalidatePath('/stores')
    return { success: true, store }
  } catch (error) {
    return { error: 'Gagal membuat toko' }
  }
}

export async function updateStore(id: string, formData: FormData) {
  const user = await getSessionUser()
  if (!user) return { error: 'Unauthorized' }

  const name = formData.get('name') as string
  const location = formData.get('location') as string

  if (!name) return { error: 'Nama toko wajib diisi' }

  try {
    await prisma.store.update({
      where: { id },
      data: { name, location }
    })

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'UPDATE_STORE',
      entityType: 'Store',
      entityId: id,
      entityName: name,
      detail: { location: location || null },
    })

    revalidatePath('/stores')
    revalidatePath(`/stores/${id}`)
    return { success: true }
  } catch (error) {
    return { error: 'Gagal mengedit toko' }
  }
}

export async function deleteStore(id: string) {
  const user = await getSessionUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    // Ambil nama toko sebelum dihapus
    const store = await prisma.store.findUnique({
      where: { id },
      select: { name: true }
    })

    // Prisma will cascade delete StoreProduct and Sale due to schema definitions
    await prisma.store.delete({ where: { id } })

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'DELETE_STORE',
      entityType: 'Store',
      entityId: id,
      entityName: store?.name ?? id,
    })

    revalidatePath('/stores')
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    return { error: 'Gagal menghapus toko' }
  }
}
