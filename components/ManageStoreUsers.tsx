'use client'

import { useState } from 'react'
import { createManager, deleteManager } from '@/lib/actions/user'
import { Users, UserPlus, Trash2, Key } from 'lucide-react'
import { toast } from 'sonner'

export function ManageStoreUsers({ storeId, users }: { storeId: string, users: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.append('storeId', storeId)
    
    const res = await createManager(formData)
    setLoading(false)
    if (res?.error) {
      toast.error(res.error)
    } else {
      setIsOpen(false)
      toast.success('Akun kasir berhasil ditambahkan')
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Yakin ingin menghapus akun kasir ini?')) {
      await deleteManager(id, storeId)
      toast.success('Akun kasir berhasil dihapus')
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-600" />
          <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">Akun Kasir Cabang</h2>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-sm font-semibold hover:bg-primary-100 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Tambah Kasir
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nama Lengkap</label>
              <input name="name" required className="w-full h-10 rounded-lg border px-3 text-sm" placeholder="Nama Kasir" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Username</label>
              <input name="username" required className="w-full h-10 rounded-lg border px-3 text-sm" placeholder="Username untuk login" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</label>
              <input name="password" required type="password" className="w-full h-10 rounded-lg border px-3 text-sm" placeholder="Password minimal 6 karakter" />
            </div>
          </div>
          <div className="flex justify-end">
            <button disabled={loading} type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              {loading ? 'Menyimpan...' : 'Simpan Akun'}
            </button>
          </div>
        </form>
      )}

      {users.length === 0 ? (
        <p className="text-sm text-gray-500">Belum ada akun kasir untuk cabang ini.</p>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <Key className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{u.name}</p>
                  <p className="text-xs text-gray-500">Username: {u.username}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(u.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
