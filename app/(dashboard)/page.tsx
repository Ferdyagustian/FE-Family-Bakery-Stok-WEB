import React, { Suspense } from 'react'
import prisma from '@/lib/db'
import { SalesChart } from '@/components/SalesChart'
import { ProductSalesBreakdown } from '@/components/ProductSalesBreakdown'
import { Store, Package, TrendingUp, CircleDollarSign, Boxes } from 'lucide-react'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { formatCompactRupiah, formatFullRupiah } from '@/lib/format'

export const revalidate = 60

async function DashboardData() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [stores, productCount, stockAgg, salesAgg, sales] = await Promise.all([
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
  ])

  const totalRevenue = salesAgg._sum.totalAmount ?? 0
  const totalProfit = salesAgg._sum.profitAmount ?? 0
  const totalSales = salesAgg._count.id
  const totalStock = stockAgg._sum.stockQuantity ?? 0

  const formattedSales = sales.map((s: any) => ({
    date: s.saleDate.toISOString(),
    revenue: s.totalAmount,
    profit: s.profitAmount,
    store: s.storeId,
  }))

  const productSales = sales.map((s: any) => ({
    productId: s.productId,
    productName: s.product.name,
    storeId: s.storeId,
    storeName: s.store.name,
    quantitySold: s.quantitySold,
    totalAmount: s.totalAmount,
    profitAmount: s.profitAmount,
    date: s.saleDate.toISOString(),
  }))

  return (
    <>
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-5">
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
              Margin: {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>

        {/* 2. Total Transaksi */}
        <StatCard
          title="Total Transaksi"
          value={totalSales.toLocaleString('id-ID')}
          subtitle="30 hari terakhir"
          icon={<TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          badge="Aktif"
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
