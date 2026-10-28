'use client'

import { useState, useTransition } from 'react'
import { getBakingSchedule, updateOrderStatus, deleteCustomOrder, OrderStatus } from '@/lib/actions/order'
import { CreateOrderModal } from '@/components/CreateOrderModal'
import { CustomDropdown, CustomStatusDropdown } from '@/components/CustomDropdown'
import { 
  Calendar, Printer, ChefHat, 
  Search, Filter, Store, Phone, 
  Trash2, ShoppingBag, CheckSquare, Square, X
} from 'lucide-react'
import { toast } from 'sonner'
import { formatFullRupiah } from '@/lib/format'

interface BakingScheduleClientProps {
  initialDateStr: string
  initialSchedule: any
  initialOrders: any[]
  stores: { id: string; name: string }[]
  products: any[]
  isAdmin: boolean
  userStoreId?: string
}

export function BakingScheduleClient({
  initialDateStr,
  initialSchedule,
  initialOrders,
  stores,
  products,
  isAdmin,
  userStoreId
}: BakingScheduleClientProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'orders'>('schedule')
  const [selectedDate, setSelectedDate] = useState(initialDateStr)
  const [selectedStoreId, setSelectedStoreId] = useState<string>('ALL')
  const [scheduleData, setScheduleData] = useState(initialSchedule)
  const [ordersList, setOrdersList] = useState(initialOrders)
  const [isPending, startTransition] = useTransition()

  // Checked items state for kitchen bakers (local visual check)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

  // Orders Tab Filter
  const [searchOrder, setSearchOrder] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate)
    startTransition(async () => {
      const res = await getBakingSchedule(newDate, selectedStoreId)
      setScheduleData(res)
    })
  }

  const handleStoreFilterChange = (newStoreId: string) => {
    setSelectedStoreId(newStoreId)
    startTransition(async () => {
      const res = await getBakingSchedule(selectedDate, newStoreId)
      setScheduleData(res)
    })
  }

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    startTransition(async () => {
      const res = await updateOrderStatus(orderId, newStatus)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success('Status pesanan berhasil diperbarui!')
        // Update local state
        setOrdersList(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
        // Refresh schedule
        const refreshed = await getBakingSchedule(selectedDate, selectedStoreId)
        setScheduleData(refreshed)
      }
    })
  }

  const handleDelete = (orderId: string, orderNo: string) => {
    if (!confirm(`Hapus pesanan ${orderNo}? Data yang dihapus tidak dapat dikembalikan.`)) return
    startTransition(async () => {
      const res = await deleteCustomOrder(orderId)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success(`Pesanan ${orderNo} berhasil dihapus.`)
        setOrdersList(prev => prev.filter(o => o.id !== orderId))
        const refreshed = await getBakingSchedule(selectedDate, selectedStoreId)
        setScheduleData(refreshed)
      }
    })
  }

  const toggleCheck = (productId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }))
  }

  // Quick Date Helpers
  const setQuickDate = (offsetDays: number) => {
    const d = new Date()
    d.setDate(d.getDate() + offsetDays)
    const str = d.toISOString().split('T')[0]
    handleDateChange(str)
  }

  // Filtered orders for Tab 2
  const filteredOrders = ordersList.filter(o => {
    const matchesSearch = 
      o.orderNo.toLowerCase().includes(searchOrder.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchOrder.toLowerCase()) ||
      o.phone.toLowerCase().includes(searchOrder.toLowerCase())

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter
    return matchesSearch && matchesStatus
  })



  return (
    <div className="space-y-5 pb-24 sm:pb-10">
      {/* Top Header & Quick Actions */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-800 p-4 sm:p-5 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
              <ChefHat className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-heading font-bold text-gray-900 dark:text-white leading-tight">
                Pesanan &amp; Jadwal Dapur
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Pantau akumulasi produksi roti harian untuk dapur pusat serta kelola pesanan pre-order.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <CreateOrderModal 
              products={products} 
              stores={stores} 
              defaultStoreId={userStoreId} 
            />
          </div>
        </div>

        {/* Tab Navigation - Modern Segmented Control */}
        <div className="grid grid-cols-2 gap-1.5 p-1 mt-4 sm:mt-5 bg-gray-100/80 dark:bg-gray-800/80 rounded-xl max-w-xl">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'schedule'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              <span className="inline sm:hidden">Jadwal Dapur</span>
              <span className="hidden sm:inline">Lembar Jadwal Dapur</span>
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
              activeTab === 'schedule'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
              {scheduleData.totalBreadPieces} pcs
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              <span className="inline sm:hidden">Pre-Order</span>
              <span className="hidden sm:inline">Daftar Pre-Order</span>
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
              activeTab === 'orders'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
              {ordersList.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: BAKING SHEET (LEMBAR KERJA DAPUR) ────────────────── */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Date Selector & Presets */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="text-xs font-semibold pl-8 pr-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-indigo-500 shadow-xs"
                  />
                  <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setQuickDate(0)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(1)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-xs"
                  >
                    Besok
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(2)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    Lusa
                  </button>
                </div>
              </div>

              {/* Store Filter & Print */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {isAdmin && (
                  <CustomDropdown
                    options={[
                      { value: 'ALL', label: 'Semua Cabang Toko' },
                      ...stores.map(s => ({ value: s.id, label: s.name }))
                    ]}
                    value={selectedStoreId}
                    onChange={handleStoreFilterChange}
                    icon={<Store className="w-3.5 h-3.5" />}
                    size="sm"
                    className="flex-1 sm:flex-none"
                  />
                )}

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors shadow-xs active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cetak Lembar Dapur</span>
                  <span className="inline sm:hidden">Cetak Dapur</span>
                </button>
              </div>
            </div>
          </div>

          {/* KPI Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-4 rounded-2xl shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider block">Total Roti Dipanggang</span>
                <p className="text-2xl font-black mt-0.5">{scheduleData.totalBreadPieces} <span className="text-xs font-normal text-indigo-200">pcs</span></p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <ChefHat className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 rounded-2xl shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Pesanan Masuk</span>
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{scheduleData.totalOrders} <span className="text-xs font-normal text-gray-400">pesanan</span></p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 rounded-2xl shadow-xs flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Target Produksi</span>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 truncate">
                  {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 flex-shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Printable Kitchen Sheet */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 print:border-none print:shadow-none print:p-0">
            {/* Print Only Header */}
            <div className="hidden print:block border-b pb-3 mb-3">
              <h1 className="text-xl font-black uppercase tracking-tight">Family Bakery — Lembar Kerja Jadwal Dapur</h1>
              <p className="text-xs text-gray-600">
                Tanggal Produksi: <strong>{selectedDate}</strong> | Dicetak pada: {new Date().toLocaleString('id-ID')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="font-heading font-bold text-gray-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Daftar Akumulasi Roti untuk Dipanggang
              </h3>
              <span className="text-xs text-gray-400 print:hidden">Centang untuk menandai roti yang sudah siap</span>
            </div>

            {scheduleData.scheduleList.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
                <ChefHat className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-semibold text-sm">Tidak ada jadwal produksi roti pada tanggal {selectedDate}</p>
                <p className="text-xs mt-0.5">Semua pesanan untuk tanggal ini kosong atau sudah selesai.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {scheduleData.scheduleList.map((item: any) => {
                  const isDone = !!checkedItems[item.productId]
                  return (
                    <div
                      key={item.productId}
                      onClick={() => toggleCheck(item.productId)}
                      className={`cursor-pointer p-4 rounded-xl border transition-all flex items-center justify-between ${
                        isDone
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-gray-400 dark:text-gray-500 line-through'
                          : 'bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 text-gray-900 dark:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                          {isDone ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{item.name}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Untuk {item.ordersCount} pesanan
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                          {item.totalQuantity}
                        </span>
                        <span className="text-xs font-semibold ml-1">pcs</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Orders Details for this date */}
            {scheduleData.orders.length > 0 && (
              <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Rincian Pemesan pada Tanggal Ini:
                </h4>
                <div className="space-y-2">
                  {scheduleData.orders.map((o: any) => (
                    <div
                      key={o.id}
                      className="p-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{o.orderNo}</span>
                          <span className="font-bold text-gray-900 dark:text-white">{o.customerName}</span>
                          <span className="text-gray-400">({o.phone})</span>
                          <span className="text-[11px] text-primary-600">[{o.store?.name}]</span>
                        </div>
                        {o.notes && (
                          <p className="text-amber-700 dark:text-amber-400 italic mt-0.5 font-medium">
                            Catatan: &ldquo;{o.notes}&rdquo;
                          </p>
                        )}
                        <p className="text-gray-500 mt-1">
                          Item: {o.items.map((i: any) => `${i.product.name} (${i.quantity}x)`).join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CustomStatusDropdown
                          value={o.status}
                          orderId={o.id}
                          onChange={handleStatusChange}
                          disabled={isPending}
                          size="sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: ORDERS LEDGER (DAFTAR SEMUA PESANAN) ─────────────── */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nomor order, nama, no HP..."
                value={searchOrder}
                onChange={(e) => setSearchOrder(e.target.value)}
                className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-indigo-500 shadow-xs"
              />
              {searchOrder && (
                <button
                  type="button"
                  onClick={() => setSearchOrder('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <CustomDropdown
                options={[
                  { value: 'ALL', label: 'Semua Status' },
                  { value: 'PENDING', label: 'Menunggu', dotColor: 'bg-amber-500' },
                  { value: 'IN_PROCESS', label: 'Diproses Dapur', dotColor: 'bg-blue-500 animate-pulse' },
                  { value: 'READY', label: 'Siap Diambil', dotColor: 'bg-purple-500' },
                  { value: 'COMPLETED', label: 'Selesai', dotColor: 'bg-emerald-500' },
                  { value: 'CANCELLED', label: 'Dibatalkan', dotColor: 'bg-rose-500' }
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                icon={<Filter className="w-3.5 h-3.5" />}
                size="md"
                align="right"
                className="w-full sm:w-auto flex-1 sm:flex-none"
              />
            </div>
          </div>

          {/* Orders Container: Cards on Mobile, Table on Desktop */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
            {/* Mobile Order Cards List (Visible on < md) */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {filteredOrders.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs px-4">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold">Tidak ada data pesanan</p>
                  <p className="text-[11px] mt-0.5">Coba ubah kata kunci pencarian atau status filter.</p>
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const pickupStr = new Date(order.pickupDate).toLocaleDateString('id-ID', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })
                  const remaining = Math.max(0, order.totalAmount - order.depositPaid)

                  return (
                    <div key={order.id} className="p-4 space-y-3">
                      {/* Card Top: Order No + Branch + Status Selector */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-xs text-gray-900 dark:text-white">
                            {order.orderNo}
                          </span>
                          <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md font-semibold">
                            {order.store?.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <CustomStatusDropdown
                            value={order.status}
                            orderId={order.id}
                            onChange={handleStatusChange}
                            disabled={isPending}
                            size="sm"
                          />

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDelete(order.id, order.orderNo)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Hapus pesanan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Customer & Target Date */}
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-sm">{order.customerName}</p>
                          <a 
                            href={`tel:${order.phone}`} 
                            className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 mt-0.5 hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            {order.phone}
                          </a>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block font-medium">Target Ambil:</span>
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1 justify-end mt-0.5">
                            <Calendar className="w-3 h-3 text-indigo-500" />
                            {pickupStr}
                          </span>
                        </div>
                      </div>

                      {/* Notes if any */}
                      {order.notes && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl px-2.5 py-1.5 text-[11px] text-amber-800 dark:text-amber-300">
                          <span className="font-semibold">Catatan: </span>&ldquo;{order.notes}&rdquo;
                        </div>
                      )}

                      {/* Items Ordered Chips */}
                      <div className="bg-gray-50/80 dark:bg-gray-800/40 rounded-xl p-2.5 text-xs space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          Rincian Roti:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {order.items?.map((item: any, i: number) => (
                            <span 
                              key={i} 
                              className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 px-2 py-1 rounded-lg text-[11px] font-medium text-gray-700 dark:text-gray-300 shadow-2xs"
                            >
                              {item.product?.name}
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">×{item.quantity}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Financial Footer */}
                      <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800/60 text-xs">
                        <div>
                          <span className="text-[10px] text-gray-400 block">Total Tagihan</span>
                          <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                            {formatFullRupiah(order.totalAmount)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                            DP: {formatFullRupiah(order.depositPaid)}
                          </span>
                          {remaining > 0 ? (
                            <span className="text-[10px] text-rose-500 font-bold block">
                              Sisa: {formatFullRupiah(remaining)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                              Lunas
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Desktop Orders Table (Visible on >= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 text-gray-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">No. Order</th>
                    <th className="py-3 px-4">Pelanggan</th>
                    <th className="py-3 px-4">Target Diambil</th>
                    <th className="py-3 px-4">Cabang</th>
                    <th className="py-3 px-4">Rincian Roti</th>
                    <th className="py-3 px-4 text-right">Biaya / DP</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    {isAdmin && <th className="py-3 px-4 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        Tidak ada data pesanan yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const pickupStr = new Date(order.pickupDate).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                      const remaining = Math.max(0, order.totalAmount - order.depositPaid)

                      return (
                        <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-900 dark:text-white">
                            {order.orderNo}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-gray-900 dark:text-white">{order.customerName}</p>
                            <p className="text-[11px] text-gray-400">{order.phone}</p>
                            {order.notes && (
                              <p className="text-[10px] text-amber-700 dark:text-amber-400 italic">
                                &ldquo;{order.notes}&rdquo;
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-gray-700 dark:text-gray-300">
                            {pickupStr}
                          </td>
                          <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400">
                            {order.store?.name}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5 max-w-xs">
                              {order.items?.map((item: any, i: number) => (
                                <p key={i} className="text-gray-700 dark:text-gray-300">
                                  {item.product?.name}: <span className="font-bold">{item.quantity} pcs</span>
                                </p>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <p className="font-extrabold text-gray-900 dark:text-white">{formatFullRupiah(order.totalAmount)}</p>
                            <p className="text-[11px] text-emerald-600">DP: {formatFullRupiah(order.depositPaid)}</p>
                            {remaining > 0 && (
                              <p className="text-[10px] text-rose-500 font-semibold">Sisa: {formatFullRupiah(remaining)}</p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <CustomStatusDropdown
                              value={order.status}
                              orderId={order.id}
                              onChange={handleStatusChange}
                              disabled={isPending}
                              size="md"
                            />
                          </td>
                          {isAdmin && (
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleDelete(order.id, order.orderNo)}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title="Hapus pesanan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
