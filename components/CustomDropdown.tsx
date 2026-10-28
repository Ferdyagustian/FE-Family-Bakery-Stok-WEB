'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
  icon?: ReactNode
  dotColor?: string
  badgeClass?: string
}

interface CustomDropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  icon?: ReactNode
  placeholder?: string
  className?: string
  buttonClassName?: string
  menuClassName?: string
  align?: 'left' | 'right'
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function CustomDropdown({
  options,
  value,
  onChange,
  icon,
  placeholder = 'Pilih...',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  align = 'left',
  disabled = false,
  size = 'md'
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const selectedOption = options.find(o => o.value === value)

  const handleSelect = (val: string) => {
    onChange(val)
    setIsOpen(false)
  }

  const isSmall = size === 'sm'

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold outline-none transition-colors shadow-xs hover:border-gray-300 dark:hover:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer ${
          isSmall ? 'text-[11px] px-2.5 py-1.5' : 'text-xs px-3 py-2'
        } ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="flex-shrink-0 text-indigo-500/80 dark:text-indigo-400">{icon}</span>}
          {selectedOption?.dotColor && (
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selectedOption.dotColor}`} />
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`${
            isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'
          } text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
          }`}
        />
      </button>

      {/* Popover Menu Panel */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 min-w-[200px] w-full max-h-64 overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl shadow-indigo-950/10 dark:shadow-black/50 p-1.5 space-y-0.5 z-50 custom-scrollbar animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
        >
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.value)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs font-medium transition-colors select-none cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/80'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {option.dotColor && (
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${option.dotColor}`} />
                  )}
                  {option.icon && (
                    <span className="flex-shrink-0 text-gray-400 dark:text-gray-500">{option.icon}</span>
                  )}
                  <span className="truncate">{option.label}</span>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface CustomStatusDropdownProps {
  value: string
  orderId: string
  onChange: (id: string, status: any) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function CustomStatusDropdown({
  value,
  orderId,
  onChange,
  disabled = false,
  size = 'md'
}: CustomStatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const statusConfigs: Record<string, { label: string; badge: string; dot: string }> = {
    PENDING: {
      label: 'Menunggu',
      badge: 'bg-amber-50 text-amber-700 border-amber-200/90 hover:bg-amber-100/70 hover:border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 dark:hover:bg-amber-900/60 focus:ring-amber-500/20',
      dot: 'bg-amber-500'
    },
    IN_PROCESS: {
      label: 'Diproses',
      badge: 'bg-blue-50 text-blue-700 border-blue-200/90 hover:bg-blue-100/70 hover:border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 dark:hover:bg-blue-900/60 focus:ring-blue-500/20',
      dot: 'bg-blue-500 animate-pulse'
    },
    READY: {
      label: 'Siap Diambil',
      badge: 'bg-purple-50 text-purple-700 border-purple-200/90 hover:bg-purple-100/70 hover:border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60 dark:hover:bg-purple-900/60 focus:ring-purple-500/20',
      dot: 'bg-purple-500'
    },
    COMPLETED: {
      label: 'Selesai',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100/70 hover:border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 dark:hover:bg-emerald-900/60 focus:ring-emerald-500/20',
      dot: 'bg-emerald-500'
    },
    CANCELLED: {
      label: 'Batal',
      badge: 'bg-rose-50 text-rose-700 border-rose-200/90 hover:bg-rose-100/70 hover:border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 dark:hover:bg-rose-900/60 focus:ring-rose-500/20',
      dot: 'bg-rose-500'
    }
  }

  const current = statusConfigs[value] || {
    label: value,
    badge: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    dot: 'bg-gray-400'
  }

  const isSmall = size === 'sm'

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`inline-flex items-center gap-1.5 font-bold rounded-lg border shadow-2xs cursor-pointer outline-none transition-colors focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed select-none ${
          isSmall ? 'text-[11px] px-2 py-1' : 'text-xs px-2.5 py-1.5'
        } ${current.badge}`}
        title="Ubah status pesanan"
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${current.dot}`} />
        <span>{current.label}</span>
        <ChevronDown
          className={`${
            isSmall ? 'w-2.5 h-2.5' : 'w-3 h-3'
          } opacity-60 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 opacity-100' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-40 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl shadow-indigo-950/10 dark:shadow-black/50 p-1.5 space-y-0.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          {Object.entries(statusConfigs).map(([statusKey, config]) => {
            const isSelected = statusKey === value
            return (
              <button
                key={statusKey}
                type="button"
                onClick={() => {
                  onChange(orderId, statusKey)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold transition-colors select-none cursor-pointer ${
                  isSelected
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                  <span>{config.label}</span>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
