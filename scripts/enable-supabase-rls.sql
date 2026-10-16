-- ====================================================================
-- FAMILY BAKERY — SUPABASE ROW LEVEL SECURITY (RLS) HARDENING
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New Query
-- ====================================================================

-- 1. AKTIFKAN RLS PADA SELURUH TABEL UTAMA (PUBLIC SCHEMA)
-- Mengaktifkan RLS menutup akses terbuka PostgREST dari internet (via anon_key).
-- Koneksi Prisma (Next.js server) menggunakan role 'postgres' yang memiliki BYPASSRLS,
-- sehingga seluruh fitur kasir, produk, laporan, dll. tetap bekerja 100% normal.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Store" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StoreProduct" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- 2. SUPABASE STORAGE BUCKET: 'products'
-- Izinkan publik hanya MEMBACA gambar produk (Public Read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Read Products Images'
  ) THEN
    CREATE POLICY "Public Read Products Images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'products');
  END IF;
END $$;

-- Izinkan upload/delete hanya melalui Server (Service Role / Admin)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Server Only Manage Products Images'
  ) THEN
    CREATE POLICY "Server Only Manage Products Images"
    ON storage.objects FOR ALL
    USING (bucket_id = 'products' AND auth.role() = 'service_role')
    WITH CHECK (bucket_id = 'products' AND auth.role() = 'service_role');
  END IF;
END $$;

-- 3. INTEGRITAS DATABASE: CHECK CONSTRAINT STOK TIDAK BOLEH NEGATIF
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_stock_non_negative'
  ) THEN
    ALTER TABLE "StoreProduct" ADD CONSTRAINT chk_stock_non_negative CHECK ("stockQuantity" >= 0);
  END IF;
END $$;

-- Selesai! Seluruh peringatan RLS di Supabase Security Advisor akan terselesaikan.
