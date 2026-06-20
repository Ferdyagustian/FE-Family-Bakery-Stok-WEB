import { redirect } from 'next/navigation'
import { getSession, getSessionToken } from '@/lib/session'
import prisma from '@/lib/db'
import ForecastClient from './ForecastClient'
import { ENV } from '@/lib/env'

export const metadata = {
  title: 'Prediksi AI | Family Bakery',
  description: 'Gunakan AI untuk memprediksi penjualan masa depan',
}

export default async function ForecastPage() {
  const session = await getSession()
  const token = await getSessionToken()
  
  // Guard: Only ADMIN can access this page
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/')
  }

  // Fetch all stores and products for the select dropdowns
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {/* Header with Taste-Skill constraint: Left-aligned, tight max-width for readability */}
      <div className="max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tighter text-gray-900 dark:text-white mb-3">
          Prediksi AI
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed max-w-[65ch]">
          Gunakan model TimesFM untuk menganalisis data historis dan memprediksi penjualan produk di setiap cabang pada 7 hari ke depan.
        </p>
      </div>

      <ForecastClient stores={stores} products={products} apiBase={ENV.API_BASE} token={token || ""} />
    </div>
  )
}
