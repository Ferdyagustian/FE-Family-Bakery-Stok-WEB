'use client'

import React, { useState, useTransition } from 'react'
import { Search, CheckCircle2, AlertTriangle, X, Receipt, Store, Calendar, CreditCard, Banknote, QrCode, Loader2, ArrowRight } from 'lucide-react'
import { verifyReceipt } from '@/lib/actions/product'
import { formatFullRupiah } from '@/lib/format'

interface VerifyReceiptModalProps {
  isOpen: boolean
  onClose: () => void
}

export function VerifyReceiptModal({ isOpen, onClose }: VerifyReceiptModalProps) {
  const [receiptInput, setReceiptInput] = useState('')
  const [isSearching, startTransition] = useTransition()
  const [searchResult, setSearchResult] = useState<any | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const query = receiptInput.trim()
    if (!query) return

    setErrorMessage(null)
    setSearchResult(null)

    startTransition(async () => {
      const res = await verifyReceipt(query)
      if (res.valid && res.data) {
        setSearchResult(res.data)
      } else {
        setErrorMessage(res.error || 'Nomor struk tidak ditemukan')
      }
    })
  }

  const handleReset = () => {
    setReceiptInput('')
    setSearchResult(null)
    setErrorMessage(null)
  }

  const formattedDate = searchResult?.date
    ? new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta'
      }).format(new Date(searchResult.date))
    : ''

  return (
    <div className="glass-overlay z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6 border border-gray-100 dark:border-gray-800 relative my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-heading font-bold text-gray-900 dark:text-white">
                Validasi Keaslian Struk
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Cek kebenaran struk fisik dengan data resmi transaksi di database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearch} className="space-y-3 mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Nomor Resi / Struk Penjualan
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={receiptInput}
                onChange={(e) => setReceiptInput(e.target.value)}
                placeholder="Contoh: FB-20261012-4821"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !receiptInput.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengecek...</span>
                </>
              ) : (
                <>
                  <span>Periksa</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error / Not Found State */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 mb-4 animate-in fade-in duration-150">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div>
                <p className="text-xs sm:text-sm font-bold">Struk Tidak Valid / Tidak Ditemukan</p>
                <p className="text-xs mt-1 leading-relaxed opacity-90">{errorMessage}</p>
                <p className="text-[11px] mt-2 italic text-rose-500 dark:text-rose-400">
                  Periksa kembali ejaan nomor resi pada kertas struk. Jika nomor sudah benar namun tetap tidak ditemukan, struk ini berpotensi bukan dari sistem resmi.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Verified Success State */}
        {searchResult && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Status Banner */}
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-xs sm:text-sm font-bold">STRUK ASLI &amp; TERVERIFIKASI</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Tercatat sah dalam database sistem</p>
                </div>
              </div>
              <span className="font-mono text-xs font-extrabold bg-emerald-100 dark:bg-emerald-900/60 px-2 py-1 rounded">
                {searchResult.receiptNo}
              </span>
            </div>

            {/* Meta Information */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                <Store className="w-3.5 h-3.5 text-gray-400" />
                <span className="truncate">{searchResult.storeName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span className="truncate">{formattedDate} WIB</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 col-span-2">
                <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                <span>Metode Pembayaran: <strong className="text-gray-900 dark:text-white">{searchResult.paymentMethod}</strong></span>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800/60 px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide grid grid-cols-[1fr_50px_80px]">
                <span>Menu Roti</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Total</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-48 overflow-y-auto">
                {searchResult.items.map((item: any, i: number) => (
                  <div key={i} className="px-3 py-2 grid grid-cols-[1fr_50px_80px] text-xs items-center">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white leading-tight">{item.name}</p>
                      <p className="text-[10px] text-gray-500">
                        @{item.price.toLocaleString('id-ID')}
                        {item.discount > 0 && <span className="text-rose-500 ml-1">(-{item.discount}%)</span>}
                      </p>
                    </div>
                    <div className="text-center font-semibold text-gray-700 dark:text-gray-300">
                      {item.quantity}
                    </div>
                    <div className="text-right font-bold text-gray-900 dark:text-white">
                      Rp {item.total.toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal:</span>
                <span>Rp {searchResult.subtotal.toLocaleString('id-ID')}</span>
              </div>
              {searchResult.discountTotal > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400 font-medium">
                  <span>Total Potongan Diskon:</span>
                  <span>-Rp {searchResult.discountTotal.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-gray-900 dark:text-white pt-1.5 border-t border-gray-200 dark:border-gray-700">
                <span>Total Sah:</span>
                <span className="text-indigo-600 dark:text-indigo-400">{formatFullRupiah(searchResult.grandTotal)}</span>
              </div>
              {searchResult.paymentMethod === 'Tunai' && searchResult.cashPaid > 0 && (
                <>
                  <div className="flex justify-between text-[11px] text-gray-500 pt-1">
                    <span>Uang Diterima:</span>
                    <span>{formatFullRupiah(searchResult.cashPaid)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>Kembalian:</span>
                    <span>{formatFullRupiah(searchResult.change)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Action footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cek Nomor Struk Lain
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
