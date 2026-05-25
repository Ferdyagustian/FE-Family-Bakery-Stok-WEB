'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell
} from 'recharts'
import { Calendar, TrendingUp } from 'lucide-react'


export const PRODUCT_COLORS = [
  '#9333ea', // purple
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#3b82f6', // blue
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#6366f1', // indigo
  '#eab308', // yellow
  '#22d3ee', // sky
  '#a78bfa', // lavender
  '#34d399', // green
  '#fb923c', // orange-light
  '#60a5fa', // blue-light
  '#c084fc', // purple-light
]

type SaleData = {
  date: string
  revenue: number
  profit: number
  store: string
}

// WIB timezone key
function toWIBDateKey(isoString: string, mode: 'daily' | 'monthly' | 'yearly'): string {
  const wibDate = new Date(new Date(isoString).getTime() + 7 * 3600_000)
  const y = wibDate.getUTCFullYear()
  const m = String(wibDate.getUTCMonth() + 1).padStart(2, '0')
  const d = String(wibDate.getUTCDate()).padStart(2, '0')
  if (mode === 'daily') return `${y}-${m}-${d}`
  if (mode === 'monthly') return `${y}-${m}`
  return `${y}`
}

function formatKeyLabel(key: string, mode: 'daily' | 'monthly' | 'yearly'): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  if (mode === 'daily') {
    const [, m, d] = key.split('-')
    return `${parseInt(d)} ${months[parseInt(m) - 1]}`
  }
  if (mode === 'monthly') {
    const [y, m] = key.split('-')
    return `${months[parseInt(m) - 1]} ${y}`
  }
  return key
}

type ProductSale = {
  productId: string
  productName: string
  storeId: string
  totalAmount: number
  profitAmount: number
  date: string
}

export function SalesChart({
  data,
  stores,
  productSales = [],
}: {
  data: SaleData[]
  stores: { id: string; name: string }[]
  productSales?: ProductSale[]
}) {
  const [timeFilter, setTimeFilter] = useState<'daily' | 'monthly' | 'yearly'>('daily')
  const [storeFilter, setStoreFilter] = useState<string>('all')
  const [chartMode, setChartMode] = useState<'stacked' | 'total'>('stacked')

  // Build per-product color map (stable across re-renders)
  const productColorMap = useMemo(() => {
    const map = new Map<string, string>()
    productSales.forEach(s => {
      if (!map.has(s.productId)) {
        map.set(s.productId, PRODUCT_COLORS[map.size % PRODUCT_COLORS.length])
      }
    })
    return map
  }, [productSales])

  // Unique products list
  const uniqueProducts = useMemo(() => {
    const seen = new Map<string, string>()
    productSales.forEach(s => { if (!seen.has(s.productId)) seen.set(s.productId, s.productName) })
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [productSales])

  // Stacked chart data: per time period, each product is a column
  const stackedChartData = useMemo(() => {
    let filtered = productSales
    if (storeFilter !== 'all') filtered = filtered.filter(d => d.storeId === storeFilter)

    const grouped = new Map<string, Record<string, number>>()

    filtered.forEach(item => {
      const key = toWIBDateKey(item.date, timeFilter)
      if (!grouped.has(key)) grouped.set(key, {})
      const entry = grouped.get(key)!
      entry[item.productId] = (entry[item.productId] || 0) + item.totalAmount
    })

    return Array.from(grouped.entries())
      .map(([key, products]) => ({ _key: key, name: formatKeyLabel(key, timeFilter), ...products }))
      .sort((a, b) => a._key.localeCompare(b._key))
  }, [productSales, timeFilter, storeFilter])

  // Aggregated (total) chart data
  const totalChartData = useMemo(() => {
    let filteredData = data
    if (storeFilter !== 'all') filteredData = data.filter(d => d.store === storeFilter)

    const grouped = new Map<string, { revenue: number; profit: number }>()
    filteredData.forEach(item => {
      const key = toWIBDateKey(item.date, timeFilter)
      if (!grouped.has(key)) grouped.set(key, { revenue: 0, profit: 0 })
      const e = grouped.get(key)!
      e.revenue += item.revenue
      e.profit += item.profit
    })

    return Array.from(grouped.entries())
      .map(([key, v]) => ({ _key: key, name: formatKeyLabel(key, timeFilter), ...v }))
      .sort((a, b) => a._key.localeCompare(b._key))
  }, [data, timeFilter, storeFilter])

  const isStacked = chartMode === 'stacked'
  const activeData = isStacked ? stackedChartData : totalChartData

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-heading font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            Grafik Penjualan Per Waktu
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Perbandingan pendapatan &amp; keuntungan dari waktu ke waktu</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Mode toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setChartMode('stacked')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${chartMode === 'stacked' ? 'bg-white dark:bg-gray-900 shadow-sm text-primary-700' : 'text-gray-500 dark:text-gray-400'}`}
            >
              Per Produk
            </button>
            <button
              onClick={() => setChartMode('total')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${chartMode === 'total' ? 'bg-white dark:bg-gray-900 shadow-sm text-primary-700' : 'text-gray-500 dark:text-gray-400'}`}
            >
              Total
            </button>
          </div>

          {/* Store filter */}
          <select
            className="h-9 text-sm rounded-lg border border-gray-200 dark:border-gray-700 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900"
            value={storeFilter}
            onChange={e => setStoreFilter(e.target.value)}
          >
            <option value="all">Semua Cabang</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {/* Time filter */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
            {(['daily', 'monthly', 'yearly'] as const).map(f => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${timeFilter === f ? 'bg-white dark:bg-gray-900 shadow-sm text-primary-700' : 'text-gray-500 dark:text-gray-400'}`}
              >
                {f === 'daily' ? 'Harian' : f === 'monthly' ? 'Bulanan' : 'Tahunan'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[380px] w-full">
        {activeData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={380} minWidth={300}>
            <BarChart data={activeData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tickFormatter={v => `Rp ${Number(v) >= 1000000 ? (Number(v) / 1000000).toFixed(1) + 'jt' : Number(v).toLocaleString()}`}
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                formatter={(value: any, name: any) => [
                  `Rp ${Number(value).toLocaleString('id-ID')}`,
                  isStacked
                    ? (uniqueProducts.find(p => p.id === name)?.name ?? name)
                    : name === 'revenue' ? 'Pendapatan' : 'Profit',
                ]}
                contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                cursor={{ fill: 'rgba(147,51,234,0.05)' }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }}
                formatter={name =>
                  isStacked
                    ? (uniqueProducts.find(p => p.id === name)?.name ?? name)
                    : name === 'revenue' ? 'Pendapatan' : 'Profit'
                }
              />

              {isStacked ? (
                // One Bar per product — stacked
                uniqueProducts.map(product => (
                  <Bar
                    key={product.id}
                    dataKey={product.id}
                    stackId="a"
                    fill={productColorMap.get(product.id) ?? '#9333ea'}
                    radius={uniqueProducts.indexOf(product) === uniqueProducts.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))
              ) : (
                // Two bars: revenue + profit
                <>
                  <Bar dataKey="revenue" name="revenue" fill="#d8b4fe" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="profit" fill="#9333ea" radius={[4, 4, 0, 0]} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <Calendar className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tidak ada data untuk filter ini</p>
          </div>
        )}
      </div>
    </div>
  )
}
