'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Store as StoreIcon, FileSpreadsheet, LogOut, X, ClipboardList, Package, BrainCircuit, ChefHat } from 'lucide-react'
import { logoutAction } from '@/lib/actions/auth'

interface SidebarProps {
  onClose?: () => void
  showCloseButton?: boolean
  user?: any
}

const navLinks = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/stores', label: 'Manajemen Cabang', icon: StoreIcon },
  { href: '/orders', label: 'Pesanan & Jadwal Dapur', icon: ChefHat },
  { href: '/reports', label: 'Laporan & Ekspor', icon: FileSpreadsheet },
]

const adminOnlyLinks = [
  { href: '/products', label: 'Katalog Master Produk', icon: Package },
  { href: '/forecast', label: 'Prediksi Penjualan AI', icon: BrainCircuit },
  { href: '/audit', label: 'Riwayat Aktivitas', icon: ClipboardList },
]

export function Sidebar({ onClose, showCloseButton, user }: SidebarProps) {
  const pathname = usePathname()

  let visibleLinks = navLinks
  if (user?.role === 'MANAGER') {
    visibleLinks = [
      { href: `/stores/${user.storeId}`, label: 'Cabang Saya (Kasir)', icon: StoreIcon },
      { href: '/orders', label: 'Pesanan & Jadwal Dapur', icon: ChefHat },
      { href: '/reports', label: 'Laporan Penjualan', icon: FileSpreadsheet }
    ]
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800/80 h-full flex flex-col flex-shrink-0 select-none">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center p-0.5 shadow-sm overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-white dark:bg-gray-900 rounded-[10px] flex items-center justify-center">
              <Image src="/logo.png" alt="Family Bakery" width={24} height={24} className="w-6 h-6 object-contain" priority />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-heading font-extrabold text-gray-900 dark:text-white tracking-tight">
              Family Bakery
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-wide">
              SISTEM INVENTARIS &amp; POS
            </span>
          </div>
        </Link>

        {showCloseButton && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Tutup menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
        {/* Section 1: Operasional Utama */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2">
            Operasional
          </p>
          {visibleLinks.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-150 ${
                  active
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-500/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
                <span className="truncate">{label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                )}
              </Link>
            )
          })}
        </div>

        {/* Section 2: Administrasi (Khusus Admin) */}
        {user?.role === 'ADMIN' && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2">
              Administrasi &amp; Analisis
            </p>
            {adminOnlyLinks.map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-150 ${
                    active
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-500/20'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
                  <span className="truncate">{label}</span>
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* User Info & Logout Footer */}
      <div className="p-3 pb-8 border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/50">
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-white dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-200 dark:hover:border-rose-900/40 transition-colors shadow-xs"
          >
            <span className="flex items-center gap-2">
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span>Keluar (Logout)</span>
            </span>
            <span className="text-[10px] text-gray-600 dark:text-gray-300 font-medium px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
              {user?.role || 'User'}
            </span>
          </button>
        </form>
      </div>
    </aside>
  )
}
