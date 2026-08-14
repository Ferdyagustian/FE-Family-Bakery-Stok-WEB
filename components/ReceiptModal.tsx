'use client'

import React from 'react'
import { Printer, CheckCircle2, X } from 'lucide-react'
import { formatFullRupiah } from '@/lib/format'

export interface ReceiptItem {
  name: string
  quantity: number
  price: number
  discount: number
  total: number
}

export interface ReceiptData {
  receiptNo: string
  date: Date
  storeName: string
  storeLocation?: string | null
  cashierName?: string
  items: ReceiptItem[]
  subtotal: number
  discountTotal: number
  grandTotal: number
  paymentMethod: 'Tunai' | 'QRIS' | 'Transfer'
  cashPaid: number
  change: number
}

interface ReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  data: ReceiptData | null
}

export function ReceiptModal({ isOpen, onClose, data }: ReceiptModalProps) {
  if (!isOpen || !data) return null

  const handlePrint = () => {
    window.print()
  }

  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  }).format(data.date)

  return (
    <div className="glass-overlay z-50 overflow-y-auto">
      <div className="print-container bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md p-5 sm:p-6 border border-gray-100 dark:border-gray-800 relative my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header (Screen only) */}
        <div className="no-print flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Transaksi Berhasil!</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Thermal Receipt Content (This prints directly) ── */}
        <div className="thermal-receipt bg-white text-black p-4 rounded-xl border border-gray-200 shadow-xs font-mono text-xs leading-relaxed select-text">
          {/* Brand Header */}
          <div className="text-center pb-2 border-b border-dashed border-gray-400">
            <h2 className="text-base font-extrabold tracking-wider uppercase">FAMILY BAKERY</h2>
            <p className="text-[11px] font-semibold">{data.storeName}</p>
            {data.storeLocation && <p className="text-[10px] text-gray-600">{data.storeLocation}</p>}
          </div>

          {/* Meta Info */}
          <div className="py-2 border-b border-dashed border-gray-400 text-[11px] space-y-0.5">
            <div className="flex justify-between">
              <span>No. Resi:</span>
              <span className="font-bold">{data.receiptNo}</span>
            </div>
            <div className="flex justify-between">
              <span>Waktu:</span>
              <span>{formattedDate} WIB</span>
            </div>
            <div className="flex justify-between">
              <span>Kasir:</span>
              <span>{data.cashierName || 'Staff Kasir'}</span>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="py-2 border-b border-dashed border-gray-400">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="py-1 font-semibold">Menu</th>
                  <th className="py-1 text-center font-semibold">Qty</th>
                  <th className="py-1 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((item, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-1 pr-1">
                      <p className="font-bold leading-tight">{item.name}</p>
                      <p className="text-[10px] text-gray-600">
                        @{item.price.toLocaleString('id-ID')}
                        {item.discount > 0 && <span className="text-rose-600 ml-1">(-{item.discount}%)</span>}
                      </p>
                    </td>
                    <td className="py-1 text-center font-semibold whitespace-nowrap">
                      {item.quantity}
                    </td>
                    <td className="py-1 text-right font-bold whitespace-nowrap">
                      {item.total.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="py-2 border-b border-dashed border-gray-400 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{data.subtotal.toLocaleString('id-ID')}</span>
            </div>
            {data.discountTotal > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Total Diskon:</span>
                <span>-{data.discountTotal.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold pt-1 border-t border-gray-300">
              <span>TOTAL:</span>
              <span>{formatFullRupiah(data.grandTotal)}</span>
            </div>
            <div className="flex justify-between pt-1 text-[11px]">
              <span>Metode Bayar:</span>
              <span className="font-bold">{data.paymentMethod}</span>
            </div>
            {data.paymentMethod === 'Tunai' && (
              <>
                <div className="flex justify-between text-[11px]">
                  <span>Bayar Tunai:</span>
                  <span>{formatFullRupiah(data.cashPaid)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span>Kembalian:</span>
                  <span>{formatFullRupiah(data.change)}</span>
                </div>
              </>
            )}
          </div>

          {/* Footer Note */}
          <div className="text-center pt-3 space-y-1 text-[10px] text-gray-600">
            <p className="font-semibold text-black">*** TERIMA KASIH ***</p>
            <p>Roti &amp; Kue Segar Dipanggang Setiap Hari</p>
            <p className="text-[9px]">Simpan struk ini sebagai bukti pembayaran yang sah.</p>
          </div>
        </div>

        {/* Action Buttons (Screen Only) */}
        <div className="no-print mt-5 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs sm:text-sm transition-all active:scale-[0.98] shadow-sm shadow-indigo-500/20"
          >
            <Printer className="w-4 h-4" />
            Cetak Struk Thermal (Print)
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-xs sm:text-sm transition-all"
          >
            Selesai / Transaksi Baru
          </button>
        </div>

      </div>
    </div>
  )
}
