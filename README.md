# 🥖 Family Bakery — Sistem Manajemen Stok, Penjualan & Jadwal Dapur

Aplikasi web modern berbasis cloud untuk manajemen rantai pasok gerai bakery terdistribusi: pemantauan stok multi-cabang, kasir POS, jadwal produksi dapur pusat (*kitchen baking schedule*), pesanan khusus (*pre-order*), serta analisis & prediksi permintaan (*AI demand forecasting*).

---

## 🎥 Video Demo
- **Demo Quest Sistem Family Bakery**: [https://youtu.be/PeyZ-ZcziEo](https://youtu.be/PeyZ-ZcziEo)

---

## 📐 Arsitektur Sistem

```mermaid
graph TD
    subgraph Client["🖥️ Klien & Antarmuka Pengguna"]
        AdminUI["Dashboard Super Admin<br/>(Desktop & Tablet)"]
        StoreUI["Kasir POS & Staff Cabang<br/>(Mobile & Tablet Responsive)"]
        KitchenUI["Lembar Kerja Dapur Pusat<br/>(Baking Schedule & Print Sheet)"]
    end

    subgraph AppServer["⚡ Next.js 16 (App Router & Turbopack)"]
        AuthMiddleware["JWT Session & Role Middleware<br/>(Admin / Store User)"]
        ServerActions["Next.js Server Actions<br/>(Audit, Restock, Order, Product)"]
        CustomUI["Tailwind CSS v4 & Custom Dropdowns<br/>(No Template OS Styling)"]
    end

    subgraph Integrations["🔌 Layanan Eksternal & Bot"]
        TelegramBot["🤖 Bot Telegram Notifikasi<br/>(Pengajuan Restok Instan)"]
        FastAPI_AI["🧠 ML Forecasting Engine<br/>(FastAPI + Google TimesFM)"]
    end

    subgraph DataLayer["🗄️ Database & Storage (Supabase)"]
        PrismaORM["Prisma ORM 6<br/>(Transactions & B-Tree Indexes)"]
        PostgresDB[("PostgreSQL Database<br/>(Row Level Security / RLS)")]
        StorageBucket["Supabase Storage<br/>(Foto Produk Roti)"]
    end

    Client --> AppServer
    AppServer --> AuthMiddleware
    AuthMiddleware --> ServerActions
    ServerActions --> PrismaORM
    PrismaORM --> PostgresDB
    ServerActions -.-> TelegramBot
    ServerActions -.-> FastAPI_AI
    AppServer -.-> StorageBucket
```

---

## 🔄 Alur Kerja Operasional (Workflow)

```mermaid
sequenceDiagram
    autonumber
    actor Staff as 🏪 Staf Cabang
    actor Admin as 👑 Super Admin
    actor Kitchen as 👨‍🍳 Dapur Pusat
    actor Customer as 👤 Pelanggan

    Note over Customer,Staff: 1. Alur Pemesanan Khusus (Pre-Order)
    Customer->>Staff: Pesan roti untuk acara (Nama, No HP, Tanggal Ambil, DP)
    Staff->>Kitchen: Input via Modal Pesanan (Terjadwal Otomatis ke Dapur)
    Kitchen->>Kitchen: Buka Lembar Kerja Dapur, Panggang Roti & Update Status
    Kitchen->>Customer: Roti Siap Diambil di Cabang

    Note over Staff,Admin: 2. Alur Pengajuan Restok Multi-Item
    Staff->>Admin: Ajukan Restok Batch (Pilih Varian Roti + Jumlah)
    Admin-->>Admin: Menerima Notifikasi Bot Telegram
    alt Restok Disetujui
        Admin->>Staff: Setujui Batch (Stok Bertambah Otomatis via Transaksi DB)
    else Restok Ditolak
        Admin->>Staff: Tolak Pengajuan (Disertai Alasan Penolakan)
    end
```

---

## 🚀 Fitur Unggulan

### 1. 📋 Jadwal Dapur & Akumulasi Produksi Roti
- **Kalkulasi Akumulasi Otomatis**: Menghitung total kebutuhan produksi per hari dari akumulasi pesanan pre-order pelanggan dan kebutuhan restok toko cabang.
- **Checklist Interaktif**: Baker dapur dapat menandai roti yang sudah matang/selesai dipanggang secara visual.
- **Lembar Cetak Dapur (*Kitchen Print Sheet*)**: Fitur cetak ramah printer (`window.print`) berformat ringkas untuk ditempel pada papan kerja oven dapur pusat.
- **Interactive Status Badge**: Pembaruan status pesanan (*Menunggu*, *Diproses*, *Siap Diambil*, *Selesai*, *Batal*) menggunakan custom status pill tanpa pop-up default OS browser.

### 2. 📦 Permintaan & Persetujuan Restok (Batch Workflow)
- **Multi-Item Restock**: Staf cabang dapat memilih banyak varian roti sekaligus dalam satu nomor batch permintaan (`REQ-YYYYMMDD-XXXX`).
- **Pencarian Cepat Skalalabel**: Filter dan pencarian nama roti berbasis substring dengan performa tinggi pada ribuan varian produk.
- **Integrasi Bot Telegram**: Notifikasi otomatis dikirimkan ke grup Super Admin ketika ada permohonan restok baru atau persetujuan restok.
- **Audit Log Lengkap**: Seluruh riwayat pengajuan, persetujuan, dan penolakan restok tercatat secara permanen di basis data audit.

### 3. 💳 Kasir POS & Manajemen Penjualan
- **Multi-Store Management**: Mendukung banyak gerai dengan penentuan harga, diskon, dan batas minimum stok individual per cabang.
- **Pencatatan Penjualan Cepat**: Pengurangan stok cabang seketika saat kasir memproses transaksi.
- **Verifikasi Struk & Bukti Transfer**: Upload bukti pembayaran transfer bank/QRIS ke Supabase Storage.

### 4. 📈 Analitik Penjualan & AI Demand Forecasting
- **Grafik Interaktif Recharts**: Visualisasi omzet, laba kotor, dan breakdown performa produk per cabang dengan penanganan *zero-layout shift*.
- **Machine Learning Forecasting**: Integrasi dengan API eksternal TimesFM untuk memproyeksikan kebutuhan stok minggu berikutnya.

---

## 🛠️ Tech Stack

| Lapisan | Teknologi |
|---|---|
| **Frontend Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack, Server Actions) |
| **UI Library** | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **Data Visualization** | [Recharts](https://recharts.org/) |
| **Database & ORM** | [PostgreSQL (Supabase)](https://supabase.com/), [Prisma ORM 6](https://www.prisma.io/) |
| **Autentikasi** | Session Cookie terenkripsi JWT (jose) + Password hashing bcrypt |
| **Notifikasi** | Telegram Bot API |
| **Ekspor Data** | ExcelJS (`.xlsx`) |

---

## 📁 Struktur Direktori

```text
├── app/                        # Next.js App Router
│   ├── (dashboard)/            # Halaman Dashboard Terproteksi (Layout & Sidebar)
│   │   ├── audit/              # Log Aktivitas & Jejak Keamanan
│   │   ├── forecast/           # Analisis & AI Demand Forecast
│   │   ├── orders/             # Jadwal Dapur & Manajemen Pre-Order Roti
│   │   ├── products/           # Master Data Produk Roti
│   │   ├── reports/            # Laporan Penjualan & Ekspor Excel
│   │   └── stores/             # Monitoring Cabang & Alur Restok
│   ├── api/                    # Endpoint API (Upload, Export, Notify)
│   └── login/                  # Halaman Autentikasi Pengguna
├── components/                 # Komponen UI Reusable
│   ├── BakingScheduleClient.tsx# Antarmuka Jadwal Produksi & Pre-Order
│   ├── CreateOrderModal.tsx    # Modal Pembuatan Pesanan Pelanggan Baru
│   ├── CustomDropdown.tsx      # Komponen Dropdown Kustom (Bebas OS Template)
│   ├── RestockForm.tsx         # Formulir Pengajuan Restok Multi-Item
│   ├── PendingRestockList.tsx  # Panel Persetujuan Restok Super Admin
│   └── SalesChart.tsx          # Grafik Tren Penjualan Harian
├── lib/                        # Core Utilities & Server Actions
│   ├── actions/                # Server Actions (Auth, Product, Order, Audit)
│   ├── audit.ts                # Audit Logger Utility
│   ├── db.ts                   # Prisma Client Singleton
│   ├── session.ts              # Enkripsi & Dekripsi JWT Session
│   └── telegram.ts             # Client Notifikasi Bot Telegram
├── prisma/
│   └── schema.prisma           # Skema Data PostgreSQL + Indeks Performa B-Tree
└── scripts/                    # Skrip Utilitas & Generator Data Uji
```

---

## ⚙️ Panduan Menjalankan Secara Lokal

### 1. Prasyarat Sistem
- **Node.js**: v18.18.0 atau lebih baru (direkomendasikan v20+)
- **NPM**: v9+ atau **pnpm / yarn**
- Instance database **PostgreSQL** (misal: Supabase)

### 2. Kloning & Pemasangan Dependensi
```bash
git clone https://github.com/Ferdyagustian/FE-Family-Bakery-Stok-WEB.git
cd FE-Family-Bakery-Stok-WEB
npm install
```

### 3. Konfigurasi Lingkungan (`.env`)
Salin berkas `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Lengkapi variabel berikut di dalam `.env`:
```env
# Koneksi Basis Data PostgreSQL
DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Enkripsi Sesi JWT (Minimal 32 karakter unik)
JWT_SECRET="masukkan-string-acak-rahasia-minimal-32-karakter"

# Supabase Storage (Gambar Produk)
NEXT_PUBLIC_SUPABASE_URL="https://xxxxxxxxxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

# Bot Telegram (Opsional - untuk notifikasi restok)
TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRstUVwxyZ"
TELEGRAM_CHAT_ID="-1001234567890"
```

### 4. Sinkronisasi Skema Database
```bash
npx prisma db push
```

### 5. Menjalankan Server Pengembang
```bash
npm run dev
```
Akses aplikasi melalui peramban di [http://localhost:3000](http://localhost:3000).

---

## 🔒 Praktik Keamanan

- **Zero Secret Leakage**: File `.env` dikecualikan secara ketat oleh `.gitignore`.
- **Role-Based Access Control (RBAC)**: Pemisahan hak akses antara `ADMIN` (Super Admin) dan `STORE_USER` (Kasir / Staf Cabang) di level server action dan middleware.
- **Database Row Level Security (RLS)**: Perlindungan data langsung di level PostgreSQL Supabase untuk mencegah akses lintas cabang tidak sah.
- **Audit Trail**: Seluruh tindakan finansial dan perubahan stok terekam dengan timestamp, ID pengguna, dan detail mutasi.

---

## 📄 Lisensi
Hak Cipta © 2026 **Family Bakery**. Seluruh hak cipta dilindungi undang-undang.
