const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('[CLEANUP] Memulai proses pencadangan dan pembersihan data penjualan...');

  // 1. Hitung data saat ini
  const initialSalesCount = await prisma.sale.count();
  const initialReturnCount = await prisma.productReturn.count();
  console.log(`[INFO] Jumlah data penjualan saat ini: ${initialSalesCount} baris`);
  console.log(`[INFO] Jumlah data retur barang saat ini: ${initialReturnCount} baris`);

  // 2. Buat backup JSON terlebih dahulu untuk keamanan
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(backupDir, `sales-backup-${timestamp}.json`);

  console.log(`[BACKUP] Mengambil data untuk dicadangkan ke ${backupFilePath}...`);
  const allSales = await prisma.sale.findMany();
  const allReturns = await prisma.productReturn.findMany();

  fs.writeFileSync(backupFilePath, JSON.stringify({ sales: allSales, returns: allReturns }, null, 2));
  console.log(`[BACKUP] Berhasil mencadangkan ${allSales.length} data penjualan dan ${allReturns.length} data retur.`);

  // 3. Bersihkan tabel Sale dan ProductReturn
  console.log('[DELETE] Menghapus data penjualan (Sale)...');
  const deletedSales = await prisma.sale.deleteMany({});
  console.log(`[OK] Berhasil menghapus ${deletedSales.count} data penjualan.`);

  console.log('[DELETE] Menghapus data retur barang (ProductReturn)...');
  const deletedReturns = await prisma.productReturn.deleteMany({});
  console.log(`[OK] Berhasil menghapus ${deletedReturns.count} data retur barang.`);

  // 4. Bersihkan audit log terkait transaksi dummy/test
  console.log('[DELETE] Menghapus audit log transaksi test (RECORD_SALE, RECORD_RETURN, SEED_TRAINING_DATA)...');
  const deletedAudit = await prisma.auditLog.deleteMany({
    where: {
      action: {
        in: ['RECORD_SALE', 'RECORD_RETURN', 'SEED_TRAINING_DATA']
      }
    }
  });
  console.log(`[OK] Berhasil membersihkan ${deletedAudit.count} log audit transaksi penjualan/retur.`);

  // 5. Verifikasi hasil akhir
  const finalSalesCount = await prisma.sale.count();
  const finalReturnCount = await prisma.productReturn.count();
  console.log(`\n[VERIFIKASI]`);
  console.log(`  - Total Penjualan (Sale): ${finalSalesCount} (bersih)`);
  console.log(`  - Total Retur (ProductReturn): ${finalReturnCount} (bersih)`);
  console.log(`  - File Backup: ${backupFilePath}`);
  console.log('\n[SELESAI] Database siap digunakan untuk operasional riil esok hari!');
}

main()
  .catch((e) => {
    console.error('[ERROR] Gagal membersihkan data penjualan:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
