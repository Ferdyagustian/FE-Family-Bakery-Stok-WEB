const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Helper random
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Indonesian customer names & order contexts
const CUSTOMER_TEMPLATES = [
  { name: 'Ibu Hj. Siti Nurjanah', note: 'Untuk Pengajian Akbar Muslimat' },
  { name: 'Bpk. H. Bambang Sudiro', note: 'Acara Tasyakuran & Walimah' },
  { name: 'Ibu Rina Anggraeni', note: 'Snack box Arisan RT 04' },
  { name: 'Bpk. Hendra Kurniawan', note: 'Meeting Bulanan PT Jaya Sentosa' },
  { name: 'Ibu Dewi Sartika', note: 'Syukuran Kelahiran Cucu' },
  { name: 'Bpk. Ahmad Fauzi', note: 'Pengajian Rutin Malam Jumat' },
  { name: 'Ibu Ratna Wulandari', note: 'Ulang Tahun Anak ke-5' },
  { name: 'Ibu Sri Wahyuni', note: 'Konsumsi Rapat Pleno Kelurahan' },
  { name: 'Bpk. Wahyu Hidayat', note: 'Arisan Paguyuban Guru' },
  { name: 'Ibu Endang Lestari', note: 'Pesanan Snack Box Pernikahan' },
  { name: 'Ibu Yuliana Sasmita', note: 'Acara Komunitas Sepeda Sehat' },
  { name: 'Bpk. Eko Prasetyo', note: 'Konsumsi Gathering Kantor' },
  { name: 'Ibu Lilis Nurhasanah', note: 'Tahlilan 40 Hari' },
  { name: 'Ibu Maya Sofia', note: 'Snack Wisuda TK Pertiwi' },
  { name: 'Bpk. Supriyadi', note: 'Acara Donor Darah PMI' }
]

const PHONE_PREFIXES = ['0812', '0813', '0821', '0822', '0852', '0857', '0878', '0896']

function generatePhone() {
  const prefix = randomChoice(PHONE_PREFIXES)
  const rest = String(randomInt(10000000, 99999999))
  return `${prefix}${rest}`
}

async function main() {
  console.log('=================================================================')
  console.log('🚀 MEMULAI RESET & SEED DATA TRAINING HIGH-VOLUME (1000-3000/MGG)')
  console.log('=================================================================')

  // 1. Bersihkan transaksi lama
  console.log('1. Menghapus data transaksi lama...')
  const delOrderItems = await prisma.customOrderItem.deleteMany({})
  const delOrders = await prisma.customOrder.deleteMany({})
  const delSales = await prisma.sale.deleteMany({})
  const delRestock = await prisma.restockRequest.deleteMany({})
  const delLogs = await prisma.auditLog.deleteMany({})

  console.log(`   ✓ Dihapus: ${delSales.count} penjualan, ${delOrders.count} pesanan, ${delRestock.count} restock, ${delLogs.count} log.`)

  // 2. Ambil Toko & Master Produk
  const stores = await prisma.store.findMany()
  if (stores.length === 0) {
    throw new Error('Tidak ada cabang toko (Store). Pastikan cabang sudah terdaftar.')
  }
  console.log(`2. Ditemukan ${stores.length} cabang toko: ${stores.map(s => s.name).join(', ')}`)

  const products = await prisma.product.findMany()
  if (products.length === 0) {
    throw new Error('Tidak ada master produk. Jalankan scripts/seed-menu.js terlebih dahulu.')
  }
  console.log(`3. Ditemukan ${products.length} master varian roti.`)

  // 3. Reset & isi stok produk di setiap cabang (50 - 150 pcs per varian)
  console.log('4. Memperbarui inventaris stok awal di seluruh cabang toko...')
  let storeProductUpserts = 0
  for (const store of stores) {
    for (const product of products) {
      await prisma.storeProduct.upsert({
        where: {
          storeId_productId: { storeId: store.id, productId: product.id }
        },
        create: {
          storeId: store.id,
          productId: product.id,
          stockQuantity: randomInt(40, 140)
        },
        update: {
          stockQuantity: randomInt(40, 140)
        }
      })
      storeProductUpserts++
    }
  }
  console.log(`   ✓ ${storeProductUpserts} relasi inventaris cabang siap dengan stok aman.`)

  // Base Reference Date: 2026-10-27 (Hari ini)
  const now = new Date('2026-10-27T12:00:00.000Z')

  // 4. GENERATE PENJUALAN KASIR (POS) SELAMA 5 MINGGU TERAKHIR
  // Target: ~1.500 - 2.200 pcs roti per minggu di seluruh cabang
  console.log('5. Membuat data riwayat penjualan kasir 35 hari terakhir (5 minggu)...')
  
  const salesToInsert = []
  const DAYS_BACK = 35

  let totalBreadSold = 0

  for (let dayOffset = DAYS_BACK; dayOffset >= 0; dayOffset--) {
    const currentDate = new Date(now.getTime() - dayOffset * 24 * 3600 * 1000)
    const dayOfWeek = currentDate.getUTCDay() // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    const y = currentDate.getFullYear()
    const m = String(currentDate.getMonth() + 1).padStart(2, '0')
    const d = String(currentDate.getDate()).padStart(2, '0')
    const datePrefix = `${y}${m}${d}`

    for (const store of stores) {
      // 8 - 14 transaksi per cabang di hari biasa, 14 - 22 di akhir pekan
      const receiptsCount = isWeekend ? randomInt(14, 22) : randomInt(8, 14)

      for (let r = 1; r <= receiptsCount; r++) {
        const receiptNo = `FB-${store.name.substring(7, 10).toUpperCase()}-${datePrefix}-${String(r).padStart(3, '0')}`
        const paymentMethod = randomChoice(['TUNAI', 'TUNAI', 'QRIS', 'QRIS', 'TRANSFER'])
        
        // Tiap transaksi beli 1 - 4 varian roti berbeda
        const itemCount = randomInt(1, 4)
        const chosenProducts = []
        for (let i = 0; i < itemCount; i++) {
          const p = randomChoice(products)
          if (!chosenProducts.some(cp => cp.id === p.id)) {
            chosenProducts.push(p)
          }
        }

        let receiptTotal = 0

        // Buat record penjualan per item dalam receipt
        for (const prod of chosenProducts) {
          // Jumlah roti per item: 1 - 4 pcs (kadang beli 6 - 10 untuk oleh-oleh)
          const qty = Math.random() < 0.15 ? randomInt(5, 10) : randomInt(1, 4)
          totalBreadSold += qty

          const discount = prod.discount || 0
          const unitPrice = Math.round(prod.price * (1 - discount / 100))
          const itemTotal = unitPrice * qty
          // Margin profit 25% - 30%
          const profit = Math.round(itemTotal * 0.28)

          receiptTotal += itemTotal

          // Waktu transaksi antara jam 07:00 - 20:00 WIB
          const hour = randomInt(7, 20)
          const minute = randomInt(0, 59)
          const saleTime = new Date(currentDate)
          saleTime.setHours(hour, minute, randomInt(0, 59), 0)

          salesToInsert.push({
            storeId: store.id,
            productId: prod.id,
            receiptNo,
            paymentMethod,
            cashPaid: paymentMethod === 'TUNAI' ? Math.ceil(receiptTotal / 10000) * 10000 : receiptTotal,
            change: paymentMethod === 'TUNAI' ? (Math.ceil(receiptTotal / 10000) * 10000) - receiptTotal : 0,
            quantitySold: qty,
            totalAmount: itemTotal,
            profitAmount: profit,
            saleDate: saleTime
          })
        }
      }
    }
  }

  // Batch insert sales agar cepat
  console.log(`   Menyimpan ${salesToInsert.length} data baris penjualan (total ${totalBreadSold} pcs roti terjual)...`)
  const BATCH_SIZE = 500
  for (let i = 0; i < salesToInsert.length; i += BATCH_SIZE) {
    const chunk = salesToInsert.slice(i, i + BATCH_SIZE)
    await prisma.sale.createMany({ data: chunk })
  }
  console.log(`   ✓ Selesai memasukkan ${salesToInsert.length} data penjualan kasir.`)

  // 5. GENERATE DATA PRE-ORDER / CUSTOM ORDER
  // Past Orders (4 minggu lalu s/d kemarin): Status COMPLETED
  // Today Orders (2026-10-27): Status READY / IN_PROCESS
  // Upcoming Orders (2026-10-28 s/d 2026-11-04): Status PENDING / IN_PROCESS (Target baking kitchen)
  console.log('6. Membuat data Pesanan Terjadwal (Pre-Order) untuk pengujian Lembar Dapur...')

  let totalPreOrderBreads = 0
  let totalOrdersCreated = 0

  // Rentang pesanan dari H-28 hingga H+7 (total 35 hari)
  for (let dayOffset = -28; dayOffset <= 7; dayOffset++) {
    const targetPickupDate = new Date(now.getTime() + dayOffset * 24 * 3600 * 1000)
    const y = targetPickupDate.getFullYear()
    const m = String(targetPickupDate.getMonth() + 1).padStart(2, '0')
    const d = String(targetPickupDate.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`

    // Tentukan jumlah pesanan pada tanggal ini
    // Hari ini (0), Besok (1), Lusa (2), dan Weekend mendapatkan order lebih banyak
    const dayOfWeek = targetPickupDate.getUTCDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    let ordersTodayCount = 1
    if (dayOffset >= 0 && dayOffset <= 4) {
      ordersTodayCount = randomInt(2, 4) // Hari-hari aktif dekat
    } else if (isWeekend) {
      ordersTodayCount = randomInt(2, 5)
    } else {
      ordersTodayCount = Math.random() < 0.65 ? randomInt(1, 3) : 0
    }

    for (let o = 1; o <= ordersTodayCount; o++) {
      const template = randomChoice(CUSTOMER_TEMPLATES)
      const store = randomChoice(stores)
      const orderNo = `ORD-${y}${m}${d}-${String(o).padStart(3, '0')}${randomInt(10, 99)}`

      // Tentukan status berdasarkan tanggal
      let status = 'COMPLETED'
      if (dayOffset < 0) {
        status = Math.random() < 0.05 ? 'CANCELLED' : 'COMPLETED'
      } else if (dayOffset === 0) {
        status = randomChoice(['READY', 'IN_PROCESS', 'COMPLETED'])
      } else if (dayOffset === 1) {
        // Besok: sebagian sudah diproses dapur, sebagian masih pending
        status = randomChoice(['IN_PROCESS', 'PENDING'])
      } else {
        // Lusa dan seterusnya: PENDING
        status = 'PENDING'
      }

      // Pilih 2 - 5 jenis roti dengan kuantitas borongan (15 - 80 pcs per varian)
      const itemsCount = randomInt(2, 5)
      const chosenProducts = []
      for (let i = 0; i < itemsCount; i++) {
        const p = randomChoice(products)
        if (!chosenProducts.some(cp => cp.id === p.id)) {
          chosenProducts.push(p)
        }
      }

      let orderTotal = 0
      const orderItems = []

      for (const prod of chosenProducts) {
        // Kuantitas borongan pesanan katering / hajatan
        const qty = randomChoice([15, 20, 25, 30, 40, 50, 60, 80, 100])
        totalPreOrderBreads += qty

        const discount = prod.discount || 0
        const unitPrice = Math.round(prod.price * (1 - discount / 100))
        const subtotal = unitPrice * qty
        orderTotal += subtotal

        orderItems.push({
          productId: prod.id,
          quantity: qty,
          price: unitPrice
        })
      }

      // Uang Muka (DP): 30% - 100%
      const dpPercentage = randomChoice([0.3, 0.5, 0.5, 0.7, 1.0])
      const depositPaid = Math.round((orderTotal * dpPercentage) / 10000) * 10000

      const createdDate = new Date(targetPickupDate.getTime() - randomInt(1, 4) * 24 * 3600 * 1000)

      await prisma.customOrder.create({
        data: {
          orderNo,
          customerName: template.name,
          phone: generatePhone(),
          pickupDate: new Date(`${dateStr}T00:00:00.000Z`),
          storeId: store.id,
          status,
          totalAmount: orderTotal,
          depositPaid: Math.min(orderTotal, depositPaid),
          notes: template.note,
          createdAt: createdDate,
          items: {
            create: orderItems
          }
        }
      })
      totalOrdersCreated++
    }
  }

  console.log(`   ✓ Dibuat ${totalOrdersCreated} pesanan pre-order (total akumulasi ${totalPreOrderBreads} pcs roti).`)

  // 6. BUAT PERMINTAAN RESTOK (RESTOCK REQUEST) UNTUK DIUJI ADMIN
  console.log('7. Membuat data Permintaan Restok dari Cabang ke Pusat...')
  
  const semawungStore = stores.find(s => s.name.includes('Semawung')) || stores[0]
  const berjanStore = stores.find(s => s.name.includes('Berjan')) || stores[1]

  // Permintaan 1: PENDING dari Semawung
  const topProductsList = products.slice(0, 4)
  const batch1 = `REQ-SMW-20261027-001`
  for (const prod of topProductsList) {
    await prisma.restockRequest.create({
      data: {
        batchNo: batch1,
        storeId: semawungStore.id,
        productId: prod.id,
        quantity: randomChoice([30, 40, 50]),
        status: 'PENDING',
        notes: 'Stok roti menipis menjelang pesanan akhir pekan',
        requestedBy: 'Kasir Semawung'
      }
    })
  }

  // Permintaan 2: PENDING dari Berjan
  const batch2 = `REQ-BRJ-20261027-002`
  for (const prod of products.slice(4, 7)) {
    await prisma.restockRequest.create({
      data: {
        batchNo: batch2,
        storeId: berjanStore.id,
        productId: prod.id,
        quantity: randomChoice([20, 25, 30]),
        status: 'PENDING',
        notes: 'Permintaan tambahan varian bolen dan brownies',
        requestedBy: 'Kasir Berjan'
      }
    })
  }

  // Permintaan 3: APPROVED historis minggu lalu
  const batch3 = `REQ-PMW-20261020-003`
  for (const prod of products.slice(0, 3)) {
    await prisma.restockRequest.create({
      data: {
        batchNo: batch3,
        storeId: stores[0].id,
        productId: prod.id,
        quantity: 50,
        status: 'APPROVED',
        notes: 'Restok rutin awal pekan',
        requestedBy: 'Kasir ' + stores[0].name,
        approvedBy: 'familybakery',
        createdAt: new Date('2026-10-20T08:00:00.000Z')
      }
    })
  }
  console.log('   ✓ Dibuat 3 batch permintaan restok (2 Menunggu Persetujuan, 1 Disetujui).')

  // 7. BUAT AUDIT LOG AWAL
  console.log('8. Membuat audit log simulasi...')
  await prisma.auditLog.createMany({
    data: [
      {
        username: 'familybakery',
        action: 'SEED_TRAINING_DATA',
        entityType: 'System',
        entityName: 'High Volume Data Simulation',
        detail: JSON.stringify({ totalSales: salesToInsert.length, totalPreOrders: totalOrdersCreated }),
        createdAt: new Date()
      },
      {
        username: 'semawung',
        action: 'SUBMIT_RESTOCK_REQUEST',
        entityType: 'RestockRequest',
        entityName: batch1,
        storeId: semawungStore.id,
        detail: JSON.stringify({ batchNo: batch1, totalItems: 4 }),
        createdAt: new Date('2026-10-27T08:30:00.000Z')
      }
    ]
  })

  // REKAP HASIL
  const weeklyAverage = Math.round((totalBreadSold + totalPreOrderBreads) / 5)

  console.log('\n=================================================================')
  console.log('🎉 SEEDING HIGH-VOLUME SELESAI DENGAN SUKSES! 🎉')
  console.log('=================================================================')
  console.log(`📊 Statistik Data Terkini:`)
  console.log(`   • Roti Terjual di Kasir (Sale)    : ${totalBreadSold.toLocaleString('id-ID')} pcs (${salesToInsert.length} transaksi)`)
  console.log(`   • Roti Dipesan Pre-Order (Order) : ${totalPreOrderBreads.toLocaleString('id-ID')} pcs (${totalOrdersCreated} pesanan)`)
  console.log(`   • TOTAL AKUMULASI ROTI DIPROSES  : ${(totalBreadSold + totalPreOrderBreads).toLocaleString('id-ID')} pcs`)
  console.log(`   • RATA-RATA VOLUME MINGGUAN      : ~${weeklyAverage.toLocaleString('id-ID')} pcs roti / minggu (Sesuai target 1000 - 3000)`)
  console.log(`   • Permintaan Restok Aktif        : 2 batch PENDING (Menunggu Super Admin)`)
  console.log(`   • Jadwal Dapur Besok (28/10)     : Siap dilihat di menu 'Pesanan & Jadwal Dapur'`)
  console.log('=================================================================\n')
}

main()
  .catch(e => {
    console.error('Error saat seeding high-volume:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
