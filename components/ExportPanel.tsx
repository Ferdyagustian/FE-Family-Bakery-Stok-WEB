'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { 
  Download, 
  FileSpreadsheet, 
  Calendar, 
  Store, 
  Filter, 
  Loader2, 
  Table2, 
  Search, 
  DollarSign, 
  ShoppingBag, 
  Receipt, 
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  PackageCheck
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { formatCompactRupiah, formatFullRupiah } from '@/lib/format'

type StoreOption = { id: string; name: string }

function getPresetRange(preset: string): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().split('T')[0]

  switch (preset) {
    case 'today': {
      return { from: to, to }
    }
    case '7days': {
      const d = new Date(now)
      d.setDate(d.getDate() - 6)
      return { from: d.toISOString().split('T')[0], to }
    }
    case '30days': {
      const d = new Date(now)
      d.setDate(d.getDate() - 29)
      return { from: d.toISOString().split('T')[0], to }
    }
    case 'month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: first.toISOString().split('T')[0], to }
    }
    default:
      return { from: '', to: '' }
  }
}

function formatDateSafe(dateVal: any): string {
  if (!dateVal) return '-'
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return '-'
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta'
    }).format(d)
  } catch {
    return '-'
  }
}

interface ExportPanelProps {
  stores: StoreOption[]
  userRole?: string
  userStoreId?: string
}

export function ExportPanel({ stores, userRole = 'ADMIN', userStoreId = '' }: ExportPanelProps) {
  const isManager = userRole === 'MANAGER'
  
  const [type, setType] = useState<'sales' | 'stock'>('sales')
  const [storeId, setStoreId] = useState<string>(isManager && userStoreId ? userStoreId : '')
  const [datePreset, setDatePreset] = useState('30days')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [searchTable, setSearchTable] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [error, setError] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  const dateRange = useMemo(() => {
    if (datePreset === 'custom') return { from: customFrom, to: customTo }
    return getPresetRange(datePreset)
  }, [datePreset, customFrom, customTo])

  // Fetch Data Function
  const loadData = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const params = new URLSearchParams({ type })
      const activeStore = isManager && userStoreId ? userStoreId : storeId
      if (activeStore) params.set('storeId', activeStore)
      
      if (type === 'sales') {
        if (dateRange.from) params.set('from', dateRange.from)
        if (dateRange.to) params.set('to', dateRange.to)
      }

      const res = await fetch(`/api/export?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Gagal mengambil data laporan')
      }
      const json = await res.json()
      setData(json.data || [])
      setCurrentPage(1)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memuat data')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [type, storeId, isManager, userStoreId, dateRange])

  // Automatically fetch data on filter change
  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtered Table Rows
  const filteredData = useMemo(() => {
    if (!searchTable.trim()) return data
    const q = searchTable.toLowerCase()
    return data.filter(item => {
      const prodName = (item.produk || item.Produk || '').toLowerCase()
      const branchName = (item.cabang || item.Cabang || '').toLowerCase()
      return prodName.includes(q) || branchName.includes(q)
    })
  }, [data, searchTable])

  // KPI Calculations
  const totalOmzet = useMemo(() => {
    if (type !== 'sales') return 0
    return data.reduce((sum, item) => sum + (item.total || 0), 0)
  }, [data, type])

  const totalQtySold = useMemo(() => {
    if (type !== 'sales') return 0
    return data.reduce((sum, item) => sum + (item.jumlah || 0), 0)
  }, [data, type])

  const totalProfit = useMemo(() => {
    if (type !== 'sales') return 0
    return data.reduce((sum, item) => sum + (item.profit || Math.round((item.total || 0) * 0.35)), 0)
  }, [data, type])

  // Pagination Slice
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize])

  // ── Download Excel (.xlsx) ───────────────────────────
  function handleDownloadExcel() {
    if (!data || data.length === 0) {
      setError('Tidak ada data untuk di-download')
      return
    }

    let sheetData: Record<string, any>[]
    let fileName: string

    const nowStr = new Date().toISOString().split('T')[0]

    if (type === 'sales') {
      sheetData = data.map((s, i) => ({
        'No.': i + 1,
        'Tanggal & Waktu': formatDateSafe(s.tanggal),
        'Cabang': s.cabang,
        'Nama Produk': s.produk,
        'Jumlah (Qty)': s.jumlah,
        'Harga Satuan (Rp)': s.hargaSatuan,
        'Total Omzet (Rp)': s.total,
        'Estimasi Profit (Rp)': s.profit || Math.round(s.total * 0.35),
      }))
      fileName = `Laporan_Penjualan_${storeId ? 'Cabang' : 'Semua_Cabang'}_${nowStr}.xlsx`
    } else {
      sheetData = data
      fileName = `Laporan_Stok_Produk_${storeId ? 'Cabang' : 'Semua_Cabang'}_${nowStr}.xlsx`
    }

    const ws = XLSX.utils.json_to_sheet(sheetData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, type === 'sales' ? 'Penjualan' : 'Stok Produk')
    XLSX.writeFile(wb, fileName)
  }

  return (
    <div className="space-y-5">
      {/* ── 1. Filter Control Card ────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-800 p-4 sm:p-5 space-y-4">
        
        {/* Tipe Laporan Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
              Filter Data Laporan
            </span>
          </div>

          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200/60 dark:border-gray-700/60">
            <button
              onClick={() => setType('sales')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                type === 'sales'
                  ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Laporan Penjualan
            </button>
            <button
              onClick={() => setType('stock')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                type === 'stock'
                  ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Laporan Stok Produk
            </button>
          </div>
        </div>

        {/* Filter Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          
          {/* Cabang Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
              Cabang Toko
            </label>
            <div className="relative">
              <select
                value={isManager && userStoreId ? userStoreId : storeId}
                onChange={(e) => setStoreId(e.target.value)}
                disabled={isManager}
                className="w-full h-10 px-3 pr-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed appearance-none shadow-xs"
              >
                {!isManager && <option value="">Semua Cabang (Keseluruhan)</option>}
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Store className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Rentang Tanggal (Hanya Penjualan) */}
          {type === 'sales' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                Periode Waktu
              </label>
              <div className="relative">
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value)}
                  className="w-full h-10 px-3 pr-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none shadow-xs"
                >
                  <option value="today">Hari Ini</option>
                  <option value="7days">7 Hari Terakhir</option>
                  <option value="30days">30 Hari Terakhir</option>
                  <option value="month">Bulan Ini (Mulai Tgl 1)</option>
                  <option value="custom">Pilih Tanggal Kustom</option>
                </select>
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Custom Date Picker */}
          {type === 'sales' && datePreset === 'custom' && (
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Dari</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Sampai</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Quick Download Button in toolbar */}
          <div className="flex items-end">
            <button
              onClick={handleDownloadExcel}
              disabled={loading || data.length === 0}
              className="w-full h-10 inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold active:scale-[0.98] transition-all disabled:opacity-50 shadow-xs shadow-indigo-500/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download Excel (.xlsx)</span>
            </button>
          </div>

        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
            {error}
          </div>
        )}
      </div>

      {/* ── 2. KPI Summary Cards (Sales Mode) ─────────────── */}
      {type === 'sales' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Total Omzet */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Omzet</span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-heading font-extrabold text-gray-900 dark:text-white mt-2" title={formatFullRupiah(totalOmzet)}>
              {formatCompactRupiah(totalOmzet)}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              {data.length > 0 ? 'Omzet terfilter' : 'Belum ada transaksi'}
            </p>
          </div>

          {/* Card 2: Roti Terjual */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Roti Terjual</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-heading font-extrabold text-gray-900 dark:text-white mt-2">
              {totalQtySold.toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-500">unit</span>
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              Total volume item
            </p>
          </div>

          {/* Card 3: Total Transaksi */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Baris Transaksi</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-heading font-extrabold text-gray-900 dark:text-white mt-2">
              {data.length.toLocaleString('id-ID')}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              Riwayat penjualan tercatat
            </p>
          </div>

          {/* Card 4: Estimasi Profit */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Estimasi Margin (35%)</span>
              <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-heading font-extrabold text-emerald-600 dark:text-emerald-400 mt-2" title={formatFullRupiah(totalProfit)}>
              {formatCompactRupiah(totalProfit)}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              Gross profit bakery
            </p>
          </div>
        </div>
      )}

      {/* ── 3. Interactive Data Table ─────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-800 overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2">
            <Table2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-heading font-bold text-sm sm:text-base text-gray-900 dark:text-white">
              {type === 'sales' ? 'Rincian Transaksi Penjualan' : 'Rincian Stok Produk Toko'}
            </h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              ({filteredData.length} data)
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari produk / cabang..."
              value={searchTable}
              onChange={(e) => {
                setSearchTable(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-600" />
              <p className="text-xs">Memuat data laporan...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
              <PackageCheck className="w-12 h-12 opacity-30 mb-2" />
              <p className="text-sm font-semibold">Tidak ada transaksi ditemukan</p>
              <p className="text-xs text-gray-400 mt-0.5">Coba ubah rentang tanggal atau cabang di filter atas</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-100 dark:border-gray-800">
                {type === 'sales' ? (
                  <tr>
                    <th className="py-3 px-4">No.</th>
                    <th className="py-3 px-4">Waktu (WIB)</th>
                    <th className="py-3 px-4">Cabang</th>
                    <th className="py-3 px-4">Nama Produk</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Harga Satuan</th>
                    <th className="py-3 px-4 text-right">Total Omzet</th>
                    <th className="py-3 px-4 text-right">Profit (35%)</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="py-3 px-4">No.</th>
                    <th className="py-3 px-4">Cabang</th>
                    <th className="py-3 px-4">Nama Produk</th>
                    <th className="py-3 px-4 text-right">Harga</th>
                    <th className="py-3 px-4 text-center">Stok</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
                {paginatedData.map((row, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1
                  if (type === 'sales') {
                    const formattedDate = formatDateSafe(row.tanggal)

                    return (
                      <tr key={idx} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="py-3 px-4 text-gray-400">{globalIdx}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-gray-600 dark:text-gray-400 whitespace-nowrap">{formattedDate}</td>
                        <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{row.cabang}</td>
                        <td className="py-3 px-4 font-medium">{row.produk}</td>
                        <td className="py-3 px-4 text-center font-bold text-indigo-600 dark:text-indigo-400">{row.jumlah}</td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">Rp {Number(row.hargaSatuan).toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4 text-right font-bold whitespace-nowrap">Rp {Number(row.total).toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                          Rp {Number(row.profit || Math.round(row.total * 0.35)).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    )
                  } else {
                    return (
                      <tr key={idx} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="py-3 px-4 text-gray-400">{globalIdx}</td>
                        <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{row.Cabang}</td>
                        <td className="py-3 px-4 font-medium">{row.Produk}</td>
                        <td className="py-3 px-4 text-right">{row.Harga}</td>
                        <td className="py-3 px-4 text-center font-bold">{row.Stok} unit</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            row.Status === 'Habis'
                              ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                              : row.Status === 'Menipis'
                              ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          }`}>
                            {row.Status}
                          </span>
                        </td>
                      </tr>
                    )
                  }
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {filteredData.length > pageSize && (
          <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
            <span>
              Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredData.length)} dari {filteredData.length} data
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium text-gray-700 dark:text-gray-300">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
