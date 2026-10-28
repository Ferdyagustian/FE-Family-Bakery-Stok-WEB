const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('[RLS] Menerapkan Row Level Security (RLS) dan Database Hardening...')

  // 1. Aktifkan RLS secara dinamis ke seluruh tabel dalam schema 'public'
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'ALTER TABLE public."' || r.tablename || '" ENABLE ROW LEVEL SECURITY;';
        END LOOP;
      END $$;
    `)
    console.log('  [OK] RLS berhasil diaktifkan secara menyeluruh pada semua tabel schema public.')
  } catch (err) {
    console.warn('  [WARN] Dinamis RLS gagal, mencoba per tabel:', err.message)
    const tables = [
      'User',
      'Store',
      'Product',
      'StoreProduct',
      'Sale',
      'AuditLog',
      'RestockRequest',
      'CustomOrder',
      'CustomOrderItem',
      'ProductReturn',
    ]
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`)
        console.log(`  [OK] RLS diaktifkan pada: "${table}"`)
      } catch (e) {
        console.warn(`  [WARN] Peringatan pada "${table}":`, e.message)
      }
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
    console.log('  [OK] Check constraint "chk_stock_non_negative" berhasil diterapkan pada StoreProduct.')
  } catch (err) {
    console.warn('  [WARN] Check constraint warning:', err.message)
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
    console.log('  [OK] Kebijakan RLS storage.objects berhasil dikonfigurasi.')
  } catch (err) {
    console.warn('  [INFO] Storage RLS warning (dapat dikonfigurasi via Supabase Dashboard):', err.message)
  }

  // 4. Verifikasi status RLS seluruh tabel public
  try {
    const status = await prisma.$queryRawUnsafe(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `)
    console.log('\n[STATUS] Status RLS Tabel Public Supabase:')
    console.table(status)
  } catch (err) {
    console.warn('  [WARN] Gagal membaca status RLS:', err.message)
  }

  console.log('\n[DONE] Penguatan Supabase RLS selesai!')
}

main()
  .catch((e) => {
    console.error('[ERROR] Terjadi kesalahan:', e.message)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
