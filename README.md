# Family Bakery - Sistem Manajemen Stok & Penjualan Web

Aplikasi web berbasis cloud untuk manajemen stok produk, pencatatan penjualan, pemantauan performa cabang, serta analisis & *demand forecasting* berbasis AI untuk usaha **Family Bakery**.

## 🎥 Video Demo Quest
- **Link Video YouTube (Quest Family Bakery Stok Toko)**: [https://youtu.be/PeyZ-ZcziEo](https://youtu.be/PeyZ-ZcziEo)

## 🚀 Fitur Utama
- **Multi-Store & Role Management**: Pengelolaan cabang toko oleh Admin & Kasir/Manager cabang.
- **Master Katalog & Stok Real-Time**: Penyesuaian stok, restock barang, dan pemantauan stok fisik.
- **Pencatatan Penjualan & Laporan**: Laporan omzet, profit, serta ekspor data ke Excel (`.xlsx`).
- **Peringatan Stok Rendah**: Notifikasi otomatis saat stok berada di bawah ambang batas minimal.
- **AI Demand Forecasting**: Integrasi dengan engine FastAPI & Google TimesFM untuk prediksi stok.

## 🛠️ Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, Recharts.
- **Backend & DB**: Prisma ORM 6, PostgreSQL (Supabase), Next.js Server Actions & API Routes, FastAPI (Backend ML).
- **Autentikasi**: JWT Cookie Session + bcrypt.

## 💻 Cara Menjalankan Secara Lokal

1. **Install Dependensi**:
   ```bash
   npm install
   ```

2. **Jalankan Server Pengembang**:
   ```bash
   npm run dev
   ```

3. Buka [http://localhost:3000](http://localhost:3000) di peramban Anda.

