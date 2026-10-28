'use client'

import { useState, useTransition } from 'react'
import { PackageMinus, X, Search, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { recordProductReturn } from '@/lib/actions/product'
import { toast } from 'sonner'
import { CustomDropdown } from '@/components/CustomDropdown'

interface ProductItem {
  id: string
  name: string
  stockQuantity: number
  price: number
  imageUrl?: string | null
}

interface RecordReturnModalProps {
  products: ProductItem[]
  storeId: string
}

export function RecordReturnModal({ products, storeId }: RecordReturnModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  // State kuantitas per product id
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  // State alasan per product id
  const [reasons, setReasons] = useState<Record<string, string>>({})
  // State keterangan per product id (e.g. "1 Bos", "2 Voly")
  const [notes, setNotes] = useState<Record<string, string>>({})

  const handleOpen = () => {
    setQuantities({})
    setReasons({})
    setNotes({})
    setSearch('')
    setIsOpen(true)
  }

  const handleClose = () => {
    if (isPending) return
    setIsOpen(false)
  }

  const updateQty = (id: string, val: string, maxStock: number) => {
    if (val === '') {
      setQuantities(prev => ({ ...prev, [id]: '' }))
      return
    }
    const num = parseInt(val, 10)
    if (!isNaN(num) && num >= 0) {
      if (num > maxStock) {
        toast.error(`Jumlah retur tidak boleh melebihi stok tersedia (${maxStock})`)
        setQuantities(prev => ({ ...prev, [id]: String(maxStock) }))
      } else {
        setQuantities(prev => ({ ...prev, [id]: String(num) }))
      }
    }
  }

  const activeReturns = Object.entries(quantities)
    .filter(([_, qtyStr]) => (parseInt(qtyStr, 10) || 0) > 0)
    .map(([productId, qtyStr]) => ({
      productId,
      quantity: parseInt(qtyStr, 10) || 0,
      reason: reasons[productId] || 'Expired / Basi',
      notes: notes[productId] || ''
    }))

  const totalUnits = activeReturns.reduce((sum, item) => sum + item.quantity, 0)

  const handleSubmit = () => {
    if (activeReturns.length === 0) {
      toast.error('Masukkan jumlah retur minimal untuk 1 produk')
      return
    }

    startTransition(async () => {
      const res = await recordProductReturn(storeId, activeReturns)
      if (res && 'error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Berhasil mencatat retur untuk ${activeReturns.length} produk (${totalUnits} unit)`)
        setIsOpen(false)
      }
    })
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <button
        onClick={handleOpen}
        type="button"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 text-sm font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors shadow-xs"
      >
        <PackageMinus className="w-4 h-4 text-rose-600 dark:text-rose-400" />
        <span>Catat Retur</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                  <PackageMinus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-base sm:text-lg text-gray-900 dark:text-white">
                    Catat Barang Retur (Rusak / Expired)
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Keluarkan produk sisa/rusak dari rak toko. Stok otomatis berkurang tanpa menambah omzet.
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isPending}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3.5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari varian roti / cake..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-100 dark:divide-gray-800">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs">
                  Tidak ada produk ditemukan
                </div>
              ) : (
                filteredProducts.map(p => {
                  const qtyVal = quantities[p.id] || ''
                  const isFilled = (parseInt(qtyVal, 10) || 0) > 0
                  const hasStock = p.stockQuantity > 0

                  return (
                    <div
                      key={p.id}
                      className={`pt-3 first:pt-0 transition-colors p-2.5 rounded-xl ${
                        isFilled
                          ? 'bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40'
                          : ''
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Detail Produk & Stok */}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                            {p.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                            <span className="text-gray-500 dark:text-gray-400">
                              Stok saat ini:
                            </span>
                            <span
                              className={`font-bold ${
                                p.stockQuantity > 0
                                  ? 'text-gray-800 dark:text-gray-200'
                                  : 'text-rose-500'
                              }`}
                            >
                              {p.stockQuantity} unit
                            </span>
                            <span className="text-gray-300 dark:text-gray-700">•</span>
                            <span className="text-gray-500 dark:text-gray-400">
                              Rp {p.price.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>

                        {/* Input Jumlah Retur */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            Retur:
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={p.stockQuantity}
                            disabled={!hasStock}
                            placeholder="0"
                            value={qtyVal}
                            onChange={e => updateQty(p.id, e.target.value, p.stockQuantity)}
                            className="w-16 h-9 px-2 text-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-40"
                          />
                        </div>
                      </div>

                      {/* Detail Tambahan jika Kuantitas > 0 (Alasan & Keterangan) */}
                      {isFilled && (
                        <div className="mt-2.5 pt-2 border-t border-rose-100 dark:border-rose-900/30 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in duration-150">
                          <div>
                            <label className="block text-[10px] font-semibold text-rose-900 dark:text-rose-200 uppercase tracking-wider mb-1">
                              Alasan Retur
                            </label>
                            <CustomDropdown
                              value={reasons[p.id] || 'Expired / Basi'}
                              onChange={(val) =>
                                setReasons(prev => ({ ...prev, [p.id]: val }))
                              }
                              options={[
                                { value: 'Expired / Basi', label: 'Expired / Basi', dotColor: 'bg-rose-500' },
                                { value: 'Rusak Fisik / Cacat', label: 'Rusak Fisik / Cacat', dotColor: 'bg-amber-500' },
                                { value: 'Tidak Terjual / Sisa Shift', label: 'Tidak Terjual / Sisa Shift', dotColor: 'bg-blue-500' },
                                { value: 'Salah Produksi', label: 'Salah Produksi', dotColor: 'bg-purple-500' }
                              ]}
                              size="sm"
                              className="w-full"
                              buttonClassName="h-8 border-rose-200 dark:border-rose-800 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-rose-900 dark:text-rose-200 uppercase tracking-wider mb-1">
                              Keterangan (e.g. 1 Bos, 2 Voly)
                            </label>
                            <input
                              type="text"
                              placeholder="Catatan kemasan / fisik..."
                              value={notes[p.id] || ''}
                              onChange={e =>
                                setNotes(prev => ({ ...prev, [p.id]: e.target.value }))
                              }
                              className="w-full h-8 px-2.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left">
                {activeReturns.length > 0 ? (
                  <span>
                    Siap diretur:{' '}
                    <strong className="text-rose-600 dark:text-rose-400">
                      {activeReturns.length} produk ({totalUnits} unit)
                    </strong>
                  </span>
                ) : (
                  <span>Belum ada produk yang diisi jumlah returnya</span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending || activeReturns.length === 0}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs shadow-rose-600/20 disabled:opacity-50 transition-colors"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Konfirmasi Retur</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
