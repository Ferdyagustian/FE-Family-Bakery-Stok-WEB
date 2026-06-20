'use client'

import { useState, useTransition } from 'react'
import { Package, Tag, ShoppingCart, Minus, Plus, Percent, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react'
import Image from 'next/image'
import { removeStoreProduct } from '@/lib/actions/product'
import { toast } from 'sonner'

// ── Product Card ───────────────────────────────────────────────────
export function ProductCard({ 
  product, 
  storeId, 
  viewMode = 'grid',
  onAddToCart,
  cartQty = 0,
  isAdmin = false
}: { 
  product: any, 
  storeId: string, 
  viewMode?: 'grid' | 'list',
  onAddToCart?: (product: any, qty: number) => void,
  cartQty?: number,
  isAdmin?: boolean
}) {
  const [saleQty, setSaleQty] = useState<number | ''>(1)
  const [saleSuccess, setSaleSuccess] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  // ── Optimistic stock update ────────────────────────────────────
  // Available stock accounts for items already in the cart
  const availableStock = Math.max(0, product.stockQuantity - cartQty)

  const adjustQty = (delta: number) => {
    const current = typeof saleQty === 'number' ? saleQty : 1
    setSaleQty(Math.max(1, Math.min(availableStock, current + delta)))
  }

  async function handleSale() {
    const qtySold = typeof saleQty === 'number' ? saleQty : 1
    if (qtySold <= 0 || availableStock === 0) return

    if (onAddToCart) {
      onAddToCart(product, qtySold)
      setSaleQty(1)
      setSaleSuccess(true)
      setTimeout(() => setSaleSuccess(false), 1000)
    }
  }

  const handleDelete = () => {
    startTransition(async () => {
      const res = await removeStoreProduct(storeId, product.id)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success('Produk berhasil dihapus dari cabang')
        setShowConfirmDelete(false)
      }
    })
  }

  const isOutOfStock = availableStock === 0
  const isLowStock = availableStock > 0 && availableStock < 10
  const hasDiscount = product.discount > 0
  const discountedPrice = hasDiscount
    ? product.price * (1 - product.discount / 100)
    : product.price

  return (
    <>
      <div className={`relative bg-white dark:bg-gray-900 rounded-xl border flex ${viewMode === 'list' ? 'flex-col sm:flex-row items-center p-3 gap-4' : 'flex-col h-full'} overflow-hidden group hover:border-gray-300 dark:hover:border-gray-700 transition-colors duration-150 border-gray-200 dark:border-gray-800 shadow-sm`}>
        
        {/* Delete Confirmation Overlay */}
        {showConfirmDelete && (
          <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 z-20 flex flex-col items-center justify-center p-2 sm:p-4 text-center animate-in fade-in zoom-in duration-200 overflow-y-auto">
            <div className="hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center mb-2 sm:mb-3 flex-shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
            </div>
            <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white mb-1">Hapus Produk?</h4>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-3 px-1 sm:px-2 leading-tight">
              Yakin hapus <strong>{product.name}</strong>? Riwayat penjualan tidak hilang.
            </p>
            <div className="flex gap-2 w-full max-w-[200px] mt-auto sm:mt-0">
              <button 
                onClick={() => setShowConfirmDelete(false)}
                disabled={isPending}
                className="flex-1 px-2 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button 
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 px-2 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm shadow-red-600/20 disabled:opacity-50 flex items-center justify-center"
              >
                {isPending ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Hapus'}
              </button>
            </div>
          </div>
        )}

        {/* Delete Button (Admin Only) */}
        {isAdmin && !showConfirmDelete && (
          <button 
            onClick={(e) => { e.preventDefault(); setShowConfirmDelete(true); }}
            className="absolute top-2 right-2 p-2 rounded-lg bg-white/90 dark:bg-gray-900/90 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10 border border-gray-100 dark:border-gray-800"
            title="Hapus Produk dari Cabang"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Product Image */}
        {viewMode === 'grid' && (
          product.imageUrl ? (
          <div className="h-44 sm:h-48 bg-gray-100 dark:bg-gray-800 overflow-hidden relative">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-bold text-sm bg-red-600 px-3 py-1 rounded-full">Habis</span>
              </div>
            )}
            {hasDiscount && (
              <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-md">
                <Percent className="w-3 h-3" />
                -{product.discount}%
              </div>
            )}
          </div>
        ) : (
          <div className="h-44 sm:h-48 bg-gradient-to-br from-primary-100 to-purple-100 flex items-center justify-center relative">
            <Package className="w-14 h-14 text-primary-300" />
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white font-bold text-sm bg-red-600 px-3 py-1 rounded-full">Habis</span>
              </div>
            )}
            {hasDiscount && (
              <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-md">
                <Percent className="w-3 h-3" />
                -{product.discount}%
              </div>
            )}
          </div>
        ))}

        {/* Card Body */}
        <div className={`flex flex-col flex-1 space-y-3 w-full ${viewMode === 'grid' ? 'p-4' : ''}`}>
          {/* Name + Actions */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-base text-gray-900 dark:text-white leading-tight line-clamp-2 flex-1">{product.name}</h3>
          </div>

          {product.description && (
            <p className="text-gray-400 dark:text-gray-500 text-xs line-clamp-2 leading-relaxed">{product.description}</p>
          )}

          <div className={`flex ${viewMode === 'list' ? 'flex-col md:flex-row gap-3 items-start md:items-center' : 'flex-col gap-3'} mt-auto pt-2`}>
            {/* Price & Stock */}
            <div className={`flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 ${viewMode === 'list' ? 'w-full md:w-auto md:flex-1' : ''}`}>
              <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
              {hasDiscount ? (
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 line-through">
                    Rp {product.price.toLocaleString('id-ID')}
                  </span>
                  <span className="font-bold text-sm text-red-600 dark:text-red-400">
                    Rp {Math.round(discountedPrice).toLocaleString('id-ID')}
                  </span>
                </div>
              ) : (
                <span className="font-bold text-sm text-gray-800 dark:text-gray-100">
                  Rp {product.price.toLocaleString('id-ID')}
                </span>
              )}
            </div>
            {/* Optimistic stock display */}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
              isOutOfStock
                ? 'bg-red-100 text-red-600'
                : isLowStock
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {isOutOfStock ? 'Habis' : `${availableStock} stok`}
            </span>
          </div>

          {/* Sale Controls */}
          <div className={`flex items-center gap-2 ${viewMode === 'list' ? 'w-full md:w-auto shrink-0' : 'pt-1'}`}>
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden h-11 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => adjustQty(-1)}
                disabled={typeof saleQty !== 'number' || saleQty <= 1 || isOutOfStock}
                className="w-11 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors duration-150"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={saleQty}
                onChange={(e) => {
                  const val = parseInt(e.target.value.replace(/\D/g, ''))
                  if (isNaN(val)) {
                    setSaleQty('')
                  } else {
                    setSaleQty(Math.min(availableStock, val))
                  }
                }}
                onBlur={() => {
                  if (saleQty === '' || saleQty < 1) setSaleQty(1)
                }}
                disabled={isOutOfStock}
                className="w-10 h-full text-center text-base font-bold text-gray-900 dark:text-gray-100 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-gray-900 p-0 transition-all"
              />
              <button
                onClick={() => adjustQty(1)}
                disabled={typeof saleQty === 'number' && saleQty >= availableStock || isOutOfStock}
                className="w-11 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors duration-150"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleSale}
              disabled={isOutOfStock}
              className={`flex-1 flex items-center justify-center gap-2 text-white text-sm font-bold h-11 rounded-xl transition-colors duration-150 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-900 ${
                saleSuccess
                  ? 'bg-emerald-500'
                  : isOutOfStock
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
              }`}
            >
              {saleSuccess ? (
                <><CheckCircle2 className="w-3.5 h-3.5" /> Ditambah</>
              ) : isOutOfStock ? (
                'Stok Habis'
              ) : (
                <><Plus className="w-4 h-4" /> Tambah</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
