import { loginAction } from '@/lib/actions/auth'
import { PasswordInput } from '@/components/PasswordInput'
import { AlertCircle } from 'lucide-react'

type SearchParams = Promise<{ error?: string }>

export default async function LoginPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams
  const error = searchParams?.error

  const errorMessages: Record<string, string> = {
    EmptyFields: 'Username dan password tidak boleh kosong.',
    InvalidCredentials: 'Username atau password salah. Silakan periksa kembali.',
    UserNotFound: 'Username atau password salah. Silakan periksa kembali.',
    WrongPassword: 'Username atau password salah. Silakan periksa kembali.',
    ServerError: 'Terjadi kesalahan pada server. Coba lagi.',
    TooManyRequests: 'Terlalu banyak percobaan login gagal. Silakan tunggu beberapa saat demi keamanan.',
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-200">
      
      {/* Subtle Background Glow (Minimal & Elegant) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-center p-2.5">
            <img src="/logo.png" alt="Family Bakery Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-heading font-extrabold text-gray-900 dark:text-white tracking-tight">
          Family Bakery
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Sistem Kasir POS &amp; Inventaris Bakery
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white dark:bg-gray-900/90 py-8 px-6 sm:px-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-gray-200/80 dark:border-gray-800 rounded-2xl backdrop-blur-md">

          {/* Error Callout (Dark & Light Mode Safe) */}
          {error && errorMessages[error] && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs sm:text-sm font-medium flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessages[error]}</span>
            </div>
          )}

          <form className="space-y-4" action={loginAction}>
            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  className="flex h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Masukkan username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <PasswordInput />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-indigo-500/20 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              >
                Masuk ke Sistem
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-center text-xs text-gray-400 dark:text-gray-500">
            Hubungi admin jika Anda lupa kata sandi.
          </div>
        </div>
      </div>
    </div>
  )
}
