const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.$queryRawUnsafe('SELECT * FROM "Product" LIMIT 5');
  console.log(p);
}
main();
