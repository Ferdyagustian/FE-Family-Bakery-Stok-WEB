import prisma from '@/lib/db'
import { RestockForm } from '@/components/RestockForm'
import Link from 'next/link'
import { ChevronLeft, Store, RefreshCw } from 'lucide-react'
import { notFound } from 'next/navigation'

export default async function RestockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = await params

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      storeProducts: {
        include: { product: true },
        orderBy: { stockQuantity: 'asc' }
      }
    }
  })

  if (!store) notFound()

  const storeProductsList = store.storeProducts.map(sp => ({
    ...sp.product,
    stockQuantity: sp.stockQuantity,
  })).sort((a, b) => {
    if (a.stockQuantity === b.stockQuantity) return a.name.localeCompare(b.name)
    return 0
  })

  return (
    <div className="space-y-5">
      {/* Breadcrumb + Title */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href={`/stores/${storeId}`}
          className="p-2 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shadow-sm transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-heading font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 flex-shrink-0" />
            <span className="truncate">Restok Barang</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
            <Store className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{store.name}</span>
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-primary-50 dark:bg-primary-950/20 border border-primary-200 rounded-xl p-4 text-sm text-primary-800">
        <p className="font-semibold mb-1">Cara Penggunaan:</p>
        <ul className="space-y-0.5 text-primary-700 list-disc list-inside">
          <li>Isi jumlah unit yang <strong>ditambahkan</strong> (bukan jumlah total) untuk produk yang perlu direstok</li>
          <li>Produk yang tidak diisi akan <strong>diabaikan</strong> dan stoknya tidak berubah</li>
          <li>Klik <strong>"Simpan Semua"</strong> untuk memperbarui stok sekaligus</li>
        </ul>
      </div>

      {/* Restock Form */}
      {storeProductsList.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-12 text-center text-gray-400 dark:text-gray-500">
          <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-gray-600 dark:text-gray-300">Belum ada produk di cabang ini</p>
          <p className="text-sm mt-1">Tambahkan produk terlebih dahulu di halaman detail toko</p>
          <Link
            href={`/stores/${storeId}`}
            className="mt-4 inline-flex items-center gap-2 bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Kembali ke Toko
          </Link>
        </div>
      ) : (
        <RestockForm
          products={storeProductsList.map((p: any) => ({
            id: p.id,
            name: p.name,
            imageUrl: p.imageUrl,
            stockQuantity: p.stockQuantity,
            price: p.price,
          }))}
          storeId={storeId}
        />
      )}
    </div>
  )
}
