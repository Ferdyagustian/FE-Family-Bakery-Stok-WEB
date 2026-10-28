'use client'

import { useState } from 'react'
import { CustomDropdown } from '@/components/CustomDropdown'
import { Store, Activity } from 'lucide-react'

interface AuditFilterBarProps {
  allActions: string[]
  actionLabels: Record<string, string>
  stores: { id: string; name: string }[]
  defaultAction?: string
  defaultStoreId?: string
  defaultStartDate?: string
  defaultEndDate?: string
}

export function AuditFilterBar({
  allActions,
  actionLabels,
  stores,
  defaultAction = '',
  defaultStoreId = '',
  defaultStartDate = '',
  defaultEndDate = ''
}: AuditFilterBarProps) {
  const [selectedAction, setSelectedAction] = useState(defaultAction)
  const [selectedStoreId, setSelectedStoreId] = useState(defaultStoreId)

  return (
    <form method="GET" className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-5">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Filter Aksi */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
            Jenis Aktivitas
          </label>
          <CustomDropdown
            value={selectedAction}
            onChange={setSelectedAction}
            icon={<Activity className="w-3.5 h-3.5" />}
            options={[
              { value: '', label: 'Semua Aktivitas' },
              ...allActions.map(a => ({ value: a, label: actionLabels[a] || a }))
            ]}
            placeholder="Semua Aktivitas"
            className="w-full"
            buttonClassName="h-10 text-xs sm:text-sm"
          />
          <input type="hidden" name="action" value={selectedAction} />
        </div>

        {/* Filter Cabang */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
            Cabang
          </label>
          <CustomDropdown
            value={selectedStoreId}
            onChange={setSelectedStoreId}
            icon={<Store className="w-3.5 h-3.5" />}
            options={[
              { value: '', label: 'Semua Cabang' },
              ...stores.map(s => ({ value: s.id, label: s.name }))
            ]}
            placeholder="Semua Cabang"
            className="w-full"
            buttonClassName="h-10 text-xs sm:text-sm"
          />
          <input type="hidden" name="storeId" value={selectedStoreId} />
        </div>

        {/* Filter Start Date */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
            Mulai Dari
          </label>
          <input
            type="datetime-local"
            name="startDate"
            defaultValue={defaultStartDate}
            className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filter End Date */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
            Sampai Dengan
          </label>
          <input
            type="datetime-local"
            name="endDate"
            defaultValue={defaultEndDate}
            className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Tombol */}
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="submit"
            className="flex-1 sm:flex-none h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs"
          >
            Filter
          </button>
          <a
            href="/audit"
            className="flex-1 sm:flex-none h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs sm:text-sm font-medium flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Reset
          </a>
        </div>
      </div>
    </form>
  )
}

