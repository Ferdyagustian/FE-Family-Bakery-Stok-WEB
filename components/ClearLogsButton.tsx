'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { clearAuditLogs } from '@/lib/actions/audit'

export function ClearLogsButton() {
  const [isPending, setIsPending] = useState(false)

  const handleClear = async (days: number) => {
    const label = days === 0 ? 'semua log' : `log yang lebih lama dari ${days} hari`
    if (!confirm(`Peringatan: Apakah Anda yakin ingin menghapus ${label}? Tindakan ini tidak dapat dibatalkan.`)) return

    setIsPending(true)
    const res = await clearAuditLogs(days)
    if (res?.error) {
      alert(res.error)
    } else {
      alert(`Berhasil menghapus ${res?.count} log.`)
    }
    setIsPending(false)
  }

  return (
    <div className="relative group inline-block">
      <button 
        disabled={isPending}
        className="h-9 px-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-semibold flex items-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
      >
        <Trash2 className="w-4 h-4" />
        {isPending ? 'Menghapus...' : 'Bersihkan Log'}
      </button>

      {/* Dropdown Menu */}
      <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg shadow-black/5 border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden">
        <button onClick={() => handleClear(30)} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Lebih dari 30 hari
        </button>
        <button onClick={() => handleClear(90)} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Lebih dari 90 hari
        </button>
        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
        <button onClick={() => handleClear(0)} className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          Hapus Semua Log
        </button>
      </div>
    </div>
  )
}
