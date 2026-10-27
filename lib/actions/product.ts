'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { assertStoreAccess } from '@/lib/actions/auth-guard'
import { writeAuditLog } from '@/lib/audit'
import { sendTelegramAlert } from '@/lib/telegram'

async function getSessionUser() {
  const session = await getSession()
  if (!session?.user) return null

  if (!session.user.username) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, username: true, name: true, role: true, storeId: true }
      })
      if (dbUser) {
        return {
          ...session.user,
          username: dbUser.username,
          name: dbUser.name,
        }
      }
    } catch {
      // fallback
    }
  }

  return session.user
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
export async function recordBulkSales(
  items: { productId: string; quantity: number }[],
  storeId: string,
  receiptInfo?: {
    receiptNo?: string
    paymentMethod?: 'Tunai' | 'QRIS' | 'Transfer'
    cashPaid?: number
    change?: number
  }
) {
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
        const totalAmount = Math.round(effectivePrice * item.quantity)
        const profitAmount = Math.round(totalAmount * 0.35)

        // Potong stok bersyarat secara atomik (Mencegah Race Condition stok minus)
        const updateResult = await tx.storeProduct.updateMany({
          where: {
            storeId,
            productId: item.productId,
            stockQuantity: { gte: item.quantity }
          },
          data: {
            stockQuantity: { decrement: item.quantity }
          }
        })

        if (updateResult.count === 0) {
          throw new Error(`Stok untuk produk "${sp.product.name}" tidak mencukupi atau telah berkurang saat transaksi sedang diproses.`)
        }

        // Catat penjualan dengan nomor resi dan metode bayar
        await tx.sale.create({
          data: {
            storeId,
            productId: item.productId,
            quantitySold: item.quantity,
            totalAmount,
            profitAmount,
            saleDate: now,
            receiptNo: receiptInfo?.receiptNo ?? null,
            paymentMethod: receiptInfo?.paymentMethod ?? 'Tunai',
            cashPaid: receiptInfo?.cashPaid ?? null,
            change: receiptInfo?.change ?? null,
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
      detail: { 
        receiptNo: receiptInfo?.receiptNo,
        paymentMethod: receiptInfo?.paymentMethod,
        itemCount: items.length, 
        items 
      }
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

// ── 5.1 Verify Receipt (Validasi Keaslian Struk) ────────────────────────
export async function verifyReceipt(receiptNo: string) {
  if (!receiptNo || typeof receiptNo !== 'string') {
    return { valid: false, error: 'Nomor resi tidak valid' }
  }

  const cleanNo = receiptNo.trim()
  if (!cleanNo) {
    return { valid: false, error: 'Nomor resi tidak boleh kosong' }
  }

  try {
    const sales = await prisma.sale.findMany({
      where: { receiptNo: cleanNo },
      include: {
        product: { select: { id: true, name: true, price: true, discount: true, imageUrl: true } },
        store: { select: { id: true, name: true, location: true } }
      },
      orderBy: { saleDate: 'asc' }
    })

    if (!sales || sales.length === 0) {
      return { 
        valid: false, 
        error: `Nomor struk "${cleanNo}" TIDAK DITEMUKAN di database. Kemungkinan struk ini palsu atau salah nomor.` 
      }
    }

    const firstSale = sales[0]
    const store = firstSale.store
    const saleDate = firstSale.saleDate
    const paymentMethod = firstSale.paymentMethod || 'Tunai'
    const cashPaid = firstSale.cashPaid ?? 0
    const change = firstSale.change ?? 0

    const items = sales.map(s => {
      const discount = s.product.discount || 0
      const price = s.product.price
      return {
        id: s.id,
        productId: s.productId,
        name: s.product.name,
        price,
        discount,
        quantity: s.quantitySold,
        total: s.totalAmount,
        imageUrl: s.product.imageUrl
      }
    })

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const grandTotal = items.reduce((sum, item) => sum + item.total, 0)
    const discountTotal = Math.max(0, subtotal - grandTotal)

    return {
      valid: true,
      data: {
        receiptNo: cleanNo,
        date: saleDate.toISOString(),
        storeName: store?.name || 'Family Bakery',
        storeLocation: store?.location || null,
        items,
        subtotal,
        discountTotal,
        grandTotal,
        paymentMethod,
        cashPaid,
        change,
      }
    }
  } catch (error: any) {
    console.error('Error verifyReceipt:', error)
    return { valid: false, error: 'Terjadi kesalahan sistem saat memverifikasi struk' }
  }
}

// ── 6. Delete Master Product ────────────────────────────────────────
export async function deleteMasterProduct(id: string) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }

  try {
    const product = await prisma.product.findUnique({ where: { id }, select: { name: true } })

    const salesCount = await prisma.sale.count({ where: { productId: id } })
    if (salesCount > 0) {
      return {
        error: `Produk "${product?.name || id}" telah memiliki catatan riwayat transaksi penjualan. Produk tidak dapat dihapus permanen untuk menjaga keaslian pembukuan keuangan. Anda dapat mengubah nama produk atau menyetel stoknya menjadi 0.`
      }
    }

    await prisma.$transaction([
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

// ── 12. Submit Restock Request (Manager Request / Admin Direct) ─────
export async function submitRestockRequest(
  items: { productId: string; qty: number }[],
  storeId: string,
  notes?: string,
  isDirectOverride: boolean = false
) {
  try {
    await assertStoreAccess(storeId)
  } catch {
    return { error: 'Unauthorized or Forbidden' }
  }

  if (!items || items.length === 0 || !storeId) {
    return { error: 'Tidak ada item untuk direstock' }
  }

  const validItems = items.filter(i => i.qty > 0)
  if (validItems.length === 0) {
    return { error: 'Jumlah restok harus lebih dari 0' }
  }

  try {
    const user = await getSessionUser()
    if (!user) return { error: 'Unauthorized' }

    // Jika Super Admin memilih override restok langsung secara eksplisit
    if (isDirectOverride && user.role === 'ADMIN') {
      return await bulkRestockProducts(validItems, storeId)
    }

    // Default: Buat pengajuan RestockRequest (status PENDING) untuk disetujui Super Admin
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const rand = String(now.getTime()).slice(-4)
    const batchNo = `REQ-${y}${m}${d}-${rand}`

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { name: true }
    })

    const requester = user.username || user.name || (user.role === 'ADMIN' ? 'Super Admin' : 'Cabang')

    await prisma.restockRequest.createMany({
      data: validItems.map(item => ({
        batchNo,
        storeId,
        productId: item.productId,
        quantity: item.qty,
        status: 'PENDING',
        notes: notes?.trim() || null,
        requestedBy: requester,
      }))
    })

    await writeAuditLog({
      userId: user.id,
      username: requester,
      action: 'REQUEST_RESTOCK',
      entityType: 'RestockRequest',
      entityId: batchNo,
      storeId,
      detail: { batchNo, totalItems: validItems.length, items: validItems, notes }
    })

    // Kirim notifikasi bot Telegram ke grup Super Admin
    const totalUnits = validItems.reduce((acc, curr) => acc + curr.qty, 0)
    await sendTelegramAlert(`
📦 <b>PERMINTAAN RESTOK BARU MENUNGGU PERSETUJUAN</b>
Nomor Batch: <code>${batchNo}</code>
Cabang: <b>${store?.name || 'Cabang'}</b>
Diajukan oleh: <b>${requester}</b>
Total Produk: <b>${validItems.length} varian (${totalUnits} unit)</b>
Catatan: <i>${notes ? notes : '-'}</i>

👉 <i>Buka Dashboard Cabang untuk menyetujui penyetokan.</i>
`)

    revalidatePath(`/stores/${storeId}`)
    revalidatePath(`/stores/${storeId}/restock`)
    revalidatePath('/stores')
    revalidatePath('/')
    return { success: true, pendingApproval: true, batchNo, count: validItems.length }
  } catch (error: any) {
    console.error('Error submitRestockRequest:', error)
    return { error: error?.message || 'Gagal mengajukan permintaan restok' }
  }
}

// ── 13. Approve Restock Batch (Super Admin Only) ────────────────────
export async function approveRestockBatch(batchNo: string) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return { error: 'Unauthorized: Hanya Super Admin yang dapat menyetujui restok' }
  }

  try {
    const requests = await prisma.restockRequest.findMany({
      where: { batchNo, status: 'PENDING' },
      include: {
        product: { select: { name: true } },
        store: { select: { id: true, name: true } },
      }
    })

    if (!requests || requests.length === 0) {
      return { error: 'Permintaan restok tidak ditemukan atau sudah diproses' }
    }

    const storeId = requests[0].storeId
    const storeName = requests[0].store.name

    await prisma.$transaction(async (tx) => {
      // 1. Tambah stok cabang
      for (const req of requests) {
        await tx.storeProduct.upsert({
          where: { storeId_productId: { storeId: req.storeId, productId: req.productId } },
          create: {
            storeId: req.storeId,
            productId: req.productId,
            stockQuantity: req.quantity
          },
          update: {
            stockQuantity: { increment: req.quantity }
          }
        })
      }

      // 2. Update status permohonan ke APPROVED
      await tx.restockRequest.updateMany({
        where: { batchNo, status: 'PENDING' },
        data: {
          status: 'APPROVED',
          approvedBy: user.username,
        }
      })
    })

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'APPROVE_RESTOCK',
      entityType: 'RestockRequest',
      entityId: batchNo,
      storeId,
      detail: { batchNo, count: requests.length, approvedBy: user.username }
    })

    const totalUnits = requests.reduce((acc, r) => acc + r.quantity, 0)
    await sendTelegramAlert(`
✅ <b>RESTOK BERHASIL DISETUJUI</b>
Nomor Batch: <code>${batchNo}</code>
Cabang: <b>${storeName}</b>
Disetujui oleh: <b>${user.username}</b>
Total Stok Masuk: <b>+${totalUnits} unit</b>
`)

    revalidatePath(`/stores/${storeId}`)
    revalidatePath('/stores')
    revalidatePath('/')
    return { success: true, count: requests.length }
  } catch (error: any) {
    console.error('Error approveRestockBatch:', error)
    return { error: error?.message || 'Gagal menyetujui restok' }
  }
}

// ── 14. Reject Restock Batch (Super Admin Only) ─────────────────────
export async function rejectRestockBatch(batchNo: string, reason?: string) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return { error: 'Unauthorized: Hanya Super Admin yang dapat menolak restok' }
  }

  try {
    const requests = await prisma.restockRequest.findMany({
      where: { batchNo, status: 'PENDING' },
      include: { store: { select: { name: true } } }
    })

    if (!requests || requests.length === 0) {
      return { error: 'Permintaan restok tidak ditemukan atau sudah diproses' }
    }

    const storeId = requests[0].storeId
    const storeName = requests[0].store.name

    await prisma.restockRequest.updateMany({
      where: { batchNo, status: 'PENDING' },
      data: {
        status: 'REJECTED',
        approvedBy: user.username,
        notes: reason ? reason : undefined,
      }
    })

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'REJECT_RESTOCK',
      entityType: 'RestockRequest',
      entityId: batchNo,
      storeId,
      detail: { batchNo, reason, rejectedBy: user.username }
    })

    await sendTelegramAlert(`
❌ <b>PERMINTAAN RESTOK DITOLAK</b>
Nomor Batch: <code>${batchNo}</code>
Cabang: <b>${storeName}</b>
Ditolak oleh: <b>${user.username}</b>
Alasan: <i>${reason || 'Tidak ada alasan'}</i>
`)

    revalidatePath(`/stores/${storeId}`)
    revalidatePath(`/stores/${storeId}/restock`)
    revalidatePath('/stores')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error('Error rejectRestockBatch:', error)
    return { error: error?.message || 'Gagal menolak restok' }
  }
}

// ── 15. Get Pending Restock Batches (For Admin & Store Branch) ───────
export async function getPendingRestockBatches(storeId?: string) {
  const user = await getSessionUser()
  if (!user) return []
  if (!storeId && user.role !== 'ADMIN') return []
  if (storeId && user.role !== 'ADMIN' && user.storeId !== storeId) return []

  try {
    const whereClause: any = { status: 'PENDING' }
    if (storeId) {
      whereClause.storeId = storeId
    }

    const requests = await prisma.restockRequest.findMany({
      where: whereClause,
      include: {
        store: { select: { id: true, name: true, location: true } },
        product: { select: { id: true, name: true, price: true, imageUrl: true } },
      },
      orderBy: { createdAt: 'desc' }
    })

    // Kelompokkan berdasarkan batchNo
    const batchMap = new Map<string, {
      batchNo: string
      store: { id: string; name: string; location: string | null }
      requestedBy: string
      notes: string | null
      createdAt: Date
      items: { product: any; quantity: number }[]
      totalUnits: number
    }>()

    for (const req of requests) {
      if (!batchMap.has(req.batchNo)) {
        batchMap.set(req.batchNo, {
          batchNo: req.batchNo,
          store: req.store,
          requestedBy: req.requestedBy,
          notes: req.notes,
          createdAt: req.createdAt,
          items: [],
          totalUnits: 0,
        })
      }
      const b = batchMap.get(req.batchNo)!
      b.items.push({
        product: req.product,
        quantity: req.quantity
      })
      b.totalUnits += req.quantity
    }

    return Array.from(batchMap.values())
  } catch (error) {
    console.error('Error getPendingRestockBatches:', error)
    return []
  }
}