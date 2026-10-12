import { DashboardShell } from '@/components/DashboardShell'
import prisma from '@/lib/db'
import { getSession } from '@/lib/session'
import { Suspense } from 'react'

// Komponen async terpisah — tidak blocking shell render
async function LowStockLoader({ children, user }: { children: (data: any[]) => React.ReactNode, user: any }) {
  const threshold = parseInt(process.env.LOW_STOCK_THRESHOLD || '4')
  const whereClause: any = { stockQuantity: { lte: threshold } }
  
  if (user?.role === 'MANAGER' && user?.storeId) {
    whereClause.storeId = user.storeId
  }

  const lowStockProducts = await prisma.storeProduct.findMany({
    where: whereClause,
    select: {
      productId: true,
      stockQuantity: true,
      storeId: true,
      store: { select: { name: true } },
      product: { select: { name: true } },
    },
    orderBy: { stockQuantity: 'asc' },
    take: 20, // Batasi maksimal 20 item
  })

  const lowStockData = lowStockProducts.map((p: any) => ({
    id: p.productId,
    name: p.product.name,
    stockQuantity: p.stockQuantity,
    storeId: p.storeId,
    storeName: p.store.name,
  }))

  return <>{children(lowStockData)}</>
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSession()

  return (
    <Suspense fallback={<DashboardShell lowStockProducts={[]} user={user?.user}>{children}</DashboardShell>}>
      <LowStockLoader user={user?.user}>
        {(lowStockData) => (
          <DashboardShell lowStockProducts={lowStockData} user={user?.user}>{children}</DashboardShell>
        )}
      </LowStockLoader>
    </Suspense>
  )
}
