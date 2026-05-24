'use client'

import { useMemo, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Package, TrendingUp } from 'lucide-react'

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

const COLORS = [
  '#9333ea', // ungu
  '#f59e0b', // amber
  '#10b981', // hijau emerald
  '#ef4444', // merah
  '#3b82f6', // biru
  '#f97316', // oranye
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime hijau
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#6366f1', // indigo
  '#eab308', // kuning
  '#22d3ee', // biru langit
  '#a78bfa', // lavender
  '#34d399', // hijau muda
  '#fb923c', // oranye muda
  '#60a5fa', // biru muda
  '#c084fc', // ungu muda
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
  const [timeFilter, setTimeFilter] = useState<'daily' | 'monthly' | 'yearly'>('daily')
  const [storeFilter, setStoreFilter] = useState<string>('all')

  const { productData, totalRevenue, totalProfit } = useMemo(() => {
    // Filter by time: only show data for current period (today / this month / this year)
    const currentKey = getCurrentWIBKey(timeFilter)

    let filtered = data.filter(item => toWIBDateKey(item.date, timeFilter) === currentKey)

    if (storeFilter !== 'all') {
      filtered = filtered.filter(d => d.storeId === storeFilter)
    }

    // Aggregate by product
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

    return { productData: sorted, totalRevenue, totalProfit }
  }, [data, timeFilter, storeFilter])

  const periodLabel = timeFilter === 'daily' ? 'Hari Ini' : timeFilter === 'monthly' ? 'Bulan Ini' : 'Tahun Ini'

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-heading font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-600" />
            Breakdown Penjualan Produk
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Produk terjual &amp; profit — <span className="font-semibold text-primary-600">{periodLabel}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 text-sm rounded-lg border border-gray-200 dark:border-gray-700 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900"
            value={storeFilter}
            onChange={e => setStoreFilter(e.target.value)}
          >
            <option value="all">Semua Cabang</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
            {(['daily', 'monthly', 'yearly'] as const).map(f => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${timeFilter === f
                  ? 'bg-white dark:bg-gray-900 shadow-sm text-primary-700'
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
          <p className="font-medium text-gray-500 dark:text-gray-400">Tidak ada penjualan pada periode ini</p>
          <p className="text-sm mt-1">Catat penjualan di halaman cabang untuk melihat data</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Pie Chart */}
          <div className="flex flex-col items-center w-full">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">Distribusi Pendapatan</p>
            <ResponsiveContainer width="100%" height={260} minHeight={260} minWidth={250}>
              <PieChart>
                <Pie
                  data={productData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="revenue"
                  nameKey="name"
                >
                  {productData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `Rp ${Number(value).toLocaleString('id-ID')}`,
                    name,
                  ]}
                  contentStyle={{
                    borderRadius: '10px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                  formatter={(value) =>
                    value.length > 18 ? value.slice(0, 18) + '…' : value
                  }
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Summary totals below pie */}
            <div className="flex gap-6 mt-2">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Pendapatan</p>
                <p className="text-base font-bold text-gray-800 dark:text-gray-100">
                  Rp {totalRevenue.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Profit</p>
                <p className="text-base font-bold text-primary-700">
                  Rp {totalProfit.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>

          {/* Ranking Table */}
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">Ranking Produk Terlaris</p>
            <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1">
              {productData.map((product, index) => {
                const revenuePercent = totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0
                return (
                  <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: COLORS[index % COLORS.length] }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{product.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{product.qty} unit terjual</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                          Rp {product.revenue.toLocaleString('id-ID')}
                        </p>
                        <p className="text-xs text-primary-600 font-medium">
                          +Rp {product.profit.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                    {/* Revenue bar */}
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${revenuePercent}%`,
                          background: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                    <p className="text-right text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {revenuePercent.toFixed(1)}% dari total
                    </p>
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
