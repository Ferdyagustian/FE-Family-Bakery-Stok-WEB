require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.fvrzeftvqvvrwxwvweyd:Familybakery16stok@db.fvrzeftvqvvrwxwvweyd.supabase.co:5432/postgres'
    }
  }
});
prisma.$connect()
  .then(() => {
    console.log('REAL HOST DIRECT_URL Connected!');
  })
  .catch(e => {
    console.error('REAL HOST Error:', e.message);
  })
  .finally(() => prisma.$disconnect());
