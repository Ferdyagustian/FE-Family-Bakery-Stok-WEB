import { redirect } from 'next/navigation'
import { getSession, getSessionToken } from '@/lib/session'
import prisma from '@/lib/db'
import ForecastClient from './ForecastClient'
import { Sparkles } from 'lucide-react'

export const metadata = {
  title: 'Prediksi AI | Family Bakery',
  description: 'Prediksi permintaan dan penjualan produk 7 hari ke depan',
}

export default async function ForecastPage() {
  const session = await getSession()
  const token = await getSessionToken()
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/')
  }

  const [stores, products] = await Promise.all([
    prisma.store.findMany({
      select: { id: true, name: true, location: true },
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
  ])

  return (
    <div className="space-y-6">
      {/* Modern Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-gray-900 dark:text-white tracking-tight">
              Prediksi Penjualan AI
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              TimesFM Engine
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
            Analisis deret waktu penjualan historis untuk memperkirakan kebutuhan produksi 7 hari ke depan per cabang.
          </p>
        </div>
      </div>

      <ForecastClient stores={stores} products={products} token={token || ""} />
    </div>
  )
}
