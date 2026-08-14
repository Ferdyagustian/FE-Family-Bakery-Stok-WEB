const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Menu dasar jika database masih kosong
const defaultMenus = [
  { name: 'Roti Tawar Kupas Special', price: 18000, desc: 'Roti & Tawar', baseQty: 40, weekendBump: 15 },
  { name: 'Roti Manis Cokelat Lumer', price: 12000, desc: 'Roti Manis', baseQty: 30, weekendBump: 18 },
  { name: 'Roti Sisir Mentega Keju', price: 14000, desc: 'Roti Manis', baseQty: 25, weekendBump: 12 },
  { name: 'Roti Abon Sapi Pedas', price: 16000, desc: 'Roti Gurih', baseQty: 28, weekendBump: 14 },
  { name: 'Brownies Panggang Toping Mix', price: 35000, desc: 'Brownies', baseQty: 15, weekendBump: 10 },
  { name: 'Bolu Gulung Vanilla Cheese', price: 28000, desc: 'Bolu & Lapis', baseQty: 18, weekendBump: 12 },
  { name: 'Kue Tart Ulang Tahun 18cm', price: 95000, desc: 'Kue Tart', baseQty: 4, weekendBump: 14 },
  { name: 'Donat Isi 6 Cokelat Keju', price: 25000, desc: 'Donat & Pastry', baseQty: 22, weekendBump: 15 },
]

async function main() {
  console.log('====================================================')
  console.log('🌱 MEMULAI SEEDING DATA PENJUALAN 1 BULAN (TESTING) 🌱')
  console.log('====================================================')

  // 1. Pastikan minimal ada 1-2 Store (Cabang)
  let stores = await prisma.store.findMany()
  if (stores.length === 0) {
    console.log('Membuat cabang awal...')
    const store1 = await prisma.store.create({
      data: { name: 'Cabang Utama (Pusat)', location: 'Jl. Riau No. 12, Bandung' }
    })
    const store2 = await prisma.store.create({
      data: { name: 'Cabang Dago', location: 'Jl. Ir. H. Juanda No. 88, Bandung' }
    })
    stores = [store1, store2]
    console.log(`✓ Dibuat 2 cabang: ${stores.map(s => s.name).join(', ')}`)
  } else {
    console.log(`✓ Ditemukan ${stores.length} cabang: ${stores.map(s => s.name).join(', ')}`)
  }

  // 2. Pastikan Master Produk tersedia
  let products = await prisma.product.findMany()
  if (products.length < defaultMenus.length) {
    console.log('Menambahkan produk master default...')
    for (const menu of defaultMenus) {
      const existing = await prisma.product.findFirst({ where: { name: menu.name } })
      if (!existing) {
        await prisma.product.create({
          data: {
            name: menu.name,
            price: menu.price,
            description: menu.desc,
            discount: 0
          }
        })
      }
    }
    products = await prisma.product.findMany()
    console.log(`✓ Master produk siap (${products.length} produk).`)
  } else {
    console.log(`✓ Ditemukan ${products.length} master produk.`)
  }

  // 3. Pastikan relasi StoreProduct (Inventaris) tersedia
  for (const store of stores) {
    for (const product of products) {
      await prisma.storeProduct.upsert({
        where: {
          storeId_productId: { storeId: store.id, productId: product.id }
        },
        create: {
          storeId: store.id,
          productId: product.id,
          stockQuantity: 25 // Stok awal aman
        },
        update: {}
      })
    }
  }
  console.log('✓ Relasi stok cabang (StoreProduct) telah disinkronkan.')

  // 4. Generate Riwayat Penjualan Selama 30 Hari Kebelakang
  console.log('\nMembuat transaksi penjualan historis 30 hari kebelakang...')
  const now = new Date()
  const salesToInsert = []

  // Ambil data menu acuan atau beri default
  const productProfiles = products.map((p, idx) => {
    const matched = defaultMenus.find(m => m.name === p.name)
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      baseQty: matched ? matched.baseQty : 15 + (idx % 10) * 2,
      weekendBump: matched ? matched.weekendBump : 8 + (idx % 5) * 2
    }
  })

  for (let dayOffset = 30; dayOffset >= 1; dayOffset--) {
    const targetDate = new Date(now)
    targetDate.setDate(now.getDate() - dayOffset)
    
    const dayOfWeek = targetDate.getDay() // 0=Minggu, 6=Sabtu
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6)

    for (const store of stores) {
      for (const prod of productProfiles) {
        // Hitung kuantitas realistis dengan variasi acak (noise)
        let qty = prod.baseQty + (isWeekend ? prod.weekendBump : 0)
        // Tambahkan variasi ±20%
        const variation = (Math.random() * 0.4 - 0.2) * qty
        qty = Math.max(1, Math.round(qty + variation))

        const totalAmount = qty * prod.price
        const profitAmount = totalAmount * 0.35 // Estimasi margin 35%

        // Waktu acak antara jam 09:00 sampai 19:00 WIB
        const saleDateTime = new Date(targetDate)
        saleDateTime.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0)

        salesToInsert.push({
          storeId: store.id,
          productId: prod.id,
          quantitySold: qty,
          totalAmount: totalAmount,
          profitAmount: profitAmount,
          saleDate: saleDateTime
        })
      }
    }
  }

  // Insert batch ke PostgreSQL
  console.log(`Mengunggah ${salesToInsert.length} data transaksi penjualan ke database...`)
  
  // Lakukan insertMany dengan chunk 500 records agar lancar
  const chunkSize = 500
  for (let i = 0; i < salesToInsert.length; i += chunkSize) {
    const chunk = salesToInsert.slice(i, i + chunkSize)
    await prisma.sale.createMany({
      data: chunk
    })
    process.stdout.write(`•`)
  }

  console.log('\n\n====================================================')
  console.log('✅ SEEDING BERHASIL! DATA TESTING TELAH TERSEDIA')
  console.log('====================================================')
  console.log(`📊 Total Transaksi Baru  : ${salesToInsert.length} baris penjualan`)
  console.log(`📅 Rentang Waktu         : 30 Hari Terakhir`)
  console.log(`🏪 Cabang yang Terisi    : ${stores.length} Cabang`)
  console.log(`🍞 Master Produk Aktif   : ${products.length} Produk`)
  console.log('====================================================')
  console.log('Sekarang Anda bisa langsung membuka Dashboard, Laporan,')
  console.log('dan Halaman Prediksi AI (/forecast) di website Anda!')
  console.log('====================================================\n')
}

main()
  .catch(e => {
    console.error('Error saat seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
