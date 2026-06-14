'use client'

import { useState } from 'react'
import { addStoreProduct } from '@/lib/actions/product'
import { useRouter } from 'next/navigation'
import { X, Package } from 'lucide-react'
import { toast } from 'sonner'

export function AddProductModal({ storeId, masterProducts = [] }: { storeId: string, masterProducts?: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleClose = () => {
    setIsOpen(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.append('storeId', storeId)

    const res = await addStoreProduct(formData)
    setLoading(false)
    if (res?.error) {
      toast.error(res.error)
    } else {
      handleClose()
      toast.success('Produk berhasil ditambahkan ke cabang')
      router.refresh()
    }
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn-primary whitespace-nowrap">
        + Tambah Produk
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white dark:bg-gray-900 w-full sm:rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto sm:max-w-lg">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center justify-between z-10 rounded-t-2xl">
              <h3 className="text-lg font-heading font-bold text-gray-900 dark:text-white">Tambah Produk Baru</h3>
              <button onClick={handleClose} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Product Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                  Pilih Produk <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Package className="h-5 w-5 text-gray-400" />
                  </div>
                  <select 
                    name="productId" 
                    required 
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                    defaultValue=""
                  >
                    <option value="" disabled className="text-gray-500">-- Pilih Produk dari Katalog --</option>
                    {masterProducts.map((p) => (
                      <option key={p.id} value={p.id} className="text-gray-900 dark:text-gray-100 dark:bg-gray-800">
                        {p.name} - Rp {p.price.toLocaleString('id-ID')}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Produk baru hanya dapat ditambahkan oleh Admin melalui Master Katalog.
                </p>
              </div>

              {/* Initial Stock */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                  Stok Awal <span className="text-red-500">*</span>
                </label>
                <input 
                  name="stockQuantity" 
                  type="number" 
                  min="0" 
                  required 
                  defaultValue="0"
                  className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 dark:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={handleClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 transition-colors" disabled={loading}>
                  Batal
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm transition-colors disabled:opacity-60">
                  {loading ? 'Menambahkan...' : 'Tambahkan ke Cabang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
