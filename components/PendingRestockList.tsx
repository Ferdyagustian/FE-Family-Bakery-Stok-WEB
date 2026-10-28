'use client'

import { useState, useTransition } from 'react'
import { approveRestockBatch, rejectRestockBatch } from '@/lib/actions/product'
import { CheckCircle2, Clock, Store, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

interface PendingBatch {
  batchNo: string
  store: { id: string; name: string; location: string | null }
  requestedBy: string
  notes: string | null
  createdAt: Date | string
  items: { product: any; quantity: number }[]
  totalUnits: number
}

export function PendingRestockList({ 
  batches, 
  isAdmin = true 
}: { 
  batches: PendingBatch[]
  isAdmin?: boolean 
}) {
  const [isPending, startTransition] = useTransition()
  const [activeBatch, setActiveBatch] = useState<string | null>(null)
  const [expandedBatch, setExpandedBatch] = useState<string | null>(batches.length > 0 ? batches[0].batchNo : null)

  if (!batches || batches.length === 0) {
    return null
  }

  const handleApprove = (batchNo: string) => {
    setActiveBatch(batchNo)
    startTransition(async () => {
      const res = await approveRestockBatch(batchNo)
      setActiveBatch(null)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success(`Restok Batch ${batchNo} berhasil disetujui! Stok cabang telah diperbarui.`)
      }
    })
  }

  const handleReject = (batchNo: string) => {
    const reason = prompt('Masukkan alasan penolakan (opsional):')
    if (reason === null) return // Batal

    setActiveBatch(batchNo)
    startTransition(async () => {
      const res = await rejectRestockBatch(batchNo, reason || undefined)
      setActiveBatch(null)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.info(`Permintaan restok Batch ${batchNo} telah ditolak.`)
      }
    })
  }

  return (
    <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
              {isAdmin ? 'Antrean Permintaan Restok Cabang' : 'Status Pengajuan Restok Cabang'}
              <span className="text-xs bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full font-extrabold">
                {batches.length} Batch Menunggu
              </span>
            </h2>
            <p className="text-xs text-amber-800 dark:text-amber-400/80">
              {isAdmin 
                ? 'Cabang mengajukan restok roti. Setujui untuk otomatis menambahkan kuantitas stok fisik ke cabang terkait.'
                : 'Permintaan restok Anda sedang menunggu persetujuan dari Super Admin. Stok akan otomatis bertambah setelah disetujui.'}
            </p>
          </div>
        </div>
      </div>

      {/* Batches List */}
      <div className="space-y-3">
        {batches.map((batch) => {
          const isExpanded = expandedBatch === batch.batchNo
          const isCurrentLoading = isPending && activeBatch === batch.batchNo
          const dateStr = new Date(batch.createdAt).toLocaleString('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short'
          })

          return (
            <div
              key={batch.batchNo}
              className="bg-white dark:bg-gray-900 border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-4 shadow-xs transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200">
                      {batch.batchNo}
                    </span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-primary-600" />
                      {batch.store.name}
                    </span>
                    <span className="text-xs text-gray-400">• Diajukan oleh: <strong className="text-gray-700 dark:text-gray-300">{batch.requestedBy}</strong></span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Waktu: {dateStr} | Total: <strong className="text-indigo-600 dark:text-indigo-400">{batch.items.length} varian (+{batch.totalUnits} unit)</strong>
                  </p>
                  {batch.notes && (
                    <p className="text-xs italic text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-2.5 py-1 rounded-md">
                      Catatan: &ldquo;{batch.notes}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setExpandedBatch(isExpanded ? null : batch.batchNo)}
                    className="p-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    title={isExpanded ? 'Tutup rincian' : 'Lihat rincian produk'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isAdmin ? (
                    <>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleReject(batch.batchNo)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-50"
                      >
                        Tolak
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleApprove(batch.batchNo)}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isCurrentLoading ? 'Memproses...' : 'Setujui Restok'}
                      </button>
                    </>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/60">
                      <Clock className="w-3.5 h-3.5 animate-pulse" />
                      Menunggu Persetujuan Super Admin
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Item Details */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Rincian Roti yang Diminta:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {batch.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 text-xs"
                      >
                        <span className="font-medium text-gray-800 dark:text-gray-200 truncate pr-2">
                          {item.product?.name || 'Produk'}
                        </span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200/60">
                          +{item.quantity} pcs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
