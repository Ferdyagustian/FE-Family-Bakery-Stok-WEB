const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('===========================================================')
  console.log('🧹 MEMBERSIHKAN DATA TRANSAKSI, LOG, & RESET STOK DATABASE')
  console.log('===========================================================')

  // 1. Hapus seluruh data Penjualan
  const delSales = await prisma.sale.deleteMany({})
  console.log(`✓ Data Penjualan terhapus: ${delSales.count} transaksi.`)

  // 2. Hapus seluruh data Riwayat Log Aktivitas
  const delLogs = await prisma.auditLog.deleteMany({})
  console.log(`✓ Data Audit Log terhapus: ${delLogs.count} baris log.`)

  // 3. Reset seluruh stok di cabang ke 0
  const resetStock = await prisma.storeProduct.updateMany({
    data: { stockQuantity: 0 }
  })
  console.log(`✓ Stok Produk di cabang di-reset ke 0: ${resetStock.count} item cabang.`)

  console.log('===========================================================')
  console.log('📊 STATUS TERKINI DATABASE:')
  const sales = await prisma.sale.count()
  const auditLogs = await prisma.auditLog.count()
  const storeProducts = await prisma.storeProduct.count()
  const products = await prisma.product.count()
  const stores = await prisma.store.count()
  const users = await prisma.user.count()

  console.log({
    'Transaksi Penjualan (Sale)': sales,
    'Riwayat Log (AuditLog)': auditLogs,
    'Katalog Master Produk (Product)': products,
    'Cabang Toko (Store)': stores,
    'Produk Terdaftar di Cabang (StoreProduct)': storeProducts,
    'Pengguna & Kasir (User)': users
  })
  console.log('===========================================================')
  console.log('✅ DATABASE SIAP UNTUK TRANSAKSI BARU / OPERASIONAL BERSIH')
  console.log('===========================================================\n')
}

main()
  .catch(e => {
    console.error('Error saat mereset database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
