import prisma from '@/lib/db'
import { getSession } from '@/lib/session'
import { Package, TrendingUp } from 'lucide-react'
import { notFound } from 'next/navigation'
import { AddMasterProductModal } from '@/components/AddMasterProductModal'

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
          <div className="flex-shrink-0">
            <AddMasterProductModal />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {products.map((product: any) => (
          <div key={product.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 flex flex-col h-full">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{product.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{product.description || 'Tidak ada deskripsi'}</p>
              </div>
              <div className="bg-primary-50 dark:bg-primary-950/30 text-primary-700 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap">
                Rp {product.price.toLocaleString('id-ID')}
              </div>
            </div>
            
            <div className="mt-auto pt-4 flex gap-4 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-purple-500" />
                <span>{product._count.storeProducts} Cabang</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span>{product._count.sales} Terjual (Total)</span>
              </div>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-10 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-semibold text-gray-600 dark:text-gray-300">Belum ada produk master</p>
          </div>
        )}
      </div>
    </div>
  )
}
