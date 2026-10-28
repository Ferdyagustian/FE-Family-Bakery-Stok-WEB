import prisma from '@/lib/db'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { ClipboardList, User, Calendar, Tag } from 'lucide-react'
import { AUDIT_ACTION_LABELS, getAuditActionColor } from '@/lib/audit'
import { ClearLogsButton } from '@/components/ClearLogsButton'
import { AuditFilterBar } from '@/components/AuditFilterBar'

export const revalidate = 0 // Selalu fresh — ini halaman log real-time

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string; storeId?: string; startDate?: string; endDate?: string }>
}) {
  // Hanya ADMIN yang boleh akses
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/')
  }

  const params = await searchParams
  const currentPage = Math.max(1, parseInt(params.page ?? '1'))
  const perPage = 50
  const skip = (currentPage - 1) * perPage

  // Build filter
  const where: any = {}
  if (params.action) where.action = params.action
  if (params.storeId) where.storeId = params.storeId
  if (params.startDate || params.endDate) {
    where.createdAt = {}
    if (params.startDate) where.createdAt.gte = new Date(params.startDate)
    if (params.endDate) where.createdAt.lte = new Date(params.endDate)
  }

  // Ambil data paralel
  const [logs, total, stores] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.auditLog.count({ where }),
    prisma.store.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  const totalPages = Math.ceil(total / perPage)
  const allActions = Object.keys(AUDIT_ACTION_LABELS) as (keyof typeof AUDIT_ACTION_LABELS)[]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-indigo-600" />
              Riwayat Aktivitas
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Semua aktivitas pengguna tercatat secara otomatis di sini.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400 dark:text-gray-500">
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-200">{total.toLocaleString('id-ID')}</span> total log
            </div>
            <ClearLogsButton />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <AuditFilterBar
        allActions={allActions}
        actionLabels={AUDIT_ACTION_LABELS}
        stores={stores}
        defaultAction={params.action ?? ''}
        defaultStoreId={params.storeId ?? ''}
        defaultStartDate={params.startDate ?? ''}
        defaultEndDate={params.endDate ?? ''}
      />

      {/* Log Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {logs.length === 0 ? (
          <div className="py-20 text-center text-gray-400 dark:text-gray-500">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-gray-500 dark:text-gray-400">Belum ada aktivitas tercatat</p>
            <p className="text-sm mt-1">Log akan muncul setelah ada aktivitas seperti login, tambah produk, dll.</p>
          </div>
        ) : (
          <>
            {/* Table Header (desktop) */}
            <div className="hidden sm:grid grid-cols-[1fr_1.5fr_1fr_1.5fr_1fr] gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <span>Waktu</span>
              <span>Pengguna</span>
              <span>Aktivitas</span>
              <span>Data</span>
              <span>Cabang</span>
            </div>

            {/* Log Rows */}
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {logs.map((log: any) => {
                const actionLabel = (AUDIT_ACTION_LABELS as any)[log.action] ?? log.action
                const colorClass = getAuditActionColor(log.action)
                const storeName = stores.find((s: any) => s.id === log.storeId)?.name

                let detailText = ''
                if (log.detail) {
                  try {
                    const d = JSON.parse(log.detail)
                    if (d.quantity !== undefined) detailText = `${d.quantity} unit`
                    else if (d.price !== undefined) detailText = `Rp ${d.price?.toLocaleString('id-ID')}`
                    else if (d.count !== undefined) detailText = `${d.count} item`
                    else if (d.items) detailText = `${d.items.length} produk`
                  } catch {
                    detailText = ''
                  }
                }

                return (
                  <div
                    key={log.id}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_1fr_1.5fr_1fr] gap-2 sm:gap-4 px-5 py-3.5 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {/* Waktu */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>
                        {new Date(log.createdAt).toLocaleString('id-ID', {
                          timeZone: 'Asia/Jakarta',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Pengguna */}
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                        {log.username ?? <span className="text-gray-400 italic">Sistem</span>}
                      </span>
                    </div>

                    {/* Badge Aktivitas */}
                    <div>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
                        {actionLabel}
                      </span>
                    </div>

                    {/* Data */}
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 flex-shrink-0 text-gray-300 dark:text-gray-600" />
                      <div className="min-w-0">
                        {log.entityName && (
                          <p className="text-sm text-gray-800 dark:text-gray-100 font-medium truncate">
                            {log.entityName}
                          </p>
                        )}
                        {detailText && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">{detailText}</p>
                        )}
                      </div>
                    </div>

                    {/* Cabang */}
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {storeName ?? <span className="text-gray-300 dark:text-gray-600 italic text-xs">—</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Halaman {currentPage} dari {totalPages} &nbsp;·&nbsp;
                  {total.toLocaleString('id-ID')} total entri
                </p>
                <div className="flex gap-2">
                  {currentPage > 1 && (
                    <a
                      href={`/audit?${new URLSearchParams({ ...params, page: String(currentPage - 1) })}`}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      ← Sebelumnya
                    </a>
                  )}
                  {currentPage < totalPages && (
                    <a
                      href={`/audit?${new URLSearchParams({ ...params, page: String(currentPage + 1) })}`}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Berikutnya →
                    </a>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
