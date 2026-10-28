'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { ForecastSeries } from '@/components/ForecastChart'

const ForecastChart = dynamic(
  () => import('@/components/ForecastChart').then((m) => m.ForecastChart),
  {
    loading: () => (
      <div className="h-80 w-full animate-pulse bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800" />
    ),
    ssr: false,
  }
)
import { Store, Package, Sparkles, Check, Search, RotateCcw, TrendingUp, Globe, Layers } from 'lucide-react'

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
  token
}: {
  stores: StoreType[]
  products: ProductType[]
  token: string
}) {
  const [storeIds, setStoreIds] = useState<string[]>(['ALL'])
  const [productIds, setProductIds] = useState<string[]>(['ALL'])
  const [productSearch, setProductSearch] = useState('')
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

  const selectAllProducts = () => {
    setProductIds(['ALL'])
  }

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products
    const q = productSearch.toLowerCase()
    return products.filter(p => p.name.toLowerCase().includes(q))
  }, [products, productSearch])

  const handlePredict = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (storeIds.length === 0 || productIds.length === 0) return

    setIsLoading(true)
    setError(null)
    setForecastData(null)

    try {
      // Selalu panggil endpoint native Next.js internal
      const response = await fetch('/api/forecast', {
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
        throw new Error(result.detail || result.error || 'Gagal memproses peramalan data.')
      }

      setForecastData(result.series)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Terjadi kendala koneksi saat menghubungi endpoint prediksi.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* LEFT: Controls Panel */}
      <div className="lg:col-span-4 bg-white dark:bg-gray-900 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-heading font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Parameter Prediksi
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-md">
            Horizon 7 Hari
          </span>
        </div>
        
        <form onSubmit={handlePredict} className="flex flex-col gap-5">
          {/* 1. Pilih Cabang */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <Store className="w-3.5 h-3.5" /> Cabang Toko
              </label>
              <span className="text-[11px] text-gray-400 font-medium">
                {storeIds.includes('ALL') ? 'Semua Cabang' : `${storeIds.length} Terpilih`}
              </span>
            </div>
            
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar bg-gray-50/50 dark:bg-gray-800/40 p-1.5 rounded-xl border border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => toggleStore('ALL')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                  storeIds.includes('ALL') 
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm' 
                  : 'hover:bg-gray-200/60 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-2 font-medium">
                  <Globe className={`w-3.5 h-3.5 ${storeIds.includes('ALL') ? 'text-white' : 'text-indigo-500'}`} />
                  Semua Cabang (Gabungan)
                </span>
                {storeIds.includes('ALL') && <Check className="w-3.5 h-3.5" />}
              </button>
              {stores.map(s => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggleStore(s.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    storeIds.includes(s.id) 
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm' 
                    : 'hover:bg-gray-200/60 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="truncate max-w-[190px]">{s.name}</span>
                  {storeIds.includes(s.id) && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Pilih Produk */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <Package className="w-3.5 h-3.5" /> Varian Produk
              </label>
              <span className="text-[11px] text-gray-400 font-medium">
                {productIds.includes('ALL') ? 'Semua Produk' : `${productIds.length} Terpilih`}
              </span>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari menu produk..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar bg-gray-50/50 dark:bg-gray-800/40 p-1.5 rounded-xl border border-gray-100 dark:border-gray-800">
              {!productSearch && (
                <button
                  type="button"
                  onClick={selectAllProducts}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    productIds.includes('ALL') 
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm' 
                    : 'hover:bg-gray-200/60 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Layers className={`w-3.5 h-3.5 ${productIds.includes('ALL') ? 'text-white' : 'text-indigo-500'}`} />
                    Semua Produk (Total Agregat)
                  </span>
                  {productIds.includes('ALL') && <Check className="w-3.5 h-3.5" />}
                </button>
              )}
              {filteredProducts.map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => toggleProduct(p.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    productIds.includes(p.id) 
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm' 
                    : 'hover:bg-gray-200/60 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="truncate max-w-[190px]">{p.name}</span>
                  {productIds.includes(p.id) && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || storeIds.length === 0 || productIds.length === 0}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isLoading ? 'Menganalisis Pola Deret Waktu...' : 'Mulai Prediksi AI'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT: Visual Canvas */}
      <div className="lg:col-span-8 bg-white dark:bg-gray-900 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col min-h-[440px]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-heading font-bold text-gray-900 dark:text-white">
              Grafik Proyeksi 7 Hari Kedepan
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Estimasi kebutuhan adonan &amp; penjualan per hari
            </p>
          </div>
          {forecastData && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Analisis Selesai
            </span>
          )}
        </div>
        
        <div className="flex-1 flex flex-col justify-center">
          <ForecastChart data={forecastData || []} isLoading={isLoading} error={error} />
        </div>

        {error && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => handlePredict()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Coba Ulangi Prediksi
            </button>
          </div>
        )}
      </div>
      
    </div>
  )
}
