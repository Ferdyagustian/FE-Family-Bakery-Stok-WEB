'use client'

import { useState, useMemo } from 'react'
import { Package, TrendingUp, Save, Edit3, Trash2, Search } from 'lucide-react'
import { updateBulkPrices, deleteMasterProduct } from '@/lib/actions/product'
import { EditMasterProductModal } from '@/components/EditMasterProductModal'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function MasterProductsList({ products }: { products: any[] }) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [prices, setPrices] = useState<Record<string, number>>(
    products.reduce((acc, p) => ({ ...acc, [p.id]: p.price }), {})
  )
  const router = useRouter()

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products
    const query = searchQuery.toLowerCase()
    return products.filter((p: any) => p.name.toLowerCase().includes(query))
  }, [products, searchQuery])

  const handlePriceChange = (id: string, val: string) => {
    const num = parseInt(val.replace(/\D/g, ''))
    setPrices(prev => ({
      ...prev,
      [id]: isNaN(num) ? 0 : num
    }))
  }

  const handleSaveAll = async () => {
    setLoading(true)
    const items = Object.entries(prices).map(([id, price]) => ({ id, price }))
    const res = await updateBulkPrices(items)
    setLoading(false)
    if (res?.error) {
      toast.error(res.error)
    } else {
      setIsEditMode(false)
      toast.success('Perubahan harga berhasil disimpan')
      router.refresh()
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`PERINGATAN! Anda yakin ingin menghapus "${name}" secara permanen? Produk ini akan hilang dari SELURUH cabang beserta riwayatnya.`)) {
      setLoading(true)
      const res = await deleteMasterProduct(id)
      setLoading(false)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success(`Produk ${name} berhasil dihapus`)
        router.refresh()
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Cari nama produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-3 flex-shrink-0 w-full sm:w-auto">
          {isEditMode ? (
            <>
              <button
                onClick={() => setIsEditMode(false)}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl font-medium w-full sm:w-auto justify-center flex"
              >
                Batal
              </button>
              <button
                onClick={handleSaveAll}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium w-full sm:w-auto"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Menyimpan...' : 'Simpan Semua'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditMode(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-semibold border border-indigo-200 w-full sm:w-auto"
            >
              <Edit3 className="w-4 h-4" />
              Mode Edit Cepat
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full block sm:table text-left text-sm whitespace-normal sm:whitespace-nowrap">
            <thead className="hidden sm:table-header-group bg-gray-50 dark:bg-gray-800/50 text-gray-500 font-semibold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-5 py-4">Produk</th>
                <th className="px-5 py-4 w-32">Harga (Rp)</th>
                <th className="px-5 py-4 w-32">Cabang</th>
                <th className="px-5 py-4 w-32">Total Terjual</th>
                {!isEditMode && <th className="px-5 py-4 w-24 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 flex flex-col sm:table-row-group">
              {filteredProducts.map((product: any) => (
                <tr key={product.id} className="block sm:table-row hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors p-4 sm:p-0 border-b sm:border-0 border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="block sm:table-cell px-0 sm:px-5 py-2 sm:py-3 mb-2 sm:mb-0 border-b sm:border-0 border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative flex-shrink-0">
                        {product.imageUrl ? (
                          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">{product.name}</div>
                        {product.description && <div className="text-xs text-gray-500 truncate max-w-xs">{product.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="flex sm:table-cell justify-between items-center sm:items-start px-0 sm:px-5 py-2 sm:py-3 border-b sm:border-0 border-gray-100 dark:border-gray-800">
                    <span className="sm:hidden font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Harga</span>
                    {isEditMode ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={prices[product.id] || ''}
                        onChange={(e) => handlePriceChange(product.id, e.target.value)}
                        className="w-24 sm:w-28 h-9 px-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm text-right sm:text-left"
                      />
                    ) : (
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {product.price.toLocaleString('id-ID')}
                      </span>
                    )}
                  </td>
                  <td className="flex sm:table-cell justify-between items-center sm:items-start px-0 sm:px-5 py-2 sm:py-3 text-gray-600 dark:text-gray-400 border-b sm:border-0 border-gray-100 dark:border-gray-800">
                    <span className="sm:hidden font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Cabang</span>
                    <span>{product._count.storeProducts}</span>
                  </td>
                  <td className="flex sm:table-cell justify-between items-center sm:items-start px-0 sm:px-5 py-2 sm:py-3 text-gray-600 dark:text-gray-400 border-b sm:border-0 border-gray-100 dark:border-gray-800">
                    <span className="sm:hidden font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Terjual</span>
                    <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                    {product._count.sales}
                    </div>
                  </td>
                  {!isEditMode && (
                    <td className="flex sm:table-cell justify-between items-center sm:items-start px-0 sm:px-5 py-2 sm:py-3 mt-2 sm:mt-0 text-right">
                      <span className="sm:hidden font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Aksi</span>
                      <div className="flex items-center justify-end gap-1">
                        <EditMasterProductModal product={product} />
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          disabled={loading}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                          title="Hapus Produk"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                    Belum ada data produk.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
