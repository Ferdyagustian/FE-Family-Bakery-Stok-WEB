'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function PasswordInput() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative">
      <input
        id="password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        required
        autoComplete="current-password"
        className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 pr-10 text-sm placeholder:text-gray-400 dark:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        placeholder="Masukkan password"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        tabIndex={-1} // Agar tidak mengganggu tab order form
      >
        {showPassword ? (
          <EyeOff className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Eye className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
