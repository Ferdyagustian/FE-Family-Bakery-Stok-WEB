const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function main() {
  console.log('🔒 Menerapkan Row Level Security (RLS) dan Database Constraints...')

  // 1. Aktifkan RLS pada tabel-tabel utama
  const tables = ['User', 'Store', 'Product', 'StoreProduct', 'Sale', 'AuditLog']
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`)
      console.log(`  ✅ RLS diaktifkan pada tabel: "${table}"`)
    } catch (err) {
      console.warn(`  ⚠️ Peringatan pada "${table}":`, err.message)
    }
  }

  // 2. Tambahkan Check Constraint agar stockQuantity >= 0
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_stock_non_negative'
        ) THEN
          ALTER TABLE "StoreProduct" ADD CONSTRAINT chk_stock_non_negative CHECK ("stockQuantity" >= 0);
        END IF;
      END $$;
    `)
    console.log('  ✅ Check constraint "chk_stock_non_negative" berhasil diterapkan pada StoreProduct.')
  } catch (err) {
    console.warn('  ⚠️ Check constraint warning:', err.message)
  }

  // 3. Kebijakan Storage Products (jika skema storage tersedia di Supabase)
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Read Products Images'
          ) THEN
            CREATE POLICY "Public Read Products Images"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'products');
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Server Only Manage Products Images'
          ) THEN
            CREATE POLICY "Server Only Manage Products Images"
            ON storage.objects FOR ALL
            USING (bucket_id = 'products' AND auth.role() = 'service_role')
            WITH CHECK (bucket_id = 'products' AND auth.role() = 'service_role');
          END IF;
        END IF;
      END $$;
    `)
    console.log('  ✅ Kebijakan RLS storage.objects berhasil dikonfigurasi.')
  } catch (err) {
    console.warn('  ℹ️ Storage RLS warning (dapat dikonfigurasi via Supabase Dashboard):', err.message)
  }

  console.log('\n🎉 Penguatan Supabase RLS selesai!')
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan:', e.message)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
