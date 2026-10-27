'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { writeAuditLog } from '@/lib/audit'
import { sendTelegramAlert } from '@/lib/telegram'
import { formatFullRupiah } from '@/lib/format'

export type OrderStatus = 'PENDING' | 'IN_PROCESS' | 'READY' | 'COMPLETED' | 'CANCELLED'

async function getSessionUser() {
  const session = await getSession()
  return session?.user ?? null
}

export async function createCustomOrder(data: {
  customerName: string
  phone: string
  pickupDate: string // YYYY-MM-DD
  storeId: string
  notes?: string
  depositPaid?: number
  items: { productId: string; quantity: number }[]
}) {
  const user = await getSessionUser()
  if (!user) return { error: 'Unauthorized' }

  const { customerName, phone, pickupDate, storeId, notes, depositPaid = 0, items } = data

  if (!customerName?.trim() || !phone?.trim() || !pickupDate || !storeId) {
    return { error: 'Mohon lengkapi nama pelanggan, nomor telepon, tanggal target, dan cabang toko' }
  }

  const validItems = items?.filter(i => i.quantity > 0)
  if (!validItems || validItems.length === 0) {
    return { error: 'Pilih minimal 1 jenis roti dengan kuantitas lebih dari 0' }
  }

  try {
    const productIds = validItems.map(i => i.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true, discount: true }
    })

    const productMap = new Map(products.map(p => [p.id, p]))

    let calculatedTotal = 0
    const orderItemsData = validItems.map(item => {
      const p = productMap.get(item.productId)
      if (!p) throw new Error(`Produk tidak ditemukan`)
      const discount = p.discount || 0
      const effectivePrice = p.price * (1 - discount / 100)
      const itemPrice = Math.round(effectivePrice)
      calculatedTotal += itemPrice * item.quantity
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: itemPrice
      }
    })

    const targetDate = new Date(`${pickupDate}T00:00:00.000Z`)

    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const rand = String(now.getTime()).slice(-4)
    const orderNo = `ORD-${y}${m}${d}-${rand}`

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { name: true }
    })

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.customOrder.create({
        data: {
          orderNo,
          customerName: customerName.trim(),
          phone: phone.trim(),
          pickupDate: targetDate,
          storeId,
          status: 'PENDING',
          totalAmount: calculatedTotal,
          depositPaid: Math.max(0, depositPaid),
          notes: notes?.trim() || null,
          items: {
            create: orderItemsData
          }
        },
        include: {
          items: { include: { product: true } }
        }
      })
      return created
    })

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'CREATE_PREORDER',
      entityType: 'CustomOrder',
      entityId: order.id,
      entityName: orderNo,
      storeId,
      detail: { customerName, totalAmount: calculatedTotal, depositPaid, pickupDate, itemsCount: validItems.length }
    })

    // Format rincian untuk Telegram
    const itemsListStr = order.items
      .map(i => `• ${i.product.name}: <b>${i.quantity} pcs</b> (@ ${formatFullRupiah(i.price)})`)
      .join('\n')

    await sendTelegramAlert(`
🎂 <b>PESANAN PRODUKSI BARU TERCATAT</b>
Nomor Pesanan: <code>${orderNo}</code>
Pemesan: <b>${customerName.trim()}</b> (${phone.trim()})
Target Roti Jadi: <b>${pickupDate}</b>
Cabang Pengambilan: <b>${store?.name || 'Cabang'}</b>
Catatan Khusus: <i>${notes ? notes.trim() : '-'}</i>

📋 <b>Daftar Roti yang Harus Dibuat:</b>
${itemsListStr}

💵 Total Biaya: <b>${formatFullRupiah(calculatedTotal)}</b>
💰 Uang Muka (DP): <b>${formatFullRupiah(depositPaid)}</b>
Sisa Tagihan: <b>${formatFullRupiah(Math.max(0, calculatedTotal - depositPaid))}</b>
`)

    revalidatePath('/orders')
    revalidatePath('/')
    return { success: true, order }
  } catch (error: any) {
    console.error('Error createCustomOrder:', error)
    return { error: error?.message || 'Gagal membuat pesanan' }
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const user = await getSessionUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    const existing = await prisma.customOrder.findUnique({
      where: { id: orderId },
      include: { store: { select: { name: true } } }
    })

    if (!existing) return { error: 'Pesanan tidak ditemukan' }

    // Jika Manager, hanya boleh ubah pesanan cabangnya
    if (user.role === 'MANAGER' && user.storeId && existing.storeId !== user.storeId) {
      return { error: 'Forbidden: Tidak dapat mengubah pesanan cabang lain' }
    }

    const updated = await prisma.customOrder.update({
      where: { id: orderId },
      data: { status }
    })

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'UPDATE_PREORDER_STATUS',
      entityType: 'CustomOrder',
      entityId: orderId,
      entityName: existing.orderNo,
      storeId: existing.storeId,
      detail: { oldStatus: existing.status, newStatus: status }
    })

    // Notif Telegram jika status jadi READY atau COMPLETED
    if (status === 'READY' || status === 'COMPLETED') {
      const statusLabel = status === 'READY' ? 'SIAP DIAMBIL / DIKIRIM' : 'SELESAI (LUNAS & DIAMBIL)'
      await sendTelegramAlert(`
📢 <b>STATUS PESANAN DIPERBARUI</b>
Nomor: <code>${existing.orderNo}</code>
Pelanggan: <b>${existing.customerName}</b>
Status Baru: <b>${statusLabel}</b>
Cabang: <b>${existing.store.name}</b>
`)
    }

    revalidatePath('/orders')
    revalidatePath('/')
    return { success: true, order: updated }
  } catch (error: any) {
    console.error('Error updateOrderStatus:', error)
    return { error: error?.message || 'Gagal mengubah status pesanan' }
  }
}

export async function deleteCustomOrder(orderId: string) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return { error: 'Unauthorized: Hanya Super Admin yang dapat menghapus data pesanan' }
  }

  try {
    await prisma.customOrder.delete({
      where: { id: orderId }
    })

    await writeAuditLog({
      userId: user.id,
      username: user.username,
      action: 'UPDATE_PREORDER_STATUS',
      entityType: 'CustomOrder',
      entityId: orderId,
      detail: { action: 'DELETED' }
    })

    revalidatePath('/orders')
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleteCustomOrder:', error)
    return { error: error?.message || 'Gagal menghapus pesanan' }
  }
}

export async function getBakingSchedule(dateStr: string, storeId?: string) {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    const startDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
    const endDate = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999))

    const whereClause: any = {
      pickupDate: {
        gte: startDate,
        lte: endDate
      },
      status: { in: ['PENDING', 'IN_PROCESS', 'READY'] }
    }

    if (storeId && storeId !== 'ALL') {
      whereClause.storeId = storeId
    }

    const orders = await prisma.customOrder.findMany({
      where: whereClause,
      include: {
        store: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true } }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Agregasi jumlah roti yang harus dipanggang
    const breadAggregation = new Map<string, {
      productId: string
      name: string
      imageUrl: string | null
      totalQuantity: number
      ordersCount: number
    }>()

    for (const order of orders) {
      for (const item of order.items) {
        if (!breadAggregation.has(item.productId)) {
          breadAggregation.set(item.productId, {
            productId: item.productId,
            name: item.product.name,
            imageUrl: item.product.imageUrl,
            totalQuantity: 0,
            ordersCount: 0
          })
        }
        const entry = breadAggregation.get(item.productId)!
        entry.totalQuantity += item.quantity
        entry.ordersCount += 1
      }
    }

    const scheduleList = Array.from(breadAggregation.values()).sort((a, b) => b.totalQuantity - a.totalQuantity)

    return {
      dateStr,
      scheduleList,
      orders,
      totalOrders: orders.length,
      totalBreadPieces: scheduleList.reduce((acc, curr) => acc + curr.totalQuantity, 0)
    }
  } catch (error) {
    console.error('Error getBakingSchedule:', error)
    return {
      dateStr,
      scheduleList: [],
      orders: [],
      totalOrders: 0,
      totalBreadPieces: 0
    }
  }
}
