'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts'
import { AlertCircle, Sparkles } from 'lucide-react'

export interface ForecastSeries {
  id: string
  name: string
  forecast: { date: string; predicted_quantity: number }[]
}

interface ForecastChartProps {
  data: ForecastSeries[]
  isLoading?: boolean
  error?: string | null
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 dark:bg-gray-950/95 backdrop-blur-md border border-gray-800 text-white p-3.5 rounded-xl shadow-xl text-xs">
        <p className="font-semibold text-gray-300 mb-2 border-b border-gray-800 pb-1.5">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-300 font-medium truncate max-w-[140px]">{entry.name}</span>
              </div>
              <span className="font-bold text-white">
                {entry.value} <span className="text-[10px] text-gray-400 font-normal">unit</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export function ForecastChart({ data, isLoading, error }: ForecastChartProps) {
  const [mounted, setMounted] = useState(false)
  const { theme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])
  const isDark = theme === 'dark'

  const gridColor = isDark ? '#1f2937' : '#f3f4f6'
  const textColor = isDark ? '#9ca3af' : '#6b7280'
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6', '#f97316']

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-80 rounded-2xl border border-dashed border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-6">
        <AlertCircle className="w-9 h-9 mb-3 opacity-80" />
        <p className="text-sm font-semibold mb-1">Gagal Memproses Prediksi</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[320px] text-center">{error}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/30 animate-pulse">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mb-3" />
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Menjalankan Algoritma Deret Waktu...</p>
        <p className="text-[11px] text-gray-400 mt-0.5">Menganalisis pola musiman hari &amp; tren penjualan</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 p-6 text-center">
        <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center mb-3">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-sm font-heading font-bold text-gray-900 dark:text-white mb-1">Siap Melakukan Analisis</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[320px]">
          Pilih cabang dan varian produk di samping, lalu klik <strong>&quot;Mulai Prediksi AI&quot;</strong> untuk melihat proyeksi penjualan 7 hari ke depan.
        </p>
      </div>
    )
  }

  // Transform data into Recharts format
  const transformedData: any[] = []
  const dates = data[0].forecast.map(f => f.date)
  
  for (const date of dates) {
    const row: any = { date }
    for (const series of data) {
      const point = series.forecast.find(f => f.date === date)
      row[series.name] = point ? point.predicted_quantity : 0
    }
    transformedData.push(row)
  }

  const formatXAxis = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="w-full h-80 min-w-0">
      {!mounted ? (
        <div className="w-full h-full rounded-2xl bg-gray-50/50 dark:bg-gray-800/20 animate-pulse flex items-center justify-center">
          <span className="text-xs text-gray-400">Memuat grafik prediksi...</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={320}>
          <LineChart
            data={transformedData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxis}
              axisLine={false}
              tickLine={false}
              tick={{ fill: textColor, fontSize: 11, fontWeight: 500 }}
              dy={8}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: textColor, fontSize: 11, fontWeight: 500 }}
              dx={-6}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: gridColor, strokeWidth: 1.5, strokeDasharray: '4 4' }} />
            {data.length > 1 && (
              <Legend 
                wrapperStyle={{ paddingTop: '16px', fontSize: '11px' }} 
                iconType="circle"
                formatter={(value) => <span className="text-gray-700 dark:text-gray-300 font-medium">{value}</span>}
              />
            )}
            
            {data.map((series, index) => (
              <Line
                key={series.id}
                type="monotone"
                dataKey={series.name}
                stroke={colors[index % colors.length]}
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: colors[index % colors.length], strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
