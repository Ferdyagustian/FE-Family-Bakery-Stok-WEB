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
  | 'DELETE_MASTER_PRODUCT'
  | 'UPDATE_BULK_PRICES'
  | 'ADJUST_ALL_PRICES'
  | 'FAILED_LOGIN'
  | 'REQUEST_RESTOCK'
  | 'APPROVE_RESTOCK'
  | 'REJECT_RESTOCK'
  | 'CREATE_PREORDER'
  | 'UPDATE_PREORDER_STATUS'
  | 'RECORD_RETURN'

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
  DELETE_MASTER_PRODUCT: 'Hapus Produk Master',
  UPDATE_BULK_PRICES:    'Edit Harga Massal',
  ADJUST_ALL_PRICES:     'Penyesuaian Harga Global',
  FAILED_LOGIN:          'Gagal Login',
  REQUEST_RESTOCK:       'Pengajuan Restok',
  APPROVE_RESTOCK:       'Persetujuan Restok',
  REJECT_RESTOCK:        'Penolakan Restok',
  CREATE_PREORDER:       'Buat Pesanan Baru',
  UPDATE_PREORDER_STATUS:'Ubah Status Pesanan',
  RECORD_RETURN:         'Catat Retur Barang',
}

// ─── Warna badge per aksi ──────────────────────────────────────
export function getAuditActionColor(action: string): string {
  if (action === 'RECORD_RETURN') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
  if (action.startsWith('DELETE') || action === 'CLEAR_LOGS' || action === 'REJECT_RESTOCK') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  if (action.startsWith('CREATE') || action === 'APPROVE_RESTOCK')  return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  if (action.startsWith('UPDATE') || action === 'RESTOCK_PRODUCT')
                                    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  if (action === 'REQUEST_RESTOCK') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  if (action === 'RECORD_SALE' || action === 'CREATE_PREORDER')     return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  if (action === 'LOGIN')           return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
  if (action === 'LOGOUT')          return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  if (action === 'FAILED_LOGIN')    return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}
