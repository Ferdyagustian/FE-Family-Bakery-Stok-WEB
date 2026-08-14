'use client'

import { useState, useTransition } from 'react'
import { ProductCard } from '@/components/ProductCard'
import { PaymentModal } from '@/components/PaymentModal'
import { ReceiptModal, ReceiptData } from '@/components/ReceiptModal'
import { Package, Search, LayoutGrid, List, ShoppingCart, X, Plus, Minus, Trash2, PackageOpen, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { recordBulkSales } from '@/lib/actions/product'

interface ProductSearchListProps {
  products: any[]
  storeId: string
  storeName?: string
  storeLocation?: string | null
  isAdmin?: boolean
}

export function ProductSearchList({ 
  products, 
  storeId, 
  storeName = 'Family Bakery', 
  storeLocation, 
  isAdmin = false 
}: ProductSearchListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // --- Cart State ---
  const [cart, setCart] = useState<{product: any, quantity: number}[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // --- Modal States ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)

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
  }

  const handleUpdateCartItem = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta
        if (newQty <= 0) return item
        return { ...item, quantity: Math.min(item.product.stockQuantity, newQty) }
      }
      return item
    }))
  }

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }

  const handleOpenPayment = () => {
    if (cart.length === 0) return
    setIsCartOpen(false)
    setIsPaymentModalOpen(true)
  }

  const handleConfirmPayment = async (payment: {
    paymentMethod: 'Tunai' | 'QRIS' | 'Transfer'
    cashPaid: number
    change: number
  }) => {
    startTransition(async () => {
      const items = cart.map(item => ({ productId: item.product.id, quantity: item.quantity }))
      const res = await recordBulkSales(items, storeId)
      
      if (res?.error) {
        toast.error(res.error)
      } else {
        // Generate nomor resi unik (Contoh: FB-20260814-1042)
        const now = new Date()
        const y = now.getFullYear()
        const m = String(now.getMonth() + 1).padStart(2, '0')
        const d = String(now.getDate()).padStart(2, '0')
        const rand = Math.floor(1000 + Math.random() * 9000)
        const receiptNo = `FB-${y}${m}${d}-${rand}`

        const receiptItems = cart.map(item => {
          const discountPct = item.product.discount || 0
          const effectivePrice = item.product.price * (1 - discountPct / 100)
          return {
            name: item.product.name,
            quantity: item.quantity,
            price: item.product.price,
            discount: discountPct,
            total: Math.round(effectivePrice * item.quantity),
          }
        })

        const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
        const grandTotal = Math.round(cartTotalPrice)
        const discountTotal = Math.max(0, subtotal - grandTotal)

        setReceiptData({
          receiptNo,
          date: now,
          storeName,
          storeLocation,
          cashierName: 'Kasir Cabang',
          items: receiptItems,
          subtotal,
          discountTotal,
          grandTotal,
          paymentMethod: payment.paymentMethod,
          cashPaid: payment.cashPaid,
          change: payment.change,
        })

        setCart([])
        setIsPaymentModalOpen(false)
        setIsReceiptModalOpen(true)
        toast.success('Transaksi penjualan berhasil dicatat!')
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
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Cari nama produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors shadow-xs"
          />
        </div>

        <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full sm:w-auto border border-gray-200/60 dark:border-gray-700/60">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Products Grid / List */}
      <div className={`grid gap-4 sm:gap-5 ${
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
              isAdmin={isAdmin}
            />
          )
        })}
        {filteredProducts.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-16 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4 text-gray-400">
              <PackageOpen className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">Tidak ada produk ditemukan</h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Coba cari dengan kata kunci lain</p>
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cartTotalQty > 0 && !isCartOpen && (
        <div className="fixed bottom-6 right-6 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-3 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl shadow-indigo-600/30 font-bold transition-all active:scale-95"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                {cartTotalQty}
              </span>
            </div>
            <span className="text-sm border-l border-indigo-400/50 pl-3">
              Rp {Math.round(cartTotalPrice).toLocaleString('id-ID')}
            </span>
          </button>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="glass-overlay z-40">
          <div className="bg-white dark:bg-gray-900 w-full sm:rounded-2xl shadow-2xl max-w-lg h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold font-heading text-gray-900 dark:text-white text-base sm:text-lg">
                  Keranjang Kasir ({cartTotalQty})
                </h3>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                  <ShoppingCart className="w-12 h-12 opacity-20" />
                  <p className="text-sm">Keranjang masih kosong</p>
                </div>
              ) : (
                cart.map(item => {
                  const discountPct = item.product.discount || 0
                  const effectivePrice = item.product.price * (1 - discountPct / 100)
                  return (
                    <div key={item.product.id} className="flex gap-3 items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm truncate">
                          {item.product.name}
                        </h4>
                        <div className="text-indigo-600 dark:text-indigo-400 font-bold text-xs mt-0.5">
                          Rp {Math.round(effectivePrice).toLocaleString('id-ID')}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 h-7">
                          <button 
                            onClick={() => {
                              if (item.quantity <= 1) handleRemoveFromCart(item.product.id)
                              else handleUpdateCartItem(item.product.id, -1)
                            }}
                            className="w-7 h-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                          <button 
                            onClick={() => handleUpdateCartItem(item.product.id, 1)}
                            disabled={item.quantity >= item.product.stockQuantity}
                            className="w-7 h-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button 
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 rounded-md transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer / Checkout */}
            {cart.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Tagihan</span>
                  <span className="text-xl font-extrabold text-gray-900 dark:text-white font-heading">
                    Rp {Math.round(cartTotalPrice).toLocaleString('id-ID')}
                  </span>
                </div>
                <button
                  onClick={handleOpenPayment}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98] text-sm"
                >
                  <span>Lanjut ke Pembayaran</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 1. Payment Modal ── */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false)
          setIsCartOpen(true) // reopen cart on cancel
        }}
        totalAmount={Math.round(cartTotalPrice)}
        itemCount={cartTotalQty}
        onConfirmPayment={handleConfirmPayment}
        loading={isPending}
      />

      {/* ── 2. Receipt Modal (Thermal Printing) ── */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false)
          setReceiptData(null)
        }}
        data={receiptData}
      />
    </div>
  )
}
