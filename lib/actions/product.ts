'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { writeAuditLog } from '@/lib/audit'

// Helper: ambil info user dari session
async function getSessionUser() {
  const session = await getSession()
  return session?.user ?? null
}

// ─────────────────────────────────────────────
// CREATE PRODUCT
// ─────────────────────────────────────────────
export async function createProduct(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return { error: 'Unauthorized' }

  const storeId = formData.get('storeId') as string
  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const imageUrl = (formData.get('imageUrl') as string)?.trim() || null
  const price = parseFloat(formData.get('price') as string)
  const stockQuantity = parseInt(formData.get('stockQuantity') as string)

  if (
    !storeId ||
    !name ||
    isNaN(price) ||
    price <= 0 ||
    isNaN(stockQuantity) ||
    stockQuantity < 0
  ) {
    return { error: 'Data tidak lengkap atau tidak valid' }
  }

  try {
    const product = await prisma.product.create({
      data: { storeId, name, description, imageUrl, price, stockQuantity }
    })

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'CREATE_PRODUCT',
      entityType: 'Product',
      entityId: product.id,
      entityName: name,
      storeId,
      detail: { price, stockQuantity },
    })

    revalidatePath(`/stores/${storeId}`)
    return { success: true, product }
  } catch (error) {
    return { error: 'Gagal menambah produk' }
  }
}

// ─────────────────────────────────────────────
// UPDATE PRODUCT
// ─────────────────────────────────────────────
export async function updateProduct(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return { error: 'Unauthorized' }

  const productId = formData.get('productId') as string
  const storeId = formData.get('storeId') as string
  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const imageUrl = (formData.get('imageUrl') as string)?.trim() || null
  const price = parseFloat(formData.get('price') as string)
  const discount = parseInt(formData.get('discount') as string) || 0

  if (!productId || !storeId || !name || isNaN(price) || price <= 0) {
    return { error: 'Data tidak lengkap atau tidak valid' }
  }

  if (discount < 0 || discount > 100) {
    return { error: 'Diskon harus antara 0 dan 100 persen' }
  }

  try {
    await prisma.product.update({
      where: { id: productId },
      data: { name, description, imageUrl, price, discount }
    })

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'UPDATE_PRODUCT',
      entityType: 'Product',
      entityId: productId,
      entityName: name,
      storeId,
      detail: { price, discount },
    })

    revalidatePath(`/stores/${storeId}`)
    return { success: true }
  } catch (error: any) {
    console.error('updateProduct error:', error)
    return { error: error?.message || 'Gagal memperbarui produk' }
  }
}

// ─────────────────────────────────────────────
// RECORD SALE
// ─────────────────────────────────────────────
export async function recordSale(
  productId: string,
  storeId: string,
  quantity: number
) {
  const user = await getSessionUser()
  if (!user) return { error: 'Unauthorized' }

  if (!productId || !storeId || quantity <= 0 || !Number.isInteger(quantity)) {
    return { error: 'Data penjualan tidak valid' }
  }

  try {
    let productName = ''
    let totalAmount = 0

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId }
      })

      if (!product) throw new Error('PRODUCT_NOT_FOUND')

      productName = product.name
      const discountPct = (product as any).discount || 0
      const effectivePrice = product.price * (1 - discountPct / 100)
      totalAmount = effectivePrice * quantity
      const profitAmount = totalAmount

      const updated = await tx.product.updateMany({
        where: {
          id: productId,
          stockQuantity: { gte: quantity }
        },
        data: { stockQuantity: { decrement: quantity } }
      })

      if (updated.count === 0) {
        throw new Error('INSUFFICIENT_STOCK')
      }

      await tx.sale.create({
        data: {
          storeId,
          productId,
          quantitySold: quantity,
          totalAmount,
          profitAmount
        }
      })
    })

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'RECORD_SALE',
      entityType: 'Sale',
      entityId: productId,
      entityName: productName,
      storeId,
      detail: { quantity, totalAmount },
    })

    revalidatePath(`/stores/${storeId}`)
    return { success: true }
  } catch (error: any) {
    if (error?.message === 'PRODUCT_NOT_FOUND') {
      return { error: 'Produk tidak ditemukan' }
    }
    if (error?.message === 'INSUFFICIENT_STOCK') {
      return { error: 'Stok tidak cukup atau sudah habis terjual' }
    }
    return { error: 'Gagal mencatat penjualan' }
  }
}

// ─────────────────────────────────────────────
// DELETE PRODUCT
// ─────────────────────────────────────────────
export async function deleteProduct(productId: string, storeId: string) {
  const user = await getSessionUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    // Ambil nama produk sebelum dihapus untuk dicatat di log
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true }
    })

    await prisma.$transaction([
      prisma.sale.deleteMany({ where: { productId } }),
      prisma.product.delete({ where: { id: productId } })
    ])

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'DELETE_PRODUCT',
      entityType: 'Product',
      entityId: productId,
      entityName: product?.name ?? productId,
      storeId,
    })

    revalidatePath(`/stores/${storeId}`)
    return { success: true }
  } catch (error) {
    return { error: 'Gagal menghapus produk' }
  }
}

// ─────────────────────────────────────────────
// BULK RESTOCK
// ─────────────────────────────────────────────
export async function bulkRestockProducts(
  restocks: { productId: string; qty: number; name?: string }[],
  storeId: string
) {
  const user = await getSessionUser()
  if (!user) return { error: 'Unauthorized' }

  const validRestocks = restocks.filter(
    (r) => Number.isInteger(r.qty) && r.qty > 0
  )

  if (validRestocks.length === 0) {
    return { error: 'Tidak ada produk yang diisi jumlah restoknya' }
  }

  try {
    await prisma.$transaction(
      validRestocks.map((r) =>
        prisma.product.update({
          where: { id: r.productId },
          data: { stockQuantity: { increment: r.qty } }
        })
      )
    )

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'RESTOCK_PRODUCT',
      entityType: 'Product',
      storeId,
      detail: {
        items: validRestocks.map(r => ({ productId: r.productId, name: r.name, qty: r.qty }))
      },
    })

    revalidatePath(`/stores/${storeId}`)
    revalidatePath(`/stores/${storeId}/restock`)
    return { success: true, count: validRestocks.length }
  } catch (error) {
    return { error: 'Gagal menyimpan restok. Silakan coba lagi.' }
  }
}

// ─────────────────────────────────────────────
// BULK SALES (POS CART CHECKOUT)
// ─────────────────────────────────────────────
export async function recordBulkSales(
  items: { productId: string; quantity: number }[],
  storeId: string
) {
  const user = await getSessionUser()
  if (!user) return { error: 'Unauthorized' }

  const validItems = items.filter(
    (item) => item.productId && Number.isInteger(item.quantity) && item.quantity > 0
  )

  if (validItems.length === 0) {
    return { error: 'Keranjang kosong atau data tidak valid' }
  }

  try {
    let totalAll = 0
    const soldItems: { name: string; qty: number }[] = []

    await prisma.$transaction(async (tx) => {
      for (const item of validItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        })

        if (!product) throw new Error(`PRODUCT_NOT_FOUND:${item.productId}`)

        const discountPct = (product as any).discount || 0
        const effectivePrice = product.price * (1 - discountPct / 100)
        const totalAmount = effectivePrice * item.quantity
        const profitAmount = totalAmount
        totalAll += totalAmount
        soldItems.push({ name: product.name, qty: item.quantity })

        const updated = await tx.product.updateMany({
          where: {
            id: item.productId,
            stockQuantity: { gte: item.quantity }
          },
          data: { stockQuantity: { decrement: item.quantity } }
        })

        if (updated.count === 0) {
          throw new Error(`INSUFFICIENT_STOCK:${product.name}`)
        }

        await tx.sale.create({
          data: {
            storeId,
            productId: item.productId,
            quantitySold: item.quantity,
            totalAmount,
            profitAmount
          }
        })
      }
    })

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'RECORD_SALE',
      entityType: 'Sale',
      storeId,
      detail: { items: soldItems, total: totalAll },
    })

    revalidatePath(`/stores/${storeId}`)
    return { success: true }
  } catch (error: any) {
    if (error?.message?.startsWith('PRODUCT_NOT_FOUND')) {
      return { error: 'Ada produk yang tidak ditemukan di database' }
    }
    if (error?.message?.startsWith('INSUFFICIENT_STOCK')) {
      const productName = error.message.split(':')[1]
      return { error: `Stok tidak cukup untuk produk: ${productName}` }
    }
    return { error: 'Gagal memproses transaksi kasir' }
  }
}