'use client'

import { useState } from 'react'
import { createMasterProduct } from '@/lib/actions/product'
import { useRouter } from 'next/navigation'
import { X, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

export function AddMasterProductModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const router = useRouter()

  const handleClose = () => {
    setIsOpen(false)
    setImageUrl('')
    setImagePreview('')
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setImagePreview(URL.createObjectURL(file))

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        setImageUrl(data.url)
      } else {
        toast.error('Gagal mengupload gambar')
        setImagePreview('')
      }
    } catch {
      toast.error('Terjadi kesalahan saat upload')
      setImagePreview('')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.append('imageUrl', imageUrl)

    const res = await createMasterProduct(formData)
    setLoading(false)
    if (res?.error) {
      toast.error(res.error)
    } else {
      handleClose()
      toast.success('Produk master berhasil ditambahkan')
      router.refresh()
    }
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn-primary whitespace-nowrap w-full justify-center">
        + Tambah Master Produk
      </button>

      {isOpen && (
        <div className="glass-overlay">
          <div className="bg-white dark:bg-gray-900 w-full sm:rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto sm:max-w-lg">
            {/* Modal Header */}
            <div className="glass-header">
              <h3 className="text-lg font-heading font-bold text-gray-900 dark:text-white">Tambah Master Produk</h3>
              <button onClick={handleClose} type="button" className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                  Nama Produk <span className="text-red-500">*</span>
                </label>
                <input 
                  name="name" 
                  required 
                  className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 dark:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Misal: Roti Sisir, Croissant, Donat" 
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                  Harga (Rp) <span className="text-red-500">*</span>
                </label>
                <input 
                  name="price" 
                  type="number" 
                  min="0" 
                  required 
                  className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 dark:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="15000" 
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Deskripsi</label>
                <textarea 
                  name="description" 
                  rows={2}
                  className="flex w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 dark:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  placeholder="Deskripsi singkat produk (opsional)..." 
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Foto Produk</label>
                <label className="relative flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-950/20 transition-colors overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400 dark:text-gray-500 p-4 text-center">
                      <ImageIcon className="w-8 h-8 mb-2" />
                      <p className="text-sm font-medium">{uploading ? 'Mengupload...' : 'Klik untuk upload foto'}</p>
                      <p className="text-xs mt-1">PNG, JPG, WebP (max 5MB)</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="sr-only" 
                    onChange={handleImageUpload} 
                    disabled={uploading} 
                  />
                  {uploading && (
                    <div className="absolute inset-0 bg-white dark:bg-gray-900/70 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </label>
                {imagePreview && (
                  <button type="button" onClick={() => { setImageUrl(''); setImagePreview('') }} className="mt-1.5 text-xs text-red-500 hover:underline">
                    Hapus foto
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={handleClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 transition-colors" disabled={loading}>
                  Batal
                </button>
                <button type="submit" disabled={loading || uploading} className="flex-1 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm transition-colors disabled:opacity-60">
                  {loading ? 'Menyimpan...' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
