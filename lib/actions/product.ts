'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { writeAuditLog } from '@/lib/audit'
import { assertStoreAccess } from '@/lib/actions/auth-guard'

async function getSessionUser() {
  const session = await getSession()
  return session?.user ?? null
}

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
    const existing = await prisma.product.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    })

    if (existing) {
      return { error: 'Produk dengan nama ini sudah ada di Master Katalog' }
    }

    const product = await prisma.product.create({
      data: { name, description, imageUrl, price }
    })

    // Auto-populate the new master product into all existing stores with 0 stock
    const stores = await prisma.store.findMany({ select: { id: true } })
    if (stores.length > 0) {
      await prisma.storeProduct.createMany({
        data: stores.map(s => ({
          storeId: s.id,
          productId: product.id,
          stockQuantity: 0
        }))
      })
    }

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'CREATE_PRODUCT',
      entityType: 'Product',
      entityId: product.id,
      entityName: name,
      detail: { price },
    })

    revalidatePath('/products')
    return { success: true, product }
  } catch (error) {
    console.error(error)
    return { error: 'Gagal menambah produk master' }
  }
}

export async function addStoreProduct(formData: FormData) {
  const storeId = formData.get('storeId') as string
  const productId = formData.get('productId') as string
  const stockQuantity = parseInt(formData.get('stockQuantity') as string)

  let user;
  try {
    user = await assertStoreAccess(storeId);
  } catch (err) {
    return { error: 'Unauthorized or Forbidden' };
  }

  if (!storeId || !productId || isNaN(stockQuantity) || stockQuantity < 0) {
    return { error: 'Data tidak lengkap atau tidak valid' }
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return { error: 'Produk Master tidak ditemukan' }

    await prisma.storeProduct.upsert({
      where: {
        storeId_productId: { storeId, productId }
      },
      update: {
        stockQuantity: { increment: stockQuantity }
      },
      create: {
        storeId,
        productId,
        stockQuantity
      }
    })

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'RESTOCK_PRODUCT', // Or you could use a new action type like ADD_STORE_PRODUCT
      entityType: 'StoreProduct',
      entityId: productId,
      entityName: product.name,
      storeId,
      detail: { stockAdded: stockQuantity },
    })

    revalidatePath(`/stores/${storeId}`)
    return { success: true, product }
  } catch (error) {
    console.error(error)
    return { error: 'Gagal menambah produk ke cabang' }
  }
}

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
      storeId: storeId || undefined,
      detail: { price, discount },
    })

    if (storeId) {
      revalidatePath(`/stores/${storeId}`)
    }
    revalidatePath('/products')
    revalidatePath('/', 'layout')
    
    return { success: true }
  } catch (error: any) {
    return { error: error?.message || 'Gagal memperbarui produk' }
  }
}

export async function recordSale(productId: string, storeId: string, quantity: number) {
  let user;
  try {
    user = await assertStoreAccess(storeId);
  } catch (err) {
    return { error: 'Unauthorized or Forbidden' };
  }

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

      const updated = await tx.storeProduct.updateMany({
        where: {
          productId,
          storeId,
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
    if (error?.message === 'PRODUCT_NOT_FOUND') return { error: 'Produk tidak ditemukan' }
    if (error?.message === 'INSUFFICIENT_STOCK') return { error: 'Stok tidak cukup atau sudah habis terjual' }
    return { error: 'Gagal mencatat penjualan' }
  }
}

export async function deleteMasterProduct(productId: string) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true }
    })

    // Ini akan menghapus Master Product dan cascade menghapus semua StoreProduct & Sale
    await prisma.product.delete({
      where: { id: productId }
    })

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'DELETE_MASTER_PRODUCT',
      entityType: 'Product',
      entityId: productId,
      entityName: product?.name ?? productId,
    })

    revalidatePath('/products')
    // Meminta semua halaman toko di-revalidate karena produk hilang
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    return { error: 'Gagal menghapus produk master' }
  }
}

export async function bulkRestockProducts(
  restocks: { productId: string; qty: number; name?: string }[],
  storeId: string
) {
  let user;
  try {
    user = await assertStoreAccess(storeId);
  } catch (err) {
    return { error: 'Unauthorized or Forbidden' };
  }

  const validRestocks = restocks.filter((r) => Number.isInteger(r.qty) && r.qty > 0)
  if (validRestocks.length === 0) return { error: 'Tidak ada produk yang diisi jumlah restoknya' }

  try {
    await prisma.$transaction(
      validRestocks.map((r) =>
        prisma.storeProduct.updateMany({
          where: { productId: r.productId, storeId },
          data: { stockQuantity: { increment: r.qty } }
        })
      )
    )

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'RESTOCK_PRODUCT',
      entityType: 'StoreProduct',
      storeId,
      detail: { items: validRestocks.map(r => ({ productId: r.productId, name: r.name, qty: r.qty })) },
    })

    revalidatePath(`/stores/${storeId}`)
    revalidatePath(`/stores/${storeId}/restock`)
    return { success: true, count: validRestocks.length }
  } catch (error) {
    return { error: 'Gagal menyimpan restok. Silakan coba lagi.' }
  }
}

export async function recordBulkSales(
  items: { productId: string; quantity: number }[],
  storeId: string
) {
  let user;
  try {
    user = await assertStoreAccess(storeId);
  } catch (err) {
    return { error: 'Unauthorized or Forbidden' };
  }

  const validItems = items.filter((item) => item.productId && Number.isInteger(item.quantity) && item.quantity > 0)
  if (validItems.length === 0) return { error: 'Keranjang kosong atau data tidak valid' }

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

        const updated = await tx.storeProduct.updateMany({
          where: {
            productId: item.productId,
            storeId,
            stockQuantity: { gte: item.quantity }
          },
          data: { stockQuantity: { decrement: item.quantity } }
        })

        if (updated.count === 0) throw new Error(`INSUFFICIENT_STOCK:${product.name}`)

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
    if (error?.message?.startsWith('PRODUCT_NOT_FOUND')) return { error: 'Ada produk yang tidak ditemukan di database' }
    if (error?.message?.startsWith('INSUFFICIENT_STOCK')) {
      const productName = error.message.split(':')[1]
      return { error: `Stok tidak cukup untuk produk: ${productName}` }
    }
    return { error: 'Gagal memproses transaksi kasir' }
  }
}

export async function updateBulkPrices(items: { id: string, price: number }[]) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const validItems = items.filter(i => i.id && !isNaN(i.price) && i.price >= 0)
  if (validItems.length === 0) return { error: 'Tidak ada data valid untuk disimpan' }

  try {
    await prisma.$transaction(
      validItems.map(item => 
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
      detail: { count: validItems.length },
    })

    revalidatePath('/products')
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    return { error: 'Gagal menyimpan perubahan harga secara massal' }
  }
}

export async function adjustAllPrices(type: 'increase' | 'decrease', amountType: 'nominal' | 'percent', value: number) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }
  if (isNaN(value) || value <= 0) return { error: 'Nilai harus lebih dari 0' }

  try {
    const products = await prisma.product.findMany({ select: { id: true, price: true } })
    
    await prisma.$transaction(
      products.map(product => {
        let newPrice = product.price
        if (amountType === 'nominal') {
          newPrice = type === 'increase' ? product.price + value : Math.max(0, product.price - value)
        } else if (amountType === 'percent') {
          const change = product.price * (value / 100)
          newPrice = type === 'increase' ? product.price + change : Math.max(0, product.price - change)
        }

        return prisma.product.update({
          where: { id: product.id },
          data: { price: Math.round(newPrice) }
        })
      })
    )

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'ADJUST_ALL_PRICES',
      entityType: 'Product',
      detail: { type, amountType, value },
    })

    revalidatePath('/products')
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    return { error: 'Gagal menyesuaikan harga secara massal' }
  }
}