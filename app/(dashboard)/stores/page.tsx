import prisma from '@/lib/db'
import Link from 'next/link'
import { Store as StoreIcon, MapPin, ChevronRight, Package, TrendingUp } from 'lucide-react'
import { AddStoreForm } from '@/components/AddStoreForm'

export const revalidate = 30

export default async function StoresPage() {
  const stores = await prisma.store.findMany({
    orderBy: { createdAt: 'desc' },
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
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-gray-900 dark:text-white">Manajemen Cabang</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Kelola stok dan data setiap cabang toko roti Anda</p>
          </div>
          <div className="flex-shrink-0">
            <AddStoreForm />
          </div>
        </div>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {stores.map((store: any) => (
          <Link href={`/stores/${store.id}`} key={store.id} className="group block">
            <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-transparent hover:border-primary-200 shadow-sm hover:shadow-md transition-all duration-300 p-5 h-full">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform flex-shrink-0">
                  <StoreIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-primary-700 transition-colors truncate">
                    {store.name}
                  </h3>
                  {store.location && (
                    <p className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{store.location}</span>
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Package className="w-4 h-4 mr-2 text-primary-500 flex-shrink-0" />
                  <span className="text-sm font-medium">{store._count.storeProducts} Produk</span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <TrendingUp className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                  <span className="text-sm font-medium">{store._count.sales} Terjual</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end text-primary-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Kelola Cabang</span>
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}

        {stores.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-10 bg-white dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500">
            <StoreIcon className="w-12 h-12 mb-3" />
            <p className="text-base font-semibold text-gray-600 dark:text-gray-300">Belum ada cabang toko</p>
            <p className="text-sm text-center mt-1">Klik "Tambah Cabang" untuk memulai</p>
          </div>
        )}
      </div>
    </div>
  )
}
