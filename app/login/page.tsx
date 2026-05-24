import { Store } from 'lucide-react'
import { loginAction } from '@/lib/actions/auth'
import { PasswordInput } from '@/components/PasswordInput'

type SearchParams = Promise<{ error?: string }>

export default async function LoginPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams
  const error = searchParams?.error

  const errorMessages: Record<string, string> = {
    EmptyFields: 'Username dan password tidak boleh kosong.',
    UserNotFound: 'Username tidak ditemukan.',
    WrongPassword: 'Password salah. Coba lagi.',
    ServerError: 'Terjadi kesalahan pada server. Coba lagi.',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 dark:from-gray-900 via-white dark:via-gray-900 to-purple-50 dark:to-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center p-2 shadow-xl shadow-primary-200">
            <img src="/logo.png" alt="Family Bakery Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-heading font-extrabold text-gray-900 dark:text-white">
          Family Bakery
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          Panel Admin — Masuk untuk melanjutkan
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-gray-900 py-8 px-8 shadow-xl border border-gray-100 dark:border-gray-800 rounded-2xl">

          {error && errorMessages[error] && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {errorMessages[error]}
            </div>
          )}

          <form className="space-y-5" action={loginAction}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 dark:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Masukkan username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Password
              </label>
              <PasswordInput />
            </div>

            <button
              type="submit"
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-md shadow-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Masuk
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 text-center text-xs text-gray-400 dark:text-gray-500">
            Hubungi admin jika Anda lupa kata sandi.
          </div>
        </div>
      </div>
    </div>
  )
}
