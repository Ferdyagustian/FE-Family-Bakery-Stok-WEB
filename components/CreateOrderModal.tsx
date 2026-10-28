'use client'

import { useState, useTransition, useMemo } from 'react'
import { createCustomOrder } from '@/lib/actions/order'
import { Plus, Calendar, User, Phone, Store, DollarSign, X, Search } from 'lucide-react'
import { CustomDropdown } from '@/components/CustomDropdown'
import { toast } from 'sonner'
import { formatFullRupiah } from '@/lib/format'

interface ProductOption {
  id: string
  name: string
  price: number
  discount?: number
}

interface StoreOption {
  id: string
  name: string
}

interface CreateOrderModalProps {
  products: ProductOption[]
  stores: StoreOption[]
  defaultStoreId?: string
}

export function CreateOrderModal({ products, stores, defaultStoreId }: CreateOrderModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form State
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDateStr = tomorrow.toISOString().split('T')[0]

  const [pickupDate, setPickupDate] = useState(defaultDateStr)
  const [storeId, setStoreId] = useState(defaultStoreId || (stores[0]?.id || ''))
  const [notes, setNotes] = useState('')
  const [depositPaid, setDepositPaid] = useState<string>('0')

  // Item Quantities
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [productSearch, setProductSearch] = useState('')

  const handleQtyChange = (productId: string, val: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, val)
    }))
  }

  // Filter pencarian nama secara teroptimasi
  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim()
    if (!q) return products
    return products.filter(p => p.name.toLowerCase().includes(q))
  }, [products, productSearch])

  // Limit rendering DOM: Render maksimal 50 produk sekaligus agar perangkat mobile tetap 60 FPS
  const DISPLAY_LIMIT = 50

  const displayedProducts = useMemo(() => {
    const selected = filteredProducts.filter(p => (quantities[p.id] || 0) > 0)
    const unselected = filteredProducts.filter(p => (quantities[p.id] || 0) === 0)
    const remainingSlots = Math.max(0, DISPLAY_LIMIT - selected.length)
    return [...selected, ...unselected.slice(0, remainingSlots)]
  }, [filteredProducts, quantities])

  // Hitung total estimasi
  const selectedItems = Object.entries(quantities)
    .filter(([_, qty]) => qty > 0)
    .map(([productId, quantity]) => {
      const p = products.find(x => x.id === productId)
      const discount = p?.discount || 0
      const effectivePrice = (p?.price || 0) * (1 - discount / 100)
      return {
        productId,
        quantity,
        name: p?.name || '',
        price: Math.round(effectivePrice),
        subtotal: Math.round(effectivePrice) * quantity
      }
    })

  const totalAmount = selectedItems.reduce((acc, curr) => acc + curr.subtotal, 0)
  const dpNumber = parseFloat(depositPaid) || 0
  const remainingBill = Math.max(0, totalAmount - dpNumber)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!customerName.trim() || !phone.trim() || !pickupDate || !storeId) {
      toast.error('Mohon lengkapi semua kolom wajib!')
      return
    }

    if (selectedItems.length === 0) {
      toast.error('Pilih minimal 1 jenis roti untuk diproduksi!')
      return
    }

    startTransition(async () => {
      const res = await createCustomOrder({
        customerName,
        phone,
        pickupDate,
        storeId,
        notes,
        depositPaid: dpNumber,
        items: selectedItems.map(i => ({ productId: i.productId, quantity: i.quantity }))
      })

      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success(`Pesanan ${res.order?.orderNo} berhasil dicatat & notifikasi Telegram terkirim!`)
        setIsOpen(false)
        // Reset form
        setCustomerName('')
        setPhone('')
        setNotes('')
        setDepositPaid('0')
        setQuantities({})
        setProductSearch('')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95"
      >
        <Plus className="w-4 h-4" />
        Catat Pesanan Baru
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-heading font-bold text-gray-900 dark:text-white text-base sm:text-lg">
                  Formulir Pesanan Roti Terjadwal (Pre-Order)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Pesanan akan otomatis masuk ke lembar kerja jadwal dapur pada tanggal target.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Pelanggan */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Nama Pemesan / Pelanggan *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Ibu Rina (Arisan)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* No Telepon */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Nomor WhatsApp / Telepon *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      placeholder="Contoh: 081234567890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Tanggal Target Pengambilan */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Tanggal Roti Harus Selesai / Diambil *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-indigo-500/70 dark:text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none hover:border-gray-300 dark:hover:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs transition-all"
                    />
                  </div>
                </div>

                {/* Cabang Pengambilan */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Cabang Pengambilan / Pickup *
                  </label>
                  <CustomDropdown
                    options={stores.map(s => ({ value: s.id, label: s.name }))}
                    value={storeId}
                    onChange={setStoreId}
                    icon={<Store className="w-4 h-4" />}
                    size="md"
                    className="w-full"
                    buttonClassName="py-2.5 font-medium"
                  />
                </div>
              </div>

              {/* Roti yang Dipesan */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    Pilih Roti &amp; Jumlah Pesanan:
                  </label>
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                    {selectedItems.length} Varian Dipilih
                  </span>
                </div>

                {/* Input Search Nama Roti */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari nama roti (contoh: Bolu, Bolen, Donat)..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-xs"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md transition-colors"
                      title="Hapus pencarian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-xl max-h-52 overflow-y-auto p-2 space-y-1.5 custom-scrollbar bg-gray-50/50 dark:bg-gray-800/40">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-xs">
                      <p>Tidak ada roti yang cocok dengan &quot;{productSearch}&quot;</p>
                      <button
                        type="button"
                        onClick={() => setProductSearch('')}
                        className="mt-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                      >
                        Tampilkan semua roti
                      </button>
                    </div>
                  ) : (
                    <>
                      {displayedProducts.map(product => {
                        const qty = quantities[product.id] || 0
                        const discount = product.discount || 0
                        const effPrice = Math.round(product.price * (1 - discount / 100))

                        return (
                          <div
                            key={product.id}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                              qty > 0
                                ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 shadow-xs'
                                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-semibold text-gray-900 dark:text-white truncate">{product.name}</p>
                              <p className="text-[11px] text-gray-400">@ {formatFullRupiah(effPrice)}</p>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleQtyChange(product.id, qty - 5)}
                                className="w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-bold text-gray-700 dark:text-gray-200 text-xs transition-colors flex items-center justify-center select-none active:scale-95"
                              >
                                -5
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={qty === 0 ? '' : qty}
                                placeholder="0"
                                onChange={(e) => handleQtyChange(product.id, parseInt(e.target.value) || 0)}
                                className="w-14 sm:w-16 h-8 sm:h-7 text-center font-bold text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleQtyChange(product.id, qty + 5)}
                                className="w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-bold text-gray-700 dark:text-gray-200 text-xs transition-colors flex items-center justify-center select-none active:scale-95"
                              >
                                +5
                              </button>
                            </div>
                          </div>
                        )
                      })}

                      {filteredProducts.length > displayedProducts.length && (
                        <div className="py-2 text-center text-[11px] text-gray-500 dark:text-gray-400 border-t border-gray-200/60 dark:border-gray-700/60 font-medium">
                          Menampilkan {displayedProducts.length} dari {filteredProducts.length} varian roti. Ketik nama untuk mempersempit.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Uang Muka (DP) & Catatan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Uang Muka / DP Diterima (Rp)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="number"
                      min="0"
                      value={depositPaid}
                      onChange={(e) => setDepositPaid(e.target.value)}
                      placeholder="0"
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Catatan Khusus (Tulisan Kue/Dus)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Tulisan Selamat Ulang Tahun Ayah"
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Ringkasan Finansial */}
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3.5 space-y-1.5 text-xs border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Total Tagihan Pesanan:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatFullRupiah(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Uang Muka (DP):</span>
                  <span className="font-bold">- {formatFullRupiah(dpNumber)}</span>
                </div>
                <div className="flex justify-between text-gray-800 dark:text-gray-200 font-extrabold border-t border-gray-200 dark:border-gray-700 pt-1.5">
                  <span>Sisa Tagihan Saat Diambil:</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{formatFullRupiah(remainingBill)}</span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending || selectedItems.length === 0}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {isPending ? 'Menyimpan & Notifikasi...' : 'Simpan & Beritahu Dapur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
