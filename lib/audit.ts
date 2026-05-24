import prisma from '@/lib/db'

// ─── Daftar semua jenis aksi yang dicatat ──────────────────────
export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE_PRODUCT'
  | 'UPDATE_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'RECORD_SALE'
  | 'RESTOCK_PRODUCT'
  | 'CREATE_STORE'
  | 'UPDATE_STORE'
  | 'DELETE_STORE'
  | 'CREATE_USER'
  | 'DELETE_USER'
  | 'CLEAR_LOGS'

interface AuditParams {
  userId?: string
  username?: string
  action: AuditAction
  entityType: string
  entityId?: string
  entityName?: string
  detail?: Record<string, unknown>
  storeId?: string
}

// ─── Helper terpusat untuk menulis audit log ───────────────────
// Kesalahan penulisan log TIDAK boleh menggagalkan operasi utama
export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId:     params.userId     ?? null,
        username:   params.username   ?? null,
        action:     params.action,
        entityType: params.entityType,
        entityId:   params.entityId   ?? null,
        entityName: params.entityName ?? null,
        detail:     params.detail ? JSON.stringify(params.detail) : null,
        storeId:    params.storeId    ?? null,
      },
    })
  } catch (err) {
    // Log ke console tapi jangan lempar error
    console.error('[AuditLog] Gagal menulis log:', err)
  }
}

// ─── Label ramah untuk tampilan UI ────────────────────────────
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN:           'Login',
  LOGOUT:          'Logout',
  CREATE_PRODUCT:  'Tambah Produk',
  UPDATE_PRODUCT:  'Edit Produk',
  DELETE_PRODUCT:  'Hapus Produk',
  RECORD_SALE:     'Catat Penjualan',
  RESTOCK_PRODUCT: 'Restock Produk',
  CREATE_STORE:    'Tambah Cabang',
  UPDATE_STORE:    'Edit Cabang',
  DELETE_STORE:    'Hapus Cabang',
  CREATE_USER:     'Tambah Pengguna',
  DELETE_USER:     'Hapus Pengguna',
  CLEAR_LOGS:      'Bersihkan Log',
}

// ─── Warna badge per aksi ──────────────────────────────────────
export function getAuditActionColor(action: string): string {
  if (action.startsWith('DELETE') || action === 'CLEAR_LOGS') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  if (action.startsWith('CREATE'))  return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  if (action.startsWith('UPDATE') || action === 'RESTOCK_PRODUCT')
                                    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  if (action === 'RECORD_SALE')     return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  if (action === 'LOGIN')           return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
  if (action === 'LOGOUT')          return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}
