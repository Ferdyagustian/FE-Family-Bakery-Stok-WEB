const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('[RESET-STOCK] Memulai proses pencadangan dan reset total stok fisik...');

  // 1. Cek agregasi stok saat ini
  const aggBefore = await prisma.storeProduct.aggregate({
    _sum: { stockQuantity: true },
    _count: { id: true },
  });
  console.log(`[INFO] Jumlah relasi produk cabang: ${aggBefore._count.id} baris`);
  console.log(`[INFO] Total stok fisik saat ini: ${aggBefore._sum.stockQuantity ?? 0} pcs`);

  // 2. Backup data stok fisik ke file JSON
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(backupDir, `stock-backup-${timestamp}.json`);

  const allStocks = await prisma.storeProduct.findMany({
    select: {
      id: true,
      storeId: true,
      productId: true,
      stockQuantity: true,
    },
  });

  fs.writeFileSync(backupFilePath, JSON.stringify(allStocks, null, 2));
  console.log(`[BACKUP] Berhasil mencadangkan data stok ke: ${backupFilePath}`);

  // 3. Reset seluruh kuantitas stok menjadi 0
  console.log('[UPDATE] Mengatur stockQuantity = 0 pada seluruh StoreProduct...');
  const updateResult = await prisma.storeProduct.updateMany({
    data: {
      stockQuantity: 0,
    },
  });
  console.log(`[OK] Berhasil memperbarui ${updateResult.count} data stok cabang menjadi 0.`);

  // 4. Verifikasi akhir
  const aggAfter = await prisma.storeProduct.aggregate({
    _sum: { stockQuantity: true },
    _count: { id: true },
  });

  const nonZeroCount = await prisma.storeProduct.count({
    where: { stockQuantity: { gt: 0 } },
  });

  console.log(`\n[VERIFIKASI AKHIR STOK]`);
  console.log(`  - Total Stok Fisik: ${aggAfter._sum.stockQuantity ?? 0} Pcs (0 bersih)`);
  console.log(`  - Produk dengan Stok > 0: ${nonZeroCount}`);
  console.log(`  - Total Relasi Toko-Produk: ${aggAfter._count.id} (katalog tetap utuh)`);
  console.log('\n[SELESAI] Total stok di Dashboard kini 0 Pcs dan siap untuk input stok fisik riil besok!');
}

main()
  .catch((e) => {
    console.error('[ERROR] Gagal mereset stok:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

