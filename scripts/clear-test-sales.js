const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('====================================================')
  console.log('🗑️  MEMBERSIHKAN DATA TRANSAKSI PENJUALAN TESTING 🗑️ ')
  console.log('====================================================')

  const countBefore = await prisma.sale.count()
  console.log(`Jumlah transaksi saat ini di database: ${countBefore} baris.`)

  if (countBefore === 0) {
    console.log('Tabel penjualan sudah kosong.')
    return
  }

  // Hapus seluruh transaksi penjualan testing
  const deleted = await prisma.sale.deleteMany({})
  console.log(`✓ Berhasil menghapus ${deleted.count} data transaksi penjualan.`)

  console.log('====================================================')
  console.log('✅ DATABASE TELAH DIBERSIHKAN KEMBALI')
  console.log('====================================================')
  console.log('Master produk, cabang toko, dan akun admin tetap aman.')
  console.log('====================================================\n')
}

main()
  .catch(e => {
    console.error('Error saat membersihkan data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
