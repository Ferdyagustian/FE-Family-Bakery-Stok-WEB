'use client'

import { useState, useTransition } from 'react'
import { ProductCard } from '@/components/ProductCard'
import { Package, Search, LayoutGrid, List, ShoppingCart, X, Plus, Minus, Trash2, PackageOpen } from 'lucide-react'
import { toast } from 'sonner'
import { recordBulkSales } from '@/lib/actions/product'

export function ProductSearchList({ products, storeId }: { products: any[], storeId: string }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // --- Cart State ---
  const [cart, setCart] = useState<{product: any, quantity: number}[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleAddToCart = (product: any, qty: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + qty }
            : item
        )
      }
      return [...prev, { product, quantity: qty }]
    })
    // setIsCartOpen(true) // Dihapus sesuai permintaan user
  }

  const handleUpdateCartItem = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta
        if (newQty <= 0) return item // handled by remove
        return { ...item, quantity: Math.min(item.product.stockQuantity, newQty) }
      }
      return item
    }))
  }

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }

  const handleCheckout = () => {
    if (cart.length === 0) return
    startTransition(async () => {
      const items = cart.map(item => ({ productId: item.product.id, quantity: item.quantity }))
      const res = await recordBulkSales(items, storeId)
      if (res?.error) {
        toast.error(res.error)
      } else {
        setCart([])
        setIsCartOpen(false)
        toast.success('Transaksi berhasil dicatat!')
      }
    })
  }

  const cartTotalQty = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotalPrice = cart.reduce((sum, item) => {
    const discountPct = item.product.discount || 0
    const effectivePrice = item.product.price * (1 - discountPct / 100)
    return sum + (effectivePrice * item.quantity)
  }, 0)

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Toolbar: Search & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Cari nama produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors shadow-sm"
          />
        </div>

        <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="sm:hidden">Grid</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <List className="w-4 h-4" />
            <span className="sm:hidden">List</span>
          </button>
        </div>
      </div>

      {/* Products Grid / List */}
      <div className={`grid gap-4 sm:gap-6 ${
        viewMode === 'grid' 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
          : 'grid-cols-1 lg:grid-cols-2'
      }`}>
        {filteredProducts.map((product) => {
          const cartItem = cart.find(item => item.product.id === product.id)
          return (
            <ProductCard 
              key={product.id} 
              product={product} 
              storeId={storeId} 
              viewMode={viewMode} 
              onAddToCart={handleAddToCart}
              cartQty={cartItem?.quantity || 0}
            />
          )
        })}
        {filteredProducts.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-16 bg-white dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-center">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-5 text-gray-400 dark:text-gray-500">
              <PackageOpen className="w-10 h-10" />
            </div>
            <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {products.length === 0 
                ? 'Belum ada produk di cabang ini' 
                : 'Produk tidak ditemukan'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
              {products.length === 0 
                ? 'Silakan tambahkan produk atau lakukan restok untuk cabang ini.'
                : 'Coba gunakan kata kunci pencarian yang lain untuk menemukan produk.'}
            </p>
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cartTotalQty > 0 && !isCartOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-2xl p-4 flex items-center justify-center gap-3 transition-transform hover:scale-105 z-40 group"
        >
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900">
              {cartTotalQty}
            </span>
          </div>
          <div className="hidden sm:block group-hover:block text-sm font-bold pr-2">
            Rp {Math.round(cartTotalPrice).toLocaleString('id-ID')}
          </div>
        </button>
      )}

      {/* Cart Sidebar Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="glass-overlay cursor-pointer transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="relative w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-gray-900 dark:text-white">Keranjang Kasir</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{cartTotalQty} Item Produk</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                  <ShoppingCart className="w-16 h-16 opacity-20" />
                  <p>Keranjang masih kosong</p>
                </div>
              ) : (
                cart.map(item => {
                  const discountPct = item.product.discount || 0
                  const effectivePrice = item.product.price * (1 - discountPct / 100)
                  return (
                    <div key={item.product.id} className="flex gap-4 items-start p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">{item.product.name}</h4>
                        <div className="text-primary-600 dark:text-primary-400 font-bold text-sm mt-0.5">
                          Rp {Math.round(effectivePrice).toLocaleString('id-ID')}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 h-8">
                          <button 
                            onClick={() => {
                              if (item.quantity <= 1) handleRemoveFromCart(item.product.id)
                              else handleUpdateCartItem(item.product.id, -1)
                            }}
                            className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                          <button 
                            onClick={() => handleUpdateCartItem(item.product.id, 1)}
                            disabled={item.quantity >= item.product.stockQuantity}
                            className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button 
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-medium"
                        >
                          <Trash2 className="w-3 h-3" /> Hapus
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer / Checkout */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Total Tagihan</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    Rp {Math.round(cartTotalPrice).toLocaleString('id-ID')}
                  </span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={isPending}
                  className="w-full h-12 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary-600/20 disabled:opacity-70"
                >
                  {isPending ? (
                    <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Memproses...</>
                  ) : (
                    <><ShoppingCart className="w-5 h-5" /> Proses Transaksi</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
