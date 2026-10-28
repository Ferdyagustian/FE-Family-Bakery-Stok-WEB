import React, { Suspense } from 'react'
import dynamic from 'next/dynamic'
import prisma from '@/lib/db'

const SalesChart = dynamic(
  () => import('@/components/SalesChart').then((m) => m.SalesChart),
  {
    loading: () => (
      <div className="h-72 w-full animate-pulse bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800" />
    ),
    ssr: false,
  }
)

const ProductSalesBreakdown = dynamic(
  () => import('@/components/ProductSalesBreakdown').then((m) => m.ProductSalesBreakdown),
  {
    loading: () => (
      <div className="h-96 w-full animate-pulse bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800" />
    ),
    ssr: false,
  }
)
import { Store, Package, TrendingUp, CircleDollarSign, Boxes, PackageMinus } from 'lucide-react'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { formatCompactRupiah, formatFullRupiah } from '@/lib/format'
import { getPendingRestockBatches } from '@/lib/actions/product'
import { PendingRestockList } from '@/components/PendingRestockList'

export const revalidate = 60

async function DashboardData() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [stores, productCount, stockAgg, salesAgg, ordersAgg, sales, completedOrders, returnsAgg] = await Promise.all([
    prisma.store.findMany({ select: { id: true, name: true } }),
    prisma.product.findMany({
      distinct: ['name'],
      select: { name: true },
    }),
    prisma.storeProduct.aggregate({
      _sum: { stockQuantity: true }
    }),
    prisma.sale.aggregate({
      _sum: { totalAmount: true, profitAmount: true },
      _count: { id: true },
    }),
    prisma.customOrder.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.sale.findMany({
      where: { saleDate: { gte: thirtyDaysAgo } },
      select: {
        storeId: true,
        productId: true,
        saleDate: true,
        totalAmount: true,
        profitAmount: true,
        quantitySold: true,
        store: { select: { name: true } },
        product: { select: { name: true } },
      },
      orderBy: { saleDate: 'asc' },
    }),
    prisma.customOrder.findMany({
      where: {
        status: 'COMPLETED',
        pickupDate: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        storeId: true,
        pickupDate: true,
        totalAmount: true,
        store: { select: { name: true } },
        items: {
          select: {
            productId: true,
            quantity: true,
            price: true,
            product: { select: { name: true } }
          }
        }
      },
      orderBy: { pickupDate: 'asc' },
    }),
    prisma.productReturn.aggregate({
      where: { returnDate: { gte: thirtyDaysAgo } },
      _sum: { quantity: true },
    })
  ])

  const totalReturns = returnsAgg._sum.quantity ?? 0

  const completedOrderRevenue = ordersAgg._sum.totalAmount ?? 0
  const completedOrdersCount = ordersAgg._count.id ?? 0
  const completedOrderProfit = Math.round(completedOrderRevenue * 0.28) // Estimasi margin laba kotor 28%

  const totalRevenue = (salesAgg._sum.totalAmount ?? 0) + completedOrderRevenue
  const totalProfit = (salesAgg._sum.profitAmount ?? 0) + completedOrderProfit
  const totalSales = salesAgg._count.id
  const totalTransactionsCount = totalSales + completedOrdersCount
  const totalStock = stockAgg._sum.stockQuantity ?? 0

  // 1. Gabungkan data deret waktu untuk grafik tren penjualan
  const posFormattedSales = sales.map((s: any) => ({
    date: s.saleDate.toISOString(),
    revenue: s.totalAmount,
    profit: s.profitAmount,
    store: s.storeId,
  }))

  const ordersFormattedSales = completedOrders.map((o: any) => ({
    date: o.pickupDate.toISOString(),
    revenue: o.totalAmount,
    profit: Math.round(o.totalAmount * 0.28),
    store: o.storeId,
  }))

  const formattedSales = [...posFormattedSales, ...ordersFormattedSales].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // 2. Gabungkan data rincian produk (POS Kasir + Pre-Order Selesai)
  const posProductSales = sales.map((s: any) => ({
    productId: s.productId,
    productName: s.product.name,
    storeId: s.storeId,
    storeName: s.store.name,
    quantitySold: s.quantitySold,
    totalAmount: s.totalAmount,
    profitAmount: s.profitAmount,
    date: s.saleDate.toISOString(),
  }))

  const orderProductSales: typeof posProductSales = []
  completedOrders.forEach((o: any) => {
    o.items?.forEach((item: any) => {
      const itemSubtotal = item.price * item.quantity
      orderProductSales.push({
        productId: item.productId,
        productName: item.product.name,
        storeId: o.storeId,
        storeName: o.store?.name || 'Cabang',
        quantitySold: item.quantity,
        totalAmount: itemSubtotal,
        profitAmount: Math.round(itemSubtotal * 0.28),
        date: o.pickupDate.toISOString(),
      })
    })
  })

  const productSales = [...posProductSales, ...orderProductSales]

  return (
    <>
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-5">
        {/* 1. Total Omzet */}
        <div className="col-span-2 sm:col-span-1 lg:col-span-1 bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-600 dark:to-indigo-800 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-indigo-200">Total Omzet</span>
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <CircleDollarSign className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3 z-10">
            <p 
              className="text-xl sm:text-2xl font-extrabold tracking-tight cursor-default"
              title={formatFullRupiah(totalRevenue)}
            >
              {formatCompactRupiah(totalRevenue, false)}
            </p>
            <p className="text-[11px] text-indigo-200 mt-0.5">
              Margin: {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}% • Kasir &amp; Pre-Order
            </p>
          </div>
        </div>

        {/* 2. Total Transaksi */}
        <StatCard
          title="Total Transaksi"
          value={totalTransactionsCount.toLocaleString('id-ID')}
          subtitle={`${totalSales.toLocaleString('id-ID')} kasir + ${completedOrdersCount} pesanan`}
          icon={<TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          badge="Gabungan"
        />

        {/* 3. Cabang Aktif */}
        <StatCard
          title="Cabang Operasional"
          value={`${stores.length} Cabang`}
          subtitle="Terhubung terpusat"
          icon={<Store className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
          badge="Live"
        />

        {/* 4. Total Varian Menu */}
        <StatCard
          title="Varian Master Menu"
          value={`${productCount.length} Menu`}
          subtitle="Katalog aktif"
          icon={<Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
        />

        {/* 5. Total Stok Fisik */}
        <StatCard
          title="Total Stok Fisik"
          value={`${totalStock.toLocaleString('id-ID')} Pcs`}
          subtitle="Inventaris cabang"
          icon={<Boxes className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
        />

        {/* 6. Total Barang Retur */}
        <StatCard
          title="Barang Retur (30 Hari)"
          value={`${totalReturns.toLocaleString('id-ID')} Pcs`}
          subtitle="Roti sisa & rusak"
          icon={<PackageMinus className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
          badge={totalReturns > 0 ? "Waste" : "Nol"}
        />
      </div>

      {/* Product Breakdown */}
      <ProductSalesBreakdown data={productSales} stores={stores} />

      {/* Sales Trend Chart */}
      <div className="w-full">
        {stores.length > 0 ? (
          <SalesChart data={formattedSales} stores={stores} productSales={productSales} />
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center text-gray-400">
            <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
            <h3 className="text-base font-bold text-gray-700 dark:text-gray-300">Belum Ada Data Penjualan</h3>
            <p className="text-xs text-gray-500 max-w-xs mt-1">
              Catat penjualan pada menu kasir cabang untuk memunculkan tren grafik.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

export default async function DashboardPage() {
  const session = await getSession()
  if (session?.user?.role === 'MANAGER') {
    if (session.user.storeId) {
      redirect(`/stores/${session.user.storeId}`)
    } else {
      return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-heading text-gray-900 dark:text-white mb-2">Akun Tidak Terhubung ke Cabang</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md">
            Akun Anda saat ini tidak memiliki akses ke cabang manapun. Silakan hubungi Admin Utama.
          </p>
        </div>
      )
    }
  }

  const pendingBatches = await getPendingRestockBatches()

  return (
    <div className="space-y-6">
      {/* Modern Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-gray-900 dark:text-white tracking-tight">
            Dashboard Performa
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-0.5">
            Ringkasan kinerja penjualan dan inventaris Family Bakery — 30 hari terakhir.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Live Sync Database
          </span>
        </div>
      </div>

      {/* Pending Restock Requests from Branch Stores */}
      {pendingBatches.length > 0 && (
        <PendingRestockList batches={pendingBatches} isAdmin={true} />
      )}

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData />
      </Suspense>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800/50 rounded-2xl" />
        ))}
      </div>
      <div className="h-80 bg-gray-100 dark:bg-gray-800/50 rounded-2xl" />
      <div className="h-80 bg-gray-100 dark:bg-gray-800/50 rounded-2xl" />
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  badge,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  badge?: string
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 sm:p-5 flex flex-col justify-between hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
          {title}
        </span>
        <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-baseline gap-2">
          <p className="text-lg sm:text-xl font-bold font-heading text-gray-900 dark:text-white tracking-tight">
            {value}
          </p>
          {badge && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
