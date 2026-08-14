/**
 * Format mata uang Rupiah standar Indonesia dengan kompresi cerdas (Best Practice Fintech/Dashboard):
 * - < 1 Juta       : Rp 850.000
 * - 1 Jt - 999 Jt  : Rp 85,4 Jt / Rp 254,9 Jt
 * - 1 M - 999 M    : Rp 6,20 M (Miliar)
 * - >= 1 Triliun   : Rp 1,50 T (Triliun)
 */
export function formatCompactRupiah(amount: number, useLongSuffix: boolean = false): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  if (abs >= 1_000_000_000_000) {
    const val = (abs / 1_000_000_000_000).toFixed(abs / 1_000_000_000_000 >= 100 ? 1 : 2)
    return `${sign}Rp ${val.replace('.', ',')} ${useLongSuffix ? 'Triliun' : 'T'}`
  }

  if (abs >= 1_000_000_000) {
    const val = (abs / 1_000_000_000).toFixed(abs / 1_000_000_000 >= 100 ? 1 : 2)
    return `${sign}Rp ${val.replace('.', ',')} ${useLongSuffix ? 'Miliar' : 'M'}`
  }

  if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toFixed(abs / 1_000_000 >= 100 ? 0 : 1)
    return `${sign}Rp ${val.replace('.', ',')} ${useLongSuffix ? 'Juta' : 'Jt'}`
  }

  return `${sign}Rp ${Math.round(abs).toLocaleString('id-ID')}`
}

/**
 * Format Rupiah lengkap dengan pemisah ribuan titik (contoh: Rp 6.201.900.000)
 */
export function formatFullRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`
}
