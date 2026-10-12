'use client'

import { useState, useTransition } from 'react'
import { Package, ShoppingCart, Minus, Plus, Percent, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react'
import Image from 'next/image'
import { deleteStoreProduct } from '@/lib/actions/product'
import { toast } from 'sonner'

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
      setTimeout(() => setSaleSuccess(false), 900)
    }
  }

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteStoreProduct(storeId, product.id)
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
    <div 
      className={`relative bg-white dark:bg-gray-900 rounded-2xl border flex ${
        viewMode === 'list' ? 'flex-col sm:flex-row items-center p-3.5 gap-4' : 'flex-col h-full'
      } overflow-hidden group hover:border-indigo-200 dark:hover:border-indigo-800/60 transition-all duration-200 border-gray-200 dark:border-gray-800 shadow-xs hover:shadow-md ${
        isOutOfStock ? 'opacity-75 dark:opacity-70' : ''
      }`}
    >
      {/* Delete Confirmation Overlay */}
      {showConfirmDelete && (
        <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 z-20 flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-150 backdrop-blur-xs">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center mb-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Hapus dari Cabang?</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 px-2 leading-tight">
            Yakin hapus <strong>{product.name}</strong>?
          </p>
          <div className="flex gap-2 w-full max-w-[200px]">
            <button 
              onClick={() => setShowConfirmDelete(false)}
              disabled={isPending}
              className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Batal
            </button>
            <button 
              onClick={handleDelete}
              disabled={isPending}
              className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs"
            >
              {isPending ? '...' : 'Hapus'}
            </button>
          </div>
        </div>
      )}

      {/* Delete Button (Admin Only) */}
      {isAdmin && !showConfirmDelete && (
        <button 
          onClick={(e) => { e.preventDefault(); setShowConfirmDelete(true); }}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/90 dark:bg-gray-900/90 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all z-10 border border-gray-200/80 dark:border-gray-700/80 shadow-xs"
          title="Hapus Produk dari Cabang"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Product Image & Badges */}
      {viewMode === 'grid' && (
        <div className="h-36 sm:h-40 bg-gray-100 dark:bg-gray-800/70 overflow-hidden relative flex items-center justify-center">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 flex items-center justify-center">
              <Package className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
          )}

          {/* Sleek Status Badges (Taste-skill compliant) */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {hasDiscount && (
              <span className="inline-flex items-center gap-1 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                <Percent className="w-2.5 h-2.5" />
                -{product.discount}%
              </span>
            )}
          </div>

          {isOutOfStock && (
            <div className="absolute top-2 right-2 z-10">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-900/80 dark:bg-black/80 text-gray-300 backdrop-blur-xs border border-gray-700/60 shadow-xs">
                Stok Habis
              </span>
            </div>
          )}
        </div>
      )}

      {/* Card Body */}
      <div className={`flex flex-col flex-1 p-3.5 sm:p-4 space-y-2.5 w-full ${viewMode === 'list' ? 'p-0' : ''}`}>
        {/* Product Name */}
        <div className="min-h-[2.5rem]">
          <h3 className="font-heading font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">
            {product.name}
          </h3>
        </div>

        {/* Price & Stock Row */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800/80">
          <div>
            {hasDiscount ? (
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 line-through">
                  Rp {product.price.toLocaleString('id-ID')}
                </span>
                <span className="font-extrabold text-sm sm:text-base text-indigo-600 dark:text-indigo-400">
                  Rp {Math.round(discountedPrice).toLocaleString('id-ID')}
                </span>
              </div>
            ) : (
              <span className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white">
                Rp {product.price.toLocaleString('id-ID')}
              </span>
            )}
          </div>

          <span 
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg transition-colors ${
              isOutOfStock
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                : isLowStock
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
            }`}
          >
            {isOutOfStock ? '0 unit' : `${availableStock} unit`}
          </span>
        </div>

        {/* Sale Stepper & Action */}
        <div className="flex items-center gap-2 pt-1 mt-auto">
          {/* Stepper */}
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden h-9 bg-gray-50 dark:bg-gray-800/60 flex-shrink-0">
            <button
              type="button"
              onClick={() => adjustQty(-1)}
              disabled={typeof saleQty !== 'number' || saleQty <= 1 || isOutOfStock}
              className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={saleQty}
              onChange={(e) => {
                const val = parseInt(e.target.value.replace(/\D/g, ''))
                if (isNaN(val)) setSaleQty('')
                else setSaleQty(Math.min(availableStock, val))
              }}
              onBlur={() => {
                if (saleQty === '' || saleQty < 1) setSaleQty(1)
              }}
              disabled={isOutOfStock}
              className="w-8 h-full text-center text-xs font-bold text-gray-900 dark:text-white bg-transparent border-none focus:outline-none p-0"
            />
            <button
              type="button"
              onClick={() => adjustQty(1)}
              disabled={(typeof saleQty === 'number' && saleQty >= availableStock) || isOutOfStock}
              className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            type="button"
            onClick={handleSale}
            disabled={isOutOfStock}
            className={`flex-1 h-9 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
              saleSuccess
                ? 'bg-emerald-600 text-white shadow-xs'
                : isOutOfStock
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-500/20'
            }`}
          >
            {saleSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ditambah</span>
              </>
            ) : isOutOfStock ? (
              <span>Habis</span>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>+ Keranjang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
