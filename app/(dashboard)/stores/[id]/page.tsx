import prisma from '@/lib/db'
import { AddProductModal } from '@/components/AddProductModal'
import { ProductSearchList } from '@/components/ProductSearchList'
import Link from 'next/link'
import { ChevronLeft, Store, Package, RefreshCw } from 'lucide-react'
import { notFound } from 'next/navigation'
import { DeleteStoreButton } from '@/components/DeleteStoreButton'
import { getSession } from '@/lib/session'
import { ManageStoreUsers } from '@/components/ManageStoreUsers'

export const revalidate = 30

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      storeProducts: {
        include: { product: true },
        orderBy: { createdAt: 'desc' }
      },
      users: { select: { id: true, name: true, username: true } },
    }
  })

  const masterProducts = await prisma.product.findMany({
    orderBy: { name: 'asc' }
  })

  const session = await getSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  if (!store) notFound()

  // Mapped back to product format for the UI components
  const storeProductsList = store.storeProducts.map(sp => ({
    ...sp.product,
    stockQuantity: sp.stockQuantity,
  }))

  return (
    <div className="space-y-5">
      {/* Breadcrumb + Title */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/stores"
          className="p-2 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 shadow-sm transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg sm:text-2xl font-heading font-bold text-gray-900 dark:text-white flex items-center gap-2 min-w-0">
          <Store className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 flex-shrink-0" />
          <span className="truncate">{store.name}</span>
        </h1>
        <div className="ml-auto flex-shrink-0">
          {isAdmin && <DeleteStoreButton storeId={store.id} storeName={store.name} />}
        </div>
      </div>

      {/* Admin Panel: Manage Cashiers */}
      {isAdmin && <ManageStoreUsers storeId={store.id} users={store.users} />}

      {/* Sub-header with action */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">
              Daftar Produk
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">
                {storeProductsList.length}
              </span>
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Kelola stok dan catat penjualan produk di cabang ini</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/stores/${storeId}/restock`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary-200 bg-primary-50 dark:bg-primary-950/20 text-primary-700 text-sm font-semibold hover:bg-primary-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Restok Barang
            </Link>
            <AddProductModal storeId={storeId} masterProducts={masterProducts} />
          </div>
        </div>
      </div>

      {/* Product Search & Grid */}
      <ProductSearchList products={storeProductsList} storeId={storeId} isAdmin={isAdmin} />
    </div>
  )
}
