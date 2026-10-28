'use client'

import { useState } from 'react'
import { addStoreProduct } from '@/lib/actions/product'
import { useRouter } from 'next/navigation'
import { X, Package } from 'lucide-react'
import { toast } from 'sonner'
import { CustomDropdown } from '@/components/CustomDropdown'

export function AddProductModal({ storeId, masterProducts = [] }: { storeId: string, masterProducts?: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const router = useRouter()

  const handleClose = () => {
    setSelectedProductId('')
    setIsOpen(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedProductId) {
      toast.error('Pilih produk dari katalog terlebih dahulu')
      return
    }
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.append('storeId', storeId)
    formData.set('productId', selectedProductId)

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
        <div className="glass-overlay">
          <div className="bg-white dark:bg-gray-900 w-full sm:rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto sm:max-w-lg">
            {/* Modal Header */}
            <div className="glass-header">
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
                <CustomDropdown
                  value={selectedProductId}
                  onChange={setSelectedProductId}
                  icon={<Package className="h-4 w-4" />}
                  options={masterProducts.map((p) => ({
                    value: p.id,
                    label: `${p.name} - Rp ${p.price.toLocaleString('id-ID')}`
                  }))}
                  placeholder="-- Pilih Produk dari Katalog --"
                  className="w-full"
                  buttonClassName="h-11"
                />
                <input type="hidden" name="productId" value={selectedProductId} />
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
