'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Store as StoreIcon, FileSpreadsheet, LogOut, X, ClipboardList, Package } from 'lucide-react'
import { logoutAction } from '@/lib/actions/auth'

interface SidebarProps {
  onClose?: () => void
  showCloseButton?: boolean
  user?: any
}

const navLinks = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/stores', label: 'Manajemen Cabang', icon: StoreIcon },
  { href: '/reports', label: 'Laporan', icon: FileSpreadsheet },
]

const adminOnlyLinks = [
  { href: '/products', label: 'Katalog Produk', icon: Package },
  { href: '/audit', label: 'Riwayat Aktivitas', icon: ClipboardList },
]

export function Sidebar({ onClose, showCloseButton, user }: SidebarProps) {
  const pathname = usePathname()

  let visibleLinks = navLinks
  if (user?.role === 'MANAGER') {
    visibleLinks = [
      { href: `/stores/${user.storeId}`, label: 'Cabang Saya', icon: StoreIcon }
    ]
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-full flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center p-0.5 shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <img src="/logo.png" alt="Family Bakery Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-base font-heading font-bold text-gray-900 dark:text-white">Family Bakery</h1>
        </div>
        {showCloseButton && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 transition-colors"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 mb-3">
          Menu Utama
        </p>
        {visibleLinks.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-150 ${
                active
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-200 dark:shadow-primary-900/30'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-950/20 hover:text-primary-700 dark:hover:text-primary-400'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : ''}`} />
              <span>{label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-80" />
              )}
            </Link>
          )
        })}

        {/* Khusus ADMIN: Riwayat Aktivitas */}
        {user?.role === 'ADMIN' && (
          <>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 pt-4 pb-2">
              Admin
            </p>
            {adminOnlyLinks.map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-150 ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/30'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-700 dark:hover:text-indigo-400'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : ''}`} />
                  <span>{label}</span>
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                  )}
                </Link>
              )
            })}
          </>
        )}
      </nav>


      {/* Footer: Logout */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 transition-colors font-medium text-sm"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </form>
      </div>
    </div>
  )
}
