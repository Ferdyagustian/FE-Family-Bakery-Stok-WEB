'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import { Calendar, TrendingUp } from 'lucide-react'
import { formatCompactRupiah } from '@/lib/format'

export const PALETTE_COLORS = [
  '#6366f1', // Indigo (Top 1)
  '#3b82f6', // Blue (Top 2)
  '#10b981', // Emerald (Top 3)
  '#f59e0b', // Amber (Top 4)
  '#ec4899', // Pink (Top 5)
  '#94a3b8', // Slate (Lainnya)
]

type SaleData = {
  date: string
  revenue: number
  profit: number
  store: string
}

type ProductSale = {
  productId: string
  productName: string
  storeId: string
  totalAmount: number
  profitAmount: number
  date: string
}

// WIB timezone helper
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

export function SalesChart({
  data,
  stores,
  productSales = [],
}: {
  data: SaleData[]
  stores: { id: string; name: string }[]
  productSales?: ProductSale[]
}) {
  const [mounted, setMounted] = useState(false)
  const [timeFilter, setTimeFilter] = useState<'daily' | 'monthly' | 'yearly'>('daily')
  const [storeFilter, setStoreFilter] = useState<string>('all')
  const [chartMode, setChartMode] = useState<'total' | 'stacked'>('total')

  useEffect(() => {
    setMounted(true)
  }, [])

  // 1. Identifikasi Top 5 Produk Terlaris secara Global untuk Mode Stacked Bersih
  const { topProducts, topProductIds } = useMemo(() => {
    let filtered = productSales
    if (storeFilter !== 'all') filtered = filtered.filter(d => d.storeId === storeFilter)

    const revenueMap = new Map<string, { name: string; revenue: number }>()
    filtered.forEach(item => {
      if (!revenueMap.has(item.productId)) {
        revenueMap.set(item.productId, { name: item.productName, revenue: 0 })
      }
      revenueMap.get(item.productId)!.revenue += item.totalAmount
    })

    const sorted = Array.from(revenueMap.entries()).sort((a, b) => b[1].revenue - a[1].revenue)
    const top5 = sorted.slice(0, 5).map(([id, info]) => ({ id, name: info.name }))
    const topIds = new Set(top5.map(p => p.id))

    return { topProducts: top5, topProductIds: topIds }
  }, [productSales, storeFilter])

  // 2. Data Stacked (Hanya 5 Top Produk + "Lainnya" agar grafik rapi dan tidak bertumpuk 40 layer)
  const stackedChartData = useMemo(() => {
    let filtered = productSales
    if (storeFilter !== 'all') filtered = filtered.filter(d => d.storeId === storeFilter)

    const grouped = new Map<string, Record<string, number>>()

    filtered.forEach(item => {
      const key = toWIBDateKey(item.date, timeFilter)
      if (!grouped.has(key)) {
        grouped.set(key, { other: 0 })
      }
      const entry = grouped.get(key)!

      if (topProductIds.has(item.productId)) {
        entry[item.productId] = (entry[item.productId] || 0) + item.totalAmount
      } else {
        entry.other = (entry.other || 0) + item.totalAmount
      }
    })

    return Array.from(grouped.entries())
      .map(([key, products]) => ({
        _key: key,
        name: formatKeyLabel(key, timeFilter),
        ...products
      }))
      .sort((a, b) => a._key.localeCompare(b._key))
  }, [productSales, timeFilter, storeFilter, topProductIds])

  // 3. Data Total (Pendapatan & Profit)
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

  // Daftar item Stacked aktif (Top 5 + Lainnya)
  const activeSeries = useMemo(() => {
    const list = topProducts.map((p, idx) => ({
      id: p.id,
      name: p.name,
      color: PALETTE_COLORS[idx % PALETTE_COLORS.length]
    }))
    list.push({
      id: 'other',
      name: 'Produk Lainnya',
      color: '#94a3b8'
    })
    return list
  }, [topProducts])

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-heading font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Grafik Penjualan Per Waktu
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Perbandingan omzet &amp; profit toko dari waktu ke waktu
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Toggle: Total vs Top Produk */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setChartMode('total')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                chartMode === 'total'
                  ? 'bg-white dark:bg-gray-900 shadow-sm text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200'
              }`}
            >
              Total Omzet
            </button>
            <button
              onClick={() => setChartMode('stacked')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                chartMode === 'stacked'
                  ? 'bg-white dark:bg-gray-900 shadow-sm text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200'
              }`}
            >
              Per Top Produk
            </button>
          </div>

          {/* Store filter */}
          <select
            className="h-9 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
            value={storeFilter}
            onChange={e => setStoreFilter(e.target.value)}
          >
            <option value="all">Semua Cabang</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {/* Time filter */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
            {(['daily', 'monthly', 'yearly'] as const).map(f => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  timeFilter === f
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

      {/* Chart Canvas */}
      <div className="h-[340px] w-full min-w-0">
        {!mounted ? (
          <div className="w-full h-full rounded-2xl bg-gray-50/50 dark:bg-gray-800/20 animate-pulse flex items-center justify-center">
            <span className="text-xs text-gray-400">Memuat grafik...</span>
          </div>
        ) : activeData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={340}>
            <BarChart data={activeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.6} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                dy={8}
              />
              <YAxis
                tickFormatter={v => formatCompactRupiah(Number(v), false)}
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={75}
              />
              <Tooltip
                formatter={(value: any, name: any) => {
                  const valNum = Number(value) || 0
                  let labelName = name
                  if (isStacked) {
                    const match = activeSeries.find(s => s.id === name)
                    labelName = match ? match.name : name
                  } else {
                    labelName = name === 'revenue' ? 'Total Omzet' : 'Total Profit'
                  }
                  return [`Rp ${valNum.toLocaleString('id-ID')}`, labelName]
                }}
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  color: '#ffffff',
                  fontSize: '12px',
                  padding: '10px 14px'
                }}
                itemStyle={{ color: '#fff' }}
                cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
              />

              {isStacked ? (
                // 5 Stacked bars + 1 Other segment
                activeSeries.map((series, idx) => (
                  <Bar
                    key={series.id}
                    dataKey={series.id}
                    name={series.name}
                    stackId="a"
                    fill={series.color}
                    radius={idx === activeSeries.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                  />
                ))
              ) : (
                // Clean 2-bar comparison: Revenue & Profit
                <>
                  <Bar dataKey="revenue" name="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={24} />
                  <Bar dataKey="profit" name="profit" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
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

      {/* Clean Bottom Legend Bar */}
      {activeData.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
          {isStacked ? (
            activeSeries.map(s => (
              <div key={s.id} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-gray-600 dark:text-gray-400 font-medium truncate max-w-[140px]" title={s.name}>
                  {s.name}
                </span>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-indigo-600" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">Total Omzet Pendapatan</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-emerald-500" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">Estimasi Keuntungan (Profit)</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
