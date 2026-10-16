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
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const name = (formData.get('name') as string)?.trim()
  const location = (formData.get('location') as string)?.trim() || null

  if (!name) return { error: 'Nama toko wajib diisi' }

  try {
    const store = await prisma.store.create({
      data: { name, location }
    })

    // Hubungkan seluruh produk master yang ada ke cabang baru ini dengan stok awal 0
    const masterProducts = await prisma.product.findMany({ select: { id: true } })
    if (masterProducts.length > 0) {
      await prisma.storeProduct.createMany({
        data: masterProducts.map(p => ({
          storeId: store.id,
          productId: p.id,
          stockQuantity: 0
        })),
        skipDuplicates: true
      })
    }

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'CREATE_STORE',
      entityType: 'Store',
      entityId: store.id,
      entityName: store.name,
      detail: { location }
    })

    revalidatePath('/stores')
    revalidatePath('/')
    return { success: true, store }
  } catch (error: any) {
    console.error('Error createStore:', error)
    return { error: error?.message || 'Gagal membuat toko baru' }
  }
}

export async function deleteStore(id: string) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }

  try {
    const store = await prisma.store.findUnique({ where: { id }, select: { name: true } })

    const salesCount = await prisma.sale.count({ where: { storeId: id } })
    if (salesCount > 0) {
      return {
        error: `Cabang "${store?.name || id}" telah memiliki riwayat catatan transaksi penjualan. Cabang tidak dapat dihapus permanen agar pembukuan dan riwayat omzet historis tetap terjaga.`
      }
    }

    await prisma.$transaction([
      prisma.storeProduct.deleteMany({ where: { storeId: id } }),
      prisma.user.deleteMany({ where: { storeId: id } }),
      prisma.store.delete({ where: { id } })
    ])

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'DELETE_STORE',
      entityType: 'Store',
      entityId: id,
      entityName: store?.name,
    })

    revalidatePath('/stores')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleteStore:', error)
    return { error: error?.message || 'Gagal menghapus toko' }
  }
}
