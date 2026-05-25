const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } }
});

async function main() {
  console.log('Menghapus kolom storeId dan stockQuantity dari Product...');
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_storeId_fkey";`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Product_storeId_idx";`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Product_stockQuantity_idx";`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Product" DROP COLUMN IF EXISTS "storeId";`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Product" DROP COLUMN IF EXISTS "stockQuantity";`);
    console.log('Selesai menghapus kolom!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
