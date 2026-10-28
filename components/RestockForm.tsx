'use client'

import { useState, useMemo } from 'react'
import { submitRestockRequest } from '@/lib/actions/product'
import { Package, RotateCcw, CheckCircle2, AlertCircle, Search, ArrowUpRight } from 'lucide-react'
import Image from 'next/image'

type Product = {
  id: string
  name: string
  imageUrl: string | null
  stockQuantity: number
  price: number
}

export function RestockForm({ 
  products, 
  storeId, 
  isAdmin = false 
}: { 
  products: Product[]
  storeId: string
  isAdmin?: boolean 
}) {
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [directOverride, setDirectOverride] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [search, setSearch] = useState('')

  const updateQty = (id: string, val: string) => {
    if (val === '' || /^\d+$/.test(val)) {
      setQuantities(prev => ({ ...prev, [id]: val }))
    }
  }

  const addQuickQty = (id: string, amount: number) => {
    const current = parseInt(quantities[id] || '0') || 0
    const next = current + amount
    setQuantities(prev => ({ ...prev, [id]: String(next) }))
  }

  const totalUpdated = Object.values(quantities).filter(v => parseInt(v) > 0).length
  const totalUnitsAdded = Object.values(quantities).reduce((sum, v) => sum + (parseInt(v) || 0), 0)

  const [pageSize, setPageSize] = useState(48)

  // Pastikan bahwa stok yang nilainya tidak 0 berada di tampilan paling atas
  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const hasStockA = Number(a.stockQuantity) > 0 ? 1 : 0
      const hasStockB = Number(b.stockQuantity) > 0 ? 1 : 0
      // Prioritas 1: Stok > 0 selalu di paling atas
      if (hasStockA !== hasStockB) {
        return hasStockB - hasStockA
      }
      // Prioritas 2: Stok lebih banyak di atas
      if (b.stockQuantity !== a.stockQuantity) {
        return b.stockQuantity - a.stockQuantity
      }
      // Prioritas 3: Nama alfabetis
      return a.name.localeCompare(b.name, 'id', { sensitivity: 'base' })
    })

  // Limit rendering DOM: Prioritaskan produk yang kuantitasnya sudah diisi (> 0)
  const displayedProducts = useMemo(() => {
    const selected = filteredProducts.filter(p => (parseInt(quantities[p.id] || '0') || 0) > 0)
    const unselected = filteredProducts.filter(p => (parseInt(quantities[p.id] || '0') || 0) === 0)
    const remainingSlots = Math.max(0, pageSize - selected.length)
    return [...selected, ...unselected.slice(0, remainingSlots)]
  }, [filteredProducts, quantities, pageSize])

  async function handleSubmit() {
    const restocks = Object.entries(quantities)
      .map(([productId, val]) => ({ productId, qty: parseInt(val) || 0 }))
      .filter(r => r.qty > 0)

    if (restocks.length === 0) {
      setResult({ type: 'error', message: 'Belum ada produk yang diisi jumlah restoknya.' })
      return
    }

    setLoading(true)
    setResult(null)
    const res = await submitRestockRequest(restocks, storeId, notes, directOverride)
    setLoading(false)

    if ('error' in res && res.error) {
      setResult({ type: 'error', message: res.error })
    } else if ('pendingApproval' in res && res.pendingApproval) {
      setResult({
        type: 'success',
        message: `Permintaan restok berhasil diajukan (Batch: ${res.batchNo})! Menunggu persetujuan Super Admin.`
      })
      setQuantities({})
      setNotes('')
    } else if ('count' in res) {
      setResult({
        type: 'success',
        message: `Restok langsung berhasil diterapkan ke ${res.count} produk (total +${totalUnitsAdded} unit)!`
      })
      setQuantities({})
      setNotes('')
    }
  }

  const handleReset = () => {
    setQuantities({})
    setNotes('')
    setResult(null)
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Result Banner */}
      {result && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm font-medium animate-in fade-in duration-200 ${
          result.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200'
        }`}>
          {result.type === 'success'
            ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          }
          <span>{result.message}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-3.5 sm:p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari varian roti..."
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPageSize(48)
            }}
            className="w-full pl-9 pr-3 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          />
        </div>

        {/* Stats + Actions */}
        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto justify-end">
          {isAdmin && (
            <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer select-none bg-gray-50 dark:bg-gray-800 px-2.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <input
                type="checkbox"
                checked={directOverride}
                onChange={e => setDirectOverride(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-medium">Bypass (Restok Langsung)</span>
            </label>
          )}
          {totalUpdated > 0 && (
            <div className="flex items-center gap-3 text-xs text-indigo-900 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 px-3 py-2 rounded-xl">
              <span><strong className="text-indigo-600 dark:text-indigo-400">{totalUpdated}</strong> produk</span>
              <span><strong className="text-indigo-600 dark:text-indigo-400">+{totalUnitsAdded}</strong> unit</span>
            </div>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-xs"
            disabled={loading}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || totalUpdated === 0}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-600 text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-xl transition-all shadow-xs shadow-indigo-500/20 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{directOverride ? `Simpan Langsung (${totalUpdated})` : `Ajukan Restok (${totalUpdated})`}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium text-xs sm:text-sm">Produk tidak ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedProducts.map(product => {
            const qty = parseInt(quantities[product.id] || '0') || 0
            const hasValue = qty > 0
            const isLowStock = product.stockQuantity > 0 && product.stockQuantity < 10
            const isOutOfStock = product.stockQuantity === 0

            return (
              <div
                key={product.id}
                className={`bg-white dark:bg-gray-900 rounded-2xl border flex flex-col transition-all duration-200 overflow-hidden ${
                  hasValue
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-xs'
                }`}
              >
                {/* Product image */}
                <div className="h-32 bg-gray-100 dark:bg-gray-800/70 relative overflow-hidden flex items-center justify-center">
                  {product.imageUrl ? (
                    <Image 
                      src={product.imageUrl} 
                      alt={product.name} 
                      fill 
                      sizes="(max-width: 640px) 50vw, 25vw" 
                      className="object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                    </div>
                  )}

                  {/* Out of Stock Subtle Pill */}
                  {isOutOfStock && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-900/80 dark:bg-black/80 text-gray-300 backdrop-blur-xs border border-gray-700/60 shadow-xs">
                        Stok 0
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-3.5 sm:p-4 space-y-3 flex-1 flex flex-col justify-between">
                  {/* Product info */}
                  <div>
                    <h3 className="font-heading font-bold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Rp {product.price.toLocaleString('id-ID')}
                    </p>
                  </div>

                  {/* Current stock status */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800/80">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">Stok Saat Ini:</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${
                      isOutOfStock
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        : isLowStock
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
                    }`}>
                      {product.stockQuantity} unit
                    </span>
                  </div>

                  {/* Restock input & shortcuts */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-medium text-gray-700 dark:text-gray-300">
                      <span>Tambah Stok (+):</span>
                      {hasValue && (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                          {product.stockQuantity} → {product.stockQuantity + qty}
                        </span>
                      )}
                    </div>

                    <input
                      type="number"
                      min="0"
                      value={quantities[product.id] ?? ''}
                      onChange={e => updateQty(product.id, e.target.value)}
                      placeholder="0"
                      disabled={loading}
                      className={`w-full h-10 rounded-xl border text-sm text-center font-bold outline-none transition-all ${
                        hasValue
                          ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-500/20'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-gray-600 focus:border-indigo-500'
                      }`}
                    />

                    {/* Quick increment chips */}
                    <div className="flex gap-1 pt-0.5">
                      {[10, 20, 50].map((step) => (
                        <button
                          key={step}
                          type="button"
                          onClick={() => addQuickQty(product.id, step)}
                          className="flex-1 py-1 rounded-lg text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300 border border-gray-200/60 dark:border-gray-700/60 transition-colors"
                        >
                          +{step}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Progressive Pagination Indicator for Large Catalog */}
      {filteredProducts.length > displayedProducts.length && (
        <div className="flex flex-col items-center justify-center pt-2 pb-6 space-y-1.5">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Menampilkan {displayedProducts.length} dari {filteredProducts.length} varian roti
          </p>
          <button
            type="button"
            onClick={() => setPageSize(prev => prev + 48)}
            className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-xs transition-all active:scale-95"
          >
            Muat Lebih Banyak (+48 varian)
          </button>
        </div>
      )}

      {/* Floating Bottom Glass Dock */}
      {totalUpdated > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300 w-full max-w-2xl px-4">
          <div className="bg-gray-900/95 dark:bg-gray-950/95 backdrop-blur-md border border-gray-700/80 shadow-2xl p-3 sm:px-5 sm:py-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <div className="text-xs">
                <span className="text-gray-400">Total: </span>
                <span className="font-bold text-white">{totalUpdated} produk</span>
                <span className="text-emerald-400 font-bold ml-1.5">(+{totalUnitsAdded} unit)</span>
              </div>
              <input
                type="text"
                placeholder="Catatan pengajuan (opsional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="hidden sm:block text-xs bg-gray-800/80 border border-gray-700 rounded-lg px-2.5 py-1.5 text-white placeholder-gray-400 outline-none focus:border-indigo-500 w-48"
              />
              {isAdmin && (
                <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={directOverride}
                    onChange={e => setDirectOverride(e.target.checked)}
                    className="rounded text-indigo-500 focus:ring-indigo-400"
                  />
                  <span>Bypass</span>
                </label>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
            >
              {loading 
                ? 'Memproses...' 
                : (directOverride ? 'Simpan Restok Langsung' : 'Ajukan Permintaan Restok')}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
