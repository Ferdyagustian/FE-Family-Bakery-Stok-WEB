import React, { Suspense } from 'react'
import prisma from '@/lib/db'
import { SalesChart } from '@/components/SalesChart'
import { ProductSalesBreakdown } from '@/components/ProductSalesBreakdown'
import { Store, Package, TrendingUp, CircleDollarSign, Boxes } from 'lucide-react'

// Bukan force-dynamic agar bisa di-cache, tapi revalidate tiap 60 detik
export const revalidate = 60

async function DashboardData() {
  // Batas 30 hari terakhir — hindari tarik semua data
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [stores, productCount, stockAgg, salesAgg, sales] = await Promise.all([
    // Hanya ambil data yang dibutuhkan
    prisma.store.findMany({ select: { id: true, name: true } }),

    // Hitung varian menu unik (berdasarkan nama yang berbeda)
    prisma.product.findMany({
      distinct: ['name'],
      select: { name: true },
    }),

    // Hitung total fisik barang di seluruh cabang
    prisma.storeProduct.aggregate({
      _sum: { stockQuantity: true }
    }),

    // Agregasi total di level DB — JAUH lebih efisien
    prisma.sale.aggregate({
      _sum: { totalAmount: true, profitAmount: true },
      _count: { id: true },
    }),

    // Ambil data 30 hari terakhir saja untuk grafik, dengan select minimal
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
      take: 1000, // Batas aman
    }),
  ])

  const totalRevenue = salesAgg._sum.totalAmount ?? 0
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
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6">
        <StatCard
          title="Total Cabang"
          value={stores.length}
          icon={<Store className="w-6 h-6 sm:w-7 sm:h-7 text-primary-600" />}
          bg="bg-primary-50 dark:bg-primary-950/20"
        />
        <StatCard
          title="Total Varian Menu"
          value={productCount.length}
          icon={<Package className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />}
          bg="bg-purple-50 dark:bg-purple-950/20"
        />
        <StatCard
          title="Total Stok Fisik"
          value={totalStock.toLocaleString('id-ID')}
          icon={<Boxes className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />}
          bg="bg-blue-50 dark:bg-blue-950/20"
        />
        <StatCard
          title="Total Transaksi"
          value={totalSales.toLocaleString('id-ID')}
          icon={<TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />}
          bg="bg-green-50 dark:bg-green-950/20"
        />
        <StatCard
          title="Total Omzet"
          value={`Rp ${
            totalRevenue >= 1000000
              ? (totalRevenue / 1000000).toFixed(1) + 'jt'
              : totalRevenue.toLocaleString('id-ID')
          }`}
          icon={<CircleDollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-600" />}
          bg="bg-yellow-50 dark:bg-yellow-950/20"
        />
      </div>

      {/* Product Breakdown */}
      <ProductSalesBreakdown data={productSales} stores={stores} />

      {/* Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6">
        {stores.length > 0 ? (
          <SalesChart data={formattedSales} stores={stores} productSales={productSales} />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <TrendingUp className="w-14 h-14 mb-4 opacity-30" />
            <h3 className="text-lg font-heading font-semibold text-gray-600 dark:text-gray-300">
              Belum Ada Data Penjualan
            </h3>
            <p className="text-sm mt-1 text-center max-w-xs">
              Tambahkan cabang toko dan catat penjualan untuk melihat grafik di sini.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-gray-900 dark:text-white">
          Selamat Datang, Admin!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Ringkasan Kinerja Family Bakery — 30 hari terakhir.
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData />
      </Suspense>
    </div>
  )
}

// ── Skeleton Loading ───────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 sm:p-5">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl mb-3" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 sm:p-6 h-72" />
    </div>
  )
}

// ── StatCard ───────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  icon,
  bg,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  bg: string
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 sm:p-5 hover:-translate-y-0.5 transition-transform">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${bg} rounded-xl flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium truncate">{title}</p>
      <p className="text-lg sm:text-2xl font-bold font-heading text-gray-900 dark:text-white mt-1 truncate">
        {value}
      </p>
    </div>
  )
}
