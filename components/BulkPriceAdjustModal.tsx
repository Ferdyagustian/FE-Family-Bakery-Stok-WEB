'use client'

import { useState } from 'react'
import { adjustAllPrices } from '@/lib/actions/product'
import { useRouter } from 'next/navigation'
import { X, TrendingUp, TrendingDown, Percent, DollarSign } from 'lucide-react'

export function BulkPriceAdjustModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<'increase' | 'decrease'>('increase')
  const [amountType, setAmountType] = useState<'nominal' | 'percent'>('nominal')
  const [value, setValue] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue <= 0) {
      alert('Masukkan nilai yang valid')
      return
    }

    setLoading(true)
    const res = await adjustAllPrices(type, amountType, numValue)
    setLoading(false)

    if (res?.error) {
      alert(res.error)
    } else {
      setIsOpen(false)
      setValue('')
      router.refresh()
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors w-full sm:w-auto"
      >
        <TrendingUp className="w-4 h-4" />
        Penyesuaian Harga
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white mb-1">
              Sesuaikan Harga Massal
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Perubahan harga akan otomatis diterapkan ke seluruh cabang.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Type Selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType('increase')}
                  className={`flex flex-col items-center justify-center py-3 border-2 rounded-xl transition-colors ${
                    type === 'increase'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <TrendingUp className="w-6 h-6 mb-1" />
                  <span className="font-semibold text-sm">Naikkan Harga</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('decrease')}
                  className={`flex flex-col items-center justify-center py-3 border-2 rounded-xl transition-colors ${
                    type === 'decrease'
                      ? 'border-red-600 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <TrendingDown className="w-6 h-6 mb-1" />
                  <span className="font-semibold text-sm">Turunkan Harga</span>
                </button>
              </div>

              {/* Amount Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Berdasarkan:</label>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAmountType('nominal')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                      amountType === 'nominal' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    Nominal (Rp)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountType('percent')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                      amountType === 'percent' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Percent className="w-4 h-4" />
                    Persentase (%)
                  </button>
                </div>
              </div>

              {/* Value Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  {type === 'increase' ? 'Tambah' : 'Kurangi'} sebesar:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-semibold">{amountType === 'nominal' ? 'Rp' : '%'}</span>
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 sm:text-lg font-bold"
                    placeholder={amountType === 'nominal' ? '1000' : '10'}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !value}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? 'Memproses...' : 'Terapkan ke Semua Produk'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
