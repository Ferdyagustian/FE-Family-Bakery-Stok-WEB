'use client'

import React, { useState } from 'react'
import { Banknote, QrCode, CreditCard, X, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import { formatFullRupiah } from '@/lib/format'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  totalAmount: number
  itemCount: number
  onConfirmPayment: (payment: {
    paymentMethod: 'Tunai' | 'QRIS' | 'Transfer'
    cashPaid: number
    change: number
  }) => Promise<void>
  loading?: boolean
}

export function PaymentModal({
  isOpen,
  onClose,
  totalAmount,
  itemCount,
  onConfirmPayment,
  loading = false,
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'QRIS' | 'Transfer'>('Tunai')
  const [cashReceived, setCashReceived] = useState<string>(String(totalAmount))
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  const [prevTotal, setPrevTotal] = useState(totalAmount)

  if (prevIsOpen !== isOpen || prevTotal !== totalAmount) {
    setPrevIsOpen(isOpen)
    setPrevTotal(totalAmount)
    if (isOpen) {
      setCashReceived(String(totalAmount))
      setPaymentMethod('Tunai')
    }
  }

  if (!isOpen) return null

  const cashNum = parseInt(cashReceived.replace(/\D/g, '')) || 0
  const change = Math.max(0, cashNum - totalAmount)
  const isCashInsufficient = paymentMethod === 'Tunai' && cashNum < totalAmount

  const handleQuickCash = (amount: number) => {
    setCashReceived(String(amount))
  }

  const handleExactCash = () => {
    setCashReceived(String(totalAmount))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isCashInsufficient) return

    await onConfirmPayment({
      paymentMethod,
      cashPaid: paymentMethod === 'Tunai' ? cashNum : totalAmount,
      change: paymentMethod === 'Tunai' ? change : 0,
    })
  }

  // Generate suggested quick cash options based on totalAmount
  const quickOptions: number[] = []
  const roundSteps = [10000, 20000, 50000, 100000, 200000, 500000]
  roundSteps.forEach(step => {
    if (step > totalAmount && quickOptions.length < 4) {
      quickOptions.push(step)
    }
  })
  // If total is large, add next ceiling round (e.g. for 65.000 -> 70.000, 100.000)
  const nextCeil = Math.ceil(totalAmount / 50000) * 50000
  if (nextCeil > totalAmount && !quickOptions.includes(nextCeil)) {
    quickOptions.unshift(nextCeil)
  }

  return (
    <div className="glass-overlay z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 border border-gray-100 dark:border-gray-800 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-base sm:text-lg font-heading font-bold text-gray-900 dark:text-white">
              Konfirmasi Pembayaran
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {itemCount} item dalam keranjang
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Total Banner */}
        <div className="bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 mb-5 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Total Tagihan
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold font-heading text-indigo-900 dark:text-indigo-100 mt-0.5">
            {formatFullRupiah(totalAmount)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('Tunai')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                  paymentMethod === 'Tunai'
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Banknote className="w-5 h-5 mb-1.5" />
                Tunai (Cash)
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('QRIS')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                  paymentMethod === 'QRIS'
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <QrCode className="w-5 h-5 mb-1.5" />
                QRIS
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Transfer')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                  paymentMethod === 'Transfer'
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <CreditCard className="w-5 h-5 mb-1.5" />
                Transfer Bank
              </button>
            </div>
          </div>

          {/* Cash Input & Calculator (Only if Tunai) */}
          {paymentMethod === 'Tunai' && (
            <div className="space-y-3 bg-gray-50 dark:bg-gray-800/40 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Uang Diterima (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cashReceived ? `Rp ${cashNum.toLocaleString('id-ID')}` : ''}
                  onChange={(e) => setCashReceived(e.target.value.replace(/\D/g, ''))}
                  placeholder="Masukkan nominal..."
                  className="w-full text-base font-bold px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={handleExactCash}
                  className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 transition-colors"
                >
                  Uang Pas
                </button>
                {quickOptions.slice(0, 3).map((opt) => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => handleQuickCash(opt)}
                    className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    Rp {(opt / 1000).toLocaleString('id-ID')}rb
                  </button>
                ))}
              </div>

              {/* Kembalian Display */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Uang Kembalian:
                </span>
                <span className={`text-base font-extrabold ${isCashInsufficient ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {isCashInsufficient ? 'Uang Kurang' : formatFullRupiah(change)}
                </span>
              </div>
            </div>
          )}

          {isCashInsufficient && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Nominal uang tunai kurang dari total belanja.</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-xs sm:text-sm transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || isCashInsufficient}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs sm:text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <span>Konfirmasi &amp; Cetak</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
