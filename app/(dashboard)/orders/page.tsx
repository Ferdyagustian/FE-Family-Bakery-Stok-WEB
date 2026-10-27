import prisma from '@/lib/db'
import { getSession } from '@/lib/session'
import { getBakingSchedule } from '@/lib/actions/order'
import { BakingScheduleClient } from '@/components/BakingScheduleClient'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const session = await getSession()
  const user = session?.user
  const isAdmin = user?.role === 'ADMIN'

  // Default target date: Besok (Hari berikutnya)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDateStr = tomorrow.toISOString().split('T')[0]

  let stores: { id: string; name: string }[] = []
  if (!isAdmin && user?.storeId) {
    stores = await prisma.store.findMany({
      where: { id: user.storeId },
      select: { id: true, name: true }
    })
  } else {
    stores = await prisma.store.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    })
  }

  const [products, initialSchedule, initialOrders] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, price: true, discount: true }
    }),
    getBakingSchedule(defaultDateStr, !isAdmin ? user?.storeId : 'ALL'),
    prisma.customOrder.findMany({
      where: !isAdmin && user?.storeId ? { storeId: user.storeId } : {},
      include: {
        store: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, price: true } }
          }
        }
      },
      orderBy: { pickupDate: 'desc' },
      take: 200
    })
  ])

  return (
    <BakingScheduleClient
      initialDateStr={defaultDateStr}
      initialSchedule={initialSchedule}
      initialOrders={initialOrders}
      stores={stores}
      products={products}
      isAdmin={isAdmin}
      userStoreId={user?.storeId}
    />
  )
}
