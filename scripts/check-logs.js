const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.auditLog.findMany()
  .then(logs => {
    console.log("Total logs:", logs.length);
    console.log(logs);
  })
  .catch(console.error)
  .finally(() => prisma.$disconnect());
