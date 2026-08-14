'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { assertStoreAccess } from '@/lib/actions/auth-guard'
import { writeAuditLog } from '@/lib/audit'

async function getSessionUser() {
  const session = await getSession()
  return session?.user ?? null
}

// ── 1. Create Master Product ─────────────────────────────────────────
export async function createMasterProduct(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const imageUrl = (formData.get('imageUrl') as string)?.trim() || null
  const price = parseFloat(formData.get('price') as string)

  if (!name || isNaN(price) || price <= 0) {
    return { error: 'Data tidak lengkap atau tidak valid' }
  }

  try {
    // 1. Simpan ke tabel master Product
    const product = await prisma.product.create({
      data: {
        name,
        description,
        imageUrl,
        price,
        discount: 0
      }
    })

    // 2. Hubungkan otomatis ke seluruh cabang toko yang ada dengan stok 0
    const stores = await prisma.store.findMany({ select: { id: true } })
    if (stores.length > 0) {
      await prisma.storeProduct.createMany({
        data: stores.map(s => ({
          storeId: s.id,
          productId: product.id,
          stockQuantity: 0
        })),
        skipDuplicates: true
      })
    }

    // 3. Catat audit log
    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'CREATE_PRODUCT',
      entityType: 'Product',
      entityId: product.id,
      entityName: product.name,
      detail: { price, description }
    })

    revalidatePath('/products')
    revalidatePath('/stores')
    revalidatePath('/')
    return { success: true, product }
  } catch (error: any) {
    console.error('Error createMasterProduct:', error)
    return { error: error?.message || 'Gagal menambah produk master ke database' }
  }
}

// ── 2. Add / Link Product to Store ──────────────────────────────────
export async function addStoreProduct(formData: FormData) {
  const storeId = formData.get('storeId') as string
  const productId = formData.get('productId') as string
  const stockQuantity = parseInt(formData.get('stockQuantity') as string)

  try {
    await assertStoreAccess(storeId)
  } catch {
    return { error: 'Unauthorized or Forbidden' }
  }

  if (!storeId || !productId || isNaN(stockQuantity) || stockQuantity < 0) {
    return { error: 'Data tidak lengkap atau tidak valid' }
  }

  try {
    const user = await getSessionUser()

    const storeProduct = await prisma.storeProduct.upsert({
      where: {
        storeId_productId: { storeId, productId }
      },
      create: {
        storeId,
        productId,
        stockQuantity
      },
      update: {
        stockQuantity: { increment: stockQuantity }
      },
      include: {
        product: { select: { name: true } },
        store: { select: { name: true } }
      }
    })

    await writeAuditLog({
      userId: user?.id,
      username: user?.username,
      action: 'RESTOCK_PRODUCT',
      entityType: 'StoreProduct',
      entityId: productId,
      entityName: storeProduct.product.name,
      storeId: storeId,
      detail: { stockQuantity, action: 'addStoreProduct' }
    })

    revalidatePath(`/stores/${storeId}`)
    revalidatePath('/stores')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error('Error addStoreProduct:', error)
    return { error: error?.message || 'Gagal menambahkan produk ke cabang' }
  }
}

// ── 3. Update Master Product ────────────────────────────────────────
export async function updateProduct(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const productId = formData.get('productId') as string
  const storeId = formData.get('storeId') as string | null
  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const imageUrl = (formData.get('imageUrl') as string)?.trim() || null
  const price = parseFloat(formData.get('price') as string)
  const discount = parseInt(formData.get('discount') as string) || 0

  if (!productId || !name || isNaN(price) || price <= 0) {
    return { error: 'Data tidak lengkap atau tidak valid' }
  }
  if (discount < 0 || discount > 100) {
    return { error: 'Diskon harus antara 0 dan 100 persen' }
  }

  try {
    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        description,
        imageUrl,
        price,
        discount
      }
    })

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'UPDATE_PRODUCT',
      entityType: 'Product',
      entityId: productId,
      entityName: name,
      detail: { price, discount, description }
    })

    if (storeId) revalidatePath(`/stores/${storeId}`)
    revalidatePath('/products')
    revalidatePath('/')
    return { success: true, product: updated }
  } catch (error: any) {
    console.error('Error updateProduct:', error)
    return { error: error?.message || 'Gagal memperbarui produk' }
  }
}


// ── 5. Record Bulk Sales (Keranjang Kasir) ───────────────────────────
export async function recordBulkSales(items: { productId: string; quantity: number }[], storeId: string) {
  try {
    await assertStoreAccess(storeId)
  } catch {
    return { error: 'Unauthorized or Forbidden' }
  }

  if (!items || items.length === 0 || !storeId) {
    return { error: 'Keranjang belanja kosong' }
  }

  try {
    const user = await getSessionUser()
    const productIds = items.map(i => i.productId)

    const storeProducts = await prisma.storeProduct.findMany({
      where: {
        storeId,
        productId: { in: productIds }
      },
      include: { product: true }
    })

    const spMap = new Map(storeProducts.map(sp => [sp.productId, sp]))

    // Verifikasi ketersediaan stok
    for (const item of items) {
      const sp = spMap.get(item.productId)
      if (!sp) {
        return { error: `Produk tidak ditemukan di cabang ini` }
      }
      if (sp.stockQuantity < item.quantity) {
        return { error: `Stok "${sp.product.name}" tidak mencukupi (Tersedia: ${sp.stockQuantity}, Diminta: ${item.quantity})` }
      }
    }

    const now = new Date()

    // Eksekusi transaksi atomik di PostgreSQL
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const sp = spMap.get(item.productId)!
        const discount = sp.product.discount || 0
        const effectivePrice = sp.product.price * (1 - discount / 100)
        const totalAmount = effectivePrice * item.quantity
        const profitAmount = totalAmount * 0.35

        // Potong stok
        await tx.storeProduct.update({
          where: { storeId_productId: { storeId, productId: item.productId } },
          data: { stockQuantity: { decrement: item.quantity } }
        })

        // Catat penjualan
        await tx.sale.create({
          data: {
            storeId,
            productId: item.productId,
            quantitySold: item.quantity,
            totalAmount,
            profitAmount,
            saleDate: now
          }
        })
      }
    })

    await writeAuditLog({
      userId: user?.id,
      username: user?.username,
      action: 'RECORD_SALE',
      entityType: 'Sale',
      storeId,
      detail: { itemCount: items.length, items }
    })

    revalidatePath(`/stores/${storeId}`)
    revalidatePath('/')
    revalidatePath('/reports')
    return { success: true }
  } catch (error: any) {
    console.error('Error recordBulkSales:', error)
    return { error: error?.message || 'Gagal memproses transaksi kasir' }
  }
}

// ── 6. Delete Master Product ────────────────────────────────────────
export async function deleteMasterProduct(id: string) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }

  try {
    const product = await prisma.product.findUnique({ where: { id }, select: { name: true } })

    await prisma.$transaction([
      prisma.sale.deleteMany({ where: { productId: id } }),
      prisma.storeProduct.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } })
    ])

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'DELETE_MASTER_PRODUCT',
      entityType: 'Product',
      entityId: id,
      entityName: product?.name,
    })

    revalidatePath('/products')
    revalidatePath('/stores')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleteMasterProduct:', error)
    return { error: error?.message || 'Gagal menghapus produk master' }
  }
}

// ── 7. Bulk Update Prices ───────────────────────────────────────────
export async function updateBulkPrices(items: { id: string; price: number }[]) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }

  try {
    await prisma.$transaction(
      items.map(item =>
        prisma.product.update({
          where: { id: item.id },
          data: { price: item.price }
        })
      )
    )

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'UPDATE_BULK_PRICES',
      entityType: 'Product',
      detail: { updatedCount: items.length }
    })

    revalidatePath('/products')
    revalidatePath('/stores')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error('Error updateBulkPrices:', error)
    return { error: error?.message || 'Gagal menyimpan perubahan harga' }
  }
}

// ── 8. Adjust All Prices (Global +/-) ────────────────────────────────
export async function adjustAllPrices(
  type: 'increase' | 'decrease',
  amountType: 'nominal' | 'percent',
  value: number
) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }

  try {
    const products = await prisma.product.findMany()

    await prisma.$transaction(
      products.map(p => {
        let newPrice = p.price
        if (amountType === 'nominal') {
          newPrice = type === 'increase' ? p.price + value : Math.max(1000, p.price - value)
        } else {
          const delta = (p.price * value) / 100
          newPrice = type === 'increase' ? p.price + delta : Math.max(1000, p.price - delta)
        }
        return prisma.product.update({
          where: { id: p.id },
          data: { price: Math.round(newPrice) }
        })
      })
    )

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'ADJUST_ALL_PRICES',
      entityType: 'Product',
      detail: { type, amountType, value }
    })

    revalidatePath('/products')
    revalidatePath('/stores')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error('Error adjustAllPrices:', error)
    return { error: error?.message || 'Gagal menyesuaikan harga secara global' }
  }
}

// ── 9. Restock Product in Store ─────────────────────────────────────
export async function restockProduct(storeId: string, productId: string, quantity: number) {
  try {
    await assertStoreAccess(storeId)
  } catch {
    return { error: 'Unauthorized or Forbidden' }
  }

  if (isNaN(quantity) || quantity <= 0) {
    return { error: 'Jumlah restock harus lebih dari 0' }
  }

  try {
    const user = await getSessionUser()

    const updated = await prisma.storeProduct.update({
      where: { storeId_productId: { storeId, productId } },
      data: { stockQuantity: { increment: quantity } },
      include: { product: { select: { name: true } } }
    })

    await writeAuditLog({
      userId: user?.id,
      username: user?.username,
      action: 'RESTOCK_PRODUCT',
      entityType: 'StoreProduct',
      entityId: productId,
      entityName: updated.product.name,
      storeId,
      detail: { quantityAdded: quantity, newStock: updated.stockQuantity }
    })

    revalidatePath(`/stores/${storeId}`)
    revalidatePath('/stores')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error('Error restockProduct:', error)
    return { error: error?.message || 'Gagal menambah stok' }
  }
}

// ── 10. Delete Product from Store ───────────────────────────────────
export async function deleteStoreProduct(storeId: string, productId: string) {
  try {
    await assertStoreAccess(storeId)
  } catch {
    return { error: 'Unauthorized or Forbidden' }
  }

  try {
    const user = await getSessionUser()

    await prisma.storeProduct.delete({
      where: { storeId_productId: { storeId, productId } }
    })

    await writeAuditLog({
      userId: user?.id,
      username: user?.username,
      action: 'DELETE_PRODUCT',
      entityType: 'StoreProduct',
      entityId: productId,
      storeId,
    })

    revalidatePath(`/stores/${storeId}`)
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleteStoreProduct:', error)
    return { error: error?.message || 'Gagal menghapus produk dari cabang' }
  }
}

export async function removeStoreProduct(storeId: string, productId: string) {
  return deleteStoreProduct(storeId, productId)
}

// ── 11. Bulk Restock Products ───────────────────────────────────────
export async function bulkRestockProducts(
  items: { productId: string; qty: number }[],
  storeId: string
) {
  try {
    await assertStoreAccess(storeId)
  } catch {
    return { error: 'Unauthorized or Forbidden' }
  }

  if (!items || items.length === 0 || !storeId) {
    return { error: 'Tidak ada item untuk direstock' }
  }

  try {
    const user = await getSessionUser()

    await prisma.$transaction(
      items.map(item =>
        prisma.storeProduct.upsert({
          where: { storeId_productId: { storeId, productId: item.productId } },
          create: {
            storeId,
            productId: item.productId,
            stockQuantity: item.qty
          },
          update: {
            stockQuantity: { increment: item.qty }
          }
        })
      )
    )

    await writeAuditLog({
      userId: user?.id,
      username: user?.username,
      action: 'RESTOCK_PRODUCT',
      entityType: 'StoreProduct',
      storeId,
      detail: { restockedCount: items.length, items }
    })

    revalidatePath(`/stores/${storeId}`)
    revalidatePath('/stores')
    revalidatePath('/')
    return { success: true, count: items.length }
  } catch (error: any) {
    console.error('Error bulkRestockProducts:', error)
    return { error: error?.message || 'Gagal melakukan restock produk' }
  }
}