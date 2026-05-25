const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Mengeksekusi SQL manual untuk membuat tabel StoreProduct...');
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StoreProduct" (
          "id" TEXT NOT NULL,
          "storeId" TEXT NOT NULL,
          "productId" TEXT NOT NULL,
          "stockQuantity" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
      
          CONSTRAINT "StoreProduct_pkey" PRIMARY KEY ("id")
      );
    `);
    
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "StoreProduct_storeId_productId_key" ON "StoreProduct"("storeId", "productId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoreProduct_storeId_idx" ON "StoreProduct"("storeId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoreProduct_productId_idx" ON "StoreProduct"("productId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoreProduct_stockQuantity_idx" ON "StoreProduct"("stockQuantity");`);
    
    console.log('Menambahkan Foreign Keys...');
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch(e) { console.log('FK storeId mungkin sudah ada.'); }
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch(e) { console.log('FK productId mungkin sudah ada.'); }

    console.log('Selesai membuat tabel!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
