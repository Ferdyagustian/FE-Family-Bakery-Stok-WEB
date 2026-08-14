import prisma from '@/lib/db'
import { ExportPanel } from '@/components/ExportPanel'
import { getSession } from '@/lib/session'
import { FileSpreadsheet, ShieldCheck, Store } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const session = await getSession()
  const user = session?.user
  const isManager = user?.role === 'MANAGER'

  let stores: { id: string; name: string }[] = []

  if (isManager && user?.storeId) {
    stores = await prisma.store.findMany({
      where: { id: user.storeId },
      select: { id: true, name: true },
    })
  } else {
    stores = await prisma.store.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })
  }

  const activeStoreName = isManager && stores.length > 0 ? stores[0].name : 'Seluruh Cabang'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-800 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                Laporan &amp; Riwayat Penjualan
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                {isManager ? <Store className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                {isManager ? `Cabang: ${activeStoreName}` : 'Akses Admin (Semua Cabang)'}
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
              {isManager
                ? `Memantau rekap penjualan, omzet harian, dan ekspor data untuk ${activeStoreName}.`
                : 'Pantau rekap transaksi seluruh cabang, analisis profitabilitas, dan ekspor data ke Excel.'}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Report & Export Panel */}
      <ExportPanel 
        stores={stores} 
        userRole={user?.role || 'ADMIN'} 
        userStoreId={user?.storeId || ''} 
      />
    </div>
  )
}
