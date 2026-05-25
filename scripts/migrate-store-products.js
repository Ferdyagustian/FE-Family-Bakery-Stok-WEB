require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } }
});

async function main() {
  console.log('Memulai migrasi data Product ke StoreProduct menggunakan SQL langsung...');

  const products = await prisma.$queryRawUnsafe(`SELECT * FROM "Product"`);
  console.log(`Ditemukan ${products.length} produk untuk dimigrasi.`);

  let successCount = 0;
  let skipCount = 0;
  
  // Karena cuid() tidak ada di SQL standar, kita akan bikin fungsi generator ID (bisa pakai string random simple atau uuid)
  const crypto = require('crypto');
  const generateId = () => 'c' + crypto.randomBytes(12).toString('hex'); // pseudo-cuid

  for (const product of products) {
    try {
      if (!product.storeId) {
        console.log(`Produk ${product.name} (${product.id}) tidak punya storeId, dilewati.`);
        skipCount++;
        continue;
      }

      // Periksa apakah sudah ada (mungkin script dijalankan 2x)
      const existing = await prisma.$queryRawUnsafe(
        `SELECT id FROM "StoreProduct" WHERE "storeId" = $1 AND "productId" = $2`, 
        product.storeId, product.id
      );

      if (existing.length === 0) {
        const id = generateId();
        await prisma.$queryRawUnsafe(
          `INSERT INTO "StoreProduct" ("id", "storeId", "productId", "stockQuantity", "updatedAt") VALUES ($1, $2, $3, $4, NOW())`,
          id, product.storeId, product.id, product.stockQuantity || 0
        );
        successCount++;
      } else {
        skipCount++;
      }
    } catch (error) {
      console.error(`Gagal memigrasi produk ID: ${product.id}`, error.message);
    }
  }

  console.log(`Migrasi selesai! Berhasil: ${successCount}, Dilewati (sudah ada): ${skipCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
