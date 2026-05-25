'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { LowStockAlert } from '@/components/LowStockAlert'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Menu } from 'lucide-react'

type LowStockProduct = {
  id: string
  name: string
  stockQuantity: number
  storeId: string
  storeName: string
}

export function DashboardShell({
  children,
  lowStockProducts = [],
  user,
}: {
  children: React.ReactNode
  lowStockProducts?: LowStockProduct[]
  user?: { role: string, name?: string, username?: string }
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-800">

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar onClose={() => setSidebarOpen(false)} user={user} />
      </div>

      {/* Mobile Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 flex flex-col
        transform transition-transform duration-300 ease-in-out
        lg:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} showCloseButton user={user} />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* Top Bar */}
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 transition-colors"
              aria-label="Buka menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Logo (mobile only) */}
            <div className="lg:hidden flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center p-0.5 shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <img src="/logo.png" alt="Family Bakery Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-heading font-bold text-gray-900 dark:text-white text-sm">Family Bakery</span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Low stock notification bell */}
            <LowStockAlert products={lowStockProducts} />

            {/* Admin/Manager avatar */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <span className="hidden sm:block font-medium text-sm text-gray-700 dark:text-gray-200">
                {user?.role === 'MANAGER' ? 'Kasir' : 'Admin'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
