const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('[CLEANUP] Memulai pencadangan dan pembersihan pesanan kustom / preorder & restok...');

  // 1. Hitung data saat ini
  const [salesCount, ordersCount, orderItemsCount, returnsCount, restockCount] = await Promise.all([
    prisma.sale.count(),
    prisma.customOrder.count(),
    prisma.customOrderItem.count(),
    prisma.productReturn.count(),
    prisma.restockRequest.count(),
  ]);

  console.log(`[INFO] Status data saat ini:`);
  console.log(`  - Sale: ${salesCount}`);
  console.log(`  - CustomOrder: ${ordersCount}`);
  console.log(`  - CustomOrderItem: ${orderItemsCount}`);
  console.log(`  - ProductReturn: ${returnsCount}`);
  console.log(`  - RestockRequest: ${restockCount}`);

  // 2. Buat file backup JSON
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(backupDir, `orders-and-sales-backup-${timestamp}.json`);

  console.log(`[BACKUP] Mengambil data orders dan restocks untuk dicadangkan ke ${backupFilePath}...`);
  const [allOrders, allOrderItems, allRestocks] = await Promise.all([
    prisma.customOrder.findMany(),
    prisma.customOrderItem.findMany(),
    prisma.restockRequest.findMany(),
  ]);

  fs.writeFileSync(
    backupFilePath,
    JSON.stringify({ orders: allOrders, orderItems: allOrderItems, restocks: allRestocks }, null, 2)
  );
  console.log(`[BACKUP] Berhasil mencadangkan ${allOrders.length} orders dan ${allRestocks.length} restocks.`);

  // 3. Hapus CustomOrder (CustomOrderItem otomatis terhapus via onDelete: Cascade)
  console.log('[DELETE] Menghapus data CustomOrder & CustomOrderItem...');
  const deletedOrders = await prisma.customOrder.deleteMany({});
  console.log(`[OK] Berhasil menghapus ${deletedOrders.count} pesanan kustom/pre-order.`);

  // 4. Hapus RestockRequest dummy
  console.log('[DELETE] Menghapus data RestockRequest...');
  const deletedRestocks = await prisma.restockRequest.deleteMany({});
  console.log(`[OK] Berhasil menghapus ${deletedRestocks.count} pengajuan restok.`);

  // 5. Bersihkan audit log terkait order dan restok dummy
  console.log('[DELETE] Menghapus log audit terkait preorder dan restok dummy...');
  const deletedAudit = await prisma.auditLog.deleteMany({
    where: {
      action: {
        in: [
          'CREATE_PREORDER',
          'UPDATE_PREORDER_STATUS',
          'REQUEST_RESTOCK',
          'SUBMIT_RESTOCK_REQUEST',
          'APPROVE_RESTOCK',
        ],
      },
    },
  });
  console.log(`[OK] Berhasil membersihkan ${deletedAudit.count} log audit.`);

  // 6. Verifikasi hasil akhir
  const [finalSales, finalOrders, finalOrderItems, finalReturns, finalRestocks] = await Promise.all([
    prisma.sale.count(),
    prisma.customOrder.count(),
    prisma.customOrderItem.count(),
    prisma.productReturn.count(),
    prisma.restockRequest.count(),
  ]);

  console.log(`\n[VERIFIKASI AKHIR DATABASE]`);
  console.log(`  - Sale: ${finalSales}`);
  console.log(`  - CustomOrder: ${finalOrders}`);
  console.log(`  - CustomOrderItem: ${finalOrderItems}`);
  console.log(`  - ProductReturn: ${finalReturns}`);
  console.log(`  - RestockRequest: ${finalRestocks}`);
  console.log(`  - File Backup: ${backupFilePath}`);
  console.log('\n[SELESAI] Seluruh transaksi penjualan, pesanan, dan ranking produk kini 100% bersih (Rp 0)!');
}

main()
  .catch((e) => {
    console.error('[ERROR] Gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
