'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts'
import { Package, Search, Trophy, Store } from 'lucide-react'
import { formatCompactRupiah, formatFullRupiah } from '@/lib/format'
import { CustomDropdown } from '@/components/CustomDropdown'

type ProductSale = {
  productId: string
  productName: string
  storeId: string
  storeName: string
  quantitySold: number
  totalAmount: number
  profitAmount: number
  date: string
}

const PALETTE = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#94a3b8', // Slate (Lainnya)
]

// WIB timezone helper
function toWIBDateKey(isoString: string, mode: 'daily' | 'monthly' | 'yearly'): string {
  const WIB_OFFSET_MS = 7 * 60 * 60 * 1000
  const wibDate = new Date(new Date(isoString).getTime() + WIB_OFFSET_MS)
  const y = wibDate.getUTCFullYear()
  const m = String(wibDate.getUTCMonth() + 1).padStart(2, '0')
  const d = String(wibDate.getUTCDate()).padStart(2, '0')
  if (mode === 'daily') return `${y}-${m}-${d}`
  if (mode === 'monthly') return `${y}-${m}`
  return `${y}`
}

function getCurrentWIBKey(mode: 'daily' | 'monthly' | 'yearly'): string {
  return toWIBDateKey(new Date().toISOString(), mode)
}

export function ProductSalesBreakdown({
  data,
  stores,
}: {
  data: ProductSale[]
  stores: { id: string; name: string }[]
}) {
  const [mounted, setMounted] = useState(false)
  const [timeFilter, setTimeFilter] = useState<'daily' | 'monthly' | 'yearly'>('monthly')
  const [storeFilter, setStoreFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  const { productData, pieData, totalRevenue, totalProfit } = useMemo(() => {
    const currentKey = getCurrentWIBKey(timeFilter)

    let filtered = data.filter(item => toWIBDateKey(item.date, timeFilter) === currentKey)

    if (storeFilter !== 'all') {
      filtered = filtered.filter(d => d.storeId === storeFilter)
    }

    // Agregasi per produk
    const map = new Map<string, {
      name: string
      qty: number
      revenue: number
      profit: number
    }>()

    filtered.forEach(item => {
      if (!map.has(item.productId)) {
        map.set(item.productId, { name: item.productName, qty: 0, revenue: 0, profit: 0 })
      }
      const entry = map.get(item.productId)!
      entry.qty += item.quantitySold
      entry.revenue += item.totalAmount
      entry.profit += item.profitAmount
    })

    const sorted = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
    const totalRevenue = sorted.reduce((s, p) => s + p.revenue, 0)
    const totalProfit = sorted.reduce((s, p) => s + p.profit, 0)

    // Bentuk data Pie: Top 5 Produk + "Lainnya" agar grafik donat selalu bersih & elegan
    let pieData: { name: string; revenue: number; qty: number; percent: number }[] = []
    if (sorted.length <= 6) {
      pieData = sorted.map(p => ({
        name: p.name,
        revenue: p.revenue,
        qty: p.qty,
        percent: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0
      }))
    } else {
      const top5 = sorted.slice(0, 5).map(p => ({
        name: p.name,
        revenue: p.revenue,
        qty: p.qty,
        percent: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0
      }))
      const others = sorted.slice(5)
      const othersRevenue = others.reduce((s, p) => s + p.revenue, 0)
      const othersQty = others.reduce((s, p) => s + p.qty, 0)
      const othersPercent = totalRevenue > 0 ? (othersRevenue / totalRevenue) * 100 : 0

      pieData = [
        ...top5,
        {
          name: `Lainnya (${others.length} Menu)`,
          revenue: othersRevenue,
          qty: othersQty,
          percent: othersPercent
        }
      ]
    }

    return { productData: sorted, pieData, totalRevenue, totalProfit }
  }, [data, timeFilter, storeFilter])

  // Filter list produk berdasarkan pencarian
  const displayedProducts = useMemo(() => {
    if (!searchQuery.trim()) return productData
    const q = searchQuery.toLowerCase()
    return productData.filter(p => p.name.toLowerCase().includes(q))
  }, [productData, searchQuery])

  const periodLabel = timeFilter === 'daily' ? 'Hari Ini' : timeFilter === 'monthly' ? 'Bulan Ini' : 'Tahun Ini'

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-heading font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Breakdown Penjualan Produk
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Produk terjual &amp; profit — <span className="font-semibold text-indigo-600 dark:text-indigo-400">{periodLabel}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CustomDropdown
            value={storeFilter}
            onChange={setStoreFilter}
            icon={<Store className="w-3.5 h-3.5" />}
            options={[
              { value: 'all', label: 'Semua Cabang' },
              ...stores.map(s => ({ value: s.id, label: s.name }))
            ]}
            className="w-full sm:w-44"
            size="sm"
          />

          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
            {(['daily', 'monthly', 'yearly'] as const).map(f => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${timeFilter === f
                  ? 'bg-white dark:bg-gray-900 shadow-sm text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200'
                  }`}
              >
                {f === 'daily' ? 'Harian' : f === 'monthly' ? 'Bulanan' : 'Tahunan'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {productData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-gray-400 dark:text-gray-500">
          <Package className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium text-gray-500 dark:text-gray-400">Tidak ada penjualan pada periode {periodLabel.toLowerCase()}</p>
          <p className="text-xs mt-1 text-gray-400">Catat transaksi di halaman kasir untuk melihat data</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT: Clean Donut Chart (Top 5 + Others) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
            <div className="w-full flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Pangsa Omzet (Top Kontributor)
              </span>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                {productData.length} Total Varian
              </span>
            </div>

            <div className="relative w-full h-[220px] min-w-0 flex items-center justify-center">
              {!mounted ? (
                <div className="w-28 h-28 rounded-full border-4 border-indigo-100 dark:border-indigo-950/40 animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="revenue"
                      nameKey="name"
                      stroke="none"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        `Rp ${Number(value).toLocaleString('id-ID')}`,
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                        color: '#ffffff',
                        fontSize: '12px',
                        padding: '8px 12px'
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {/* Centered Donut Stat */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[11px] font-medium text-gray-400">Total Omzet</span>
                <span 
                  className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white"
                  title={formatFullRupiah(totalRevenue)}
                >
                  {formatCompactRupiah(totalRevenue, false)}
                </span>
              </div>
            </div>

            {/* Clean Legend Badges (Max 6) */}
            <div className="w-full flex flex-wrap justify-center gap-2 mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
              {pieData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-200/60 dark:border-gray-700/60 text-[11px]">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                  <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[110px]" title={item.name}>
                    {item.name}
                  </span>
                  <span className="text-gray-400 font-bold ml-0.5">
                    {item.percent.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>

            {/* Total Profit Bar */}
            <div className="w-full mt-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Estimasi Total Profit</p>
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  Rp {totalProfit.toLocaleString('id-ID')}
                </p>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded-md">
                {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}% Margin
              </span>
            </div>
          </div>

          {/* RIGHT: High-Performance Scrollable Ranking List */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" />
                Ranking Produk Terlaris ({displayedProducts.length})
              </p>
              
              {/* Search Bar */}
              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1.5 custom-scrollbar">
              {displayedProducts.map((product, index) => {
                const revenuePercent = totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0
                const rank = productData.indexOf(product) + 1
                
                return (
                  <div
                    key={index}
                    className="bg-gray-50/80 dark:bg-gray-800/60 hover:bg-gray-100/80 dark:hover:bg-gray-800 transition-colors rounded-xl p-2.5 border border-gray-100/80 dark:border-gray-800/80"
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      {/* Rank Badge */}
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${
                          rank === 1
                            ? 'bg-amber-500 text-white shadow-sm'
                            : rank === 2
                            ? 'bg-slate-400 text-white'
                            : rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium'
                        }`}
                      >
                        {rank}
                      </div>

                      {/* Product Name & Qty */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-xs truncate" title={product.name}>
                          {product.name}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {product.qty.toLocaleString('id-ID')} unit terjual
                        </p>
                      </div>

                      {/* Revenue & Profit */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white">
                          Rp {product.revenue.toLocaleString('id-ID')}
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          +Rp {product.profit.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700/60 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, revenuePercent))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                      <span>Kontribusi Omzet</span>
                      <span className="font-semibold text-gray-600 dark:text-gray-300">{revenuePercent.toFixed(1)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
