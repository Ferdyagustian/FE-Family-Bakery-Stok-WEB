'use client'

import { useState } from 'react'
import { ForecastChart, ForecastSeries } from '@/components/ForecastChart'
import { Store, Package, Sparkles, Check } from 'lucide-react'

interface StoreType {
  id: string
  name: string
  location: string | null
}

interface ProductType {
  id: string
  name: string
}

export default function ForecastClient({
  stores,
  products,
  apiBase,
  token
}: {
  stores: StoreType[]
  products: ProductType[]
  apiBase: string
  token: string
}) {
  const [storeIds, setStoreIds] = useState<string[]>(['ALL'])
  const [productIds, setProductIds] = useState<string[]>(['ALL'])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forecastData, setForecastData] = useState<ForecastSeries[] | null>(null)

  const toggleStore = (id: string) => {
    if (id === 'ALL') {
      setStoreIds(['ALL'])
      return
    }
    setStoreIds(prev => {
      const newArr = prev.filter(p => p !== 'ALL')
      if (newArr.includes(id)) {
        const filtered = newArr.filter(p => p !== id)
        return filtered.length === 0 ? ['ALL'] : filtered
      } else {
        return [...newArr, id]
      }
    })
  }

  const toggleProduct = (id: string) => {
    if (id === 'ALL') {
      setProductIds(['ALL'])
      return
    }
    setProductIds(prev => {
      const newArr = prev.filter(p => p !== 'ALL')
      if (newArr.includes(id)) {
        const filtered = newArr.filter(p => p !== id)
        return filtered.length === 0 ? ['ALL'] : filtered
      } else {
        return [...newArr, id]
      }
    })
  }

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault()
    if (storeIds.length === 0 || productIds.length === 0) return

    setIsLoading(true)
    setError(null)
    setForecastData(null)

    try {
      const baseUrl = apiBase.replace(/\/$/, '')
      const response = await fetch(`${baseUrl}/forecast/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          storeIds,
          productIds,
          horizon_days: 7
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || 'Gagal memanggil API prediksi')
      }

      setForecastData(result.series)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Terjadi kesalahan pada jaringan')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT: Controls */}
      <div className="col-span-1 bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col">
        <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-white mb-6">
          Parameter Prediksi
        </h2>
        
        <form onSubmit={handlePredict} className="flex flex-col flex-1 gap-6">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Store className="w-4 h-4 text-gray-400" /> Pilih Cabang
            </label>
            <div className="max-h-40 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
              <button
                type="button"
                onClick={() => toggleStore('ALL')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  storeIds.includes('ALL') 
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <span>🌐 Semua Cabang (Gabungan)</span>
                {storeIds.includes('ALL') && <Check className="w-4 h-4" />}
              </button>
              {stores.map(s => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggleStore(s.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    storeIds.includes(s.id) 
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span>{s.name}</span>
                  {storeIds.includes(s.id) && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Package className="w-4 h-4 text-gray-400" /> Pilih Produk
            </label>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
              <button
                type="button"
                onClick={() => toggleProduct('ALL')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  productIds.includes('ALL') 
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <span>📦 Semua Produk (Gabungan)</span>
                {productIds.includes('ALL') && <Check className="w-4 h-4" />}
              </button>
              {products.map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => toggleProduct(p.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    productIds.includes(p.id) 
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span>{p.name}</span>
                  {productIds.includes(p.id) && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-4">
            <button
              type="submit"
              disabled={isLoading || storeIds.length === 0 || productIds.length === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20"
            >
              <Sparkles className="w-5 h-5" />
              <span>{isLoading ? 'Menganalisis...' : 'Mulai Prediksi'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT: Visual Data */}
      <div className="col-span-1 lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-white">
            Grafik 7 Hari Kedepan
          </h2>
          {forecastData && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Analisis Selesai
            </span>
          )}
        </div>
        
        <div className="flex-1 min-h-[320px]">
          <ForecastChart data={forecastData || []} isLoading={isLoading} error={error} />
        </div>
      </div>
      
    </div>
  )
}
