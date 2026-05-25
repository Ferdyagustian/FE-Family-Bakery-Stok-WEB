import prisma from '@/lib/db'
import { getSession } from '@/lib/session'
import { Package, TrendingUp } from 'lucide-react'
import { notFound } from 'next/navigation'
import { AddMasterProductModal } from '@/components/AddMasterProductModal'
import { BulkPriceAdjustModal } from '@/components/BulkPriceAdjustModal'
import { MasterProductsList } from '@/components/MasterProductsList'

export const revalidate = 30

export default async function MasterProductsPage() {
  const session = await getSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  if (!isAdmin) {
    notFound() // Hide from non-admins
  }

  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { storeProducts: true, sales: true }
      }
    }
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-gray-900 dark:text-white">Katalog Produk Master</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Daftar semua produk yang tersedia di seluruh cabang</p>
          </div>
          <div className="flex-shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <BulkPriceAdjustModal />
            <AddMasterProductModal />
          </div>
        </div>
      </div>

      {/* Products List (Client Component with Quick Edit) */}
      <MasterProductsList products={products} />
    </div>
  )
}
