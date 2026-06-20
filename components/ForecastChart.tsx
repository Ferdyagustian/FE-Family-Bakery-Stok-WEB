'use client'

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
import { AlertCircle } from 'lucide-react'

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
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 rounded-xl shadow-xl">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {entry.name}: <span className="font-bold">{entry.value}</span> <span className="text-xs text-gray-500">item</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export function ForecastChart({ data, isLoading, error }: ForecastChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Lila Rule: Neutral Base, vibrant contrast colors
  const gridColor = isDark ? '#374151' : '#f3f4f6'
  const textColor = isDark ? '#9ca3af' : '#6b7280'
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

  // Empty state logic
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-80 rounded-2xl border border-dashed border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400">
        <AlertCircle className="w-8 h-8 mb-3 opacity-80" />
        <p className="text-sm font-medium max-w-[300px] text-center">{error}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 animate-pulse">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Memproses prediksi model AI...</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4">
          <div className="w-6 h-6 border-2 border-indigo-500 rounded-sm opacity-50" />
        </div>
        <h3 className="text-lg font-heading font-bold text-gray-900 dark:text-white mb-1">Belum Ada Data</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[320px] text-center">
          Pilih toko dan produk di sebelah kiri, lalu jalankan prediksi untuk melihat estimasi penjualan.
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
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
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
            tick={{ fill: textColor, fontSize: 12, fontWeight: 500 }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: textColor, fontSize: 12, fontWeight: 500 }}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: gridColor, strokeWidth: 2, strokeDasharray: '4 4' }} />
          {data.length > 1 && <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />}
          
          {data.map((series, index) => (
            <Line
              key={series.id}
              type="monotone"
              dataKey={series.name}
              stroke={colors[index % colors.length]}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
