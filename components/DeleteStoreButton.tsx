'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle, X } from 'lucide-react'
import { deleteStore } from '@/lib/actions/store'
import { toast } from 'sonner'

export function DeleteStoreButton({ storeId, storeName }: { storeId: string, storeName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (confirmText !== 'pastikan') return
    
    setLoading(true)
    const res = await deleteStore(storeId)
    setLoading(false)

    if (res?.error) {
      toast.error(res.error)
    } else {
      setIsOpen(false)
      toast.success('Cabang berhasil dihapus')
      router.push('/stores')
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 transition-colors text-sm font-semibold shadow-sm"
      >
        <Trash2 className="w-4 h-4" />
        Hapus Cabang
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">Hapus Cabang</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 space-y-4">
              <div className="bg-red-50 p-4 rounded-xl text-sm text-red-800 border border-red-100">
                <p className="font-semibold mb-1">Peringatan Keras:</p>
                <p>
                  Menghapus cabang <strong>{storeName}</strong> juga akan <strong>menghapus seluruh data stok produk dan riwayat penjualan</strong> yang ada di dalamnya.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Untuk melanjutkan, ketik <span className="font-bold text-red-600 select-all">pastikan</span> di bawah ini:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Ketik pastikan..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all placeholder:text-gray-400 dark:text-gray-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
                disabled={loading}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== 'pastikan' || loading}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {loading ? 'Menghapus...' : 'Ya, Hapus Cabang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
