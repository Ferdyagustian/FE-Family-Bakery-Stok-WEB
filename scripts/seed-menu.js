const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const menus = [
  // Bolu & Lapis
  { name: 'Lapis Ubi Ungu Mix Ukuran 23x13 cm', price: 30000, desc: 'Bolu & Lapis' },
  { name: 'Lapis Talas Pandan Mix Ukuran 23x13 cm', price: 30000, desc: 'Bolu & Lapis' },
  { name: 'Talas Panggang Toping Mix', price: 24000, desc: 'Bolu & Lapis' },
  { name: 'Lapis Ubi Ungu Mix Ukuran 20x20 cm', price: 36000, desc: 'Bolu & Lapis' },
  { name: 'Lapis Talas Pandan Mix Ukuran 20x20 cm', price: 36000, desc: 'Bolu & Lapis' },
  { name: 'Bolu Surabaya Ukuran 23x13 cm', price: 30000, desc: 'Bolu & Lapis' },
  { name: 'Bolu Gulung', price: 21000, desc: 'Bolu & Lapis' },
  { name: 'Talas Panggang Toping Messes', price: 24000, desc: 'Bolu & Lapis' },
  { name: 'Full Ubi Ungu Toping Mix', price: 25000, desc: 'Bolu & Lapis' },
  { name: 'Full Talas Toping Mix', price: 25000, desc: 'Bolu & Lapis' },
  { name: 'Bolu Variasi Bulat Toping Mix', price: 26000, desc: 'Bolu & Lapis' },
  { name: 'Bolu Surabaya', price: 30000, desc: 'Bolu & Lapis' },
  { name: 'Bolu Pisang', price: 26000, desc: 'Bolu & Lapis' },
  { name: 'Bolu Marmer', price: 25000, desc: 'Bolu & Lapis' },
  { name: 'Lapis Surabaya Ukuran 20x20 cm', price: 36000, desc: 'Bolu & Lapis' },
  { name: 'Variasi Ukuran 23x13 cm', price: 23000, desc: 'Bolu & Lapis' },
  { name: 'Variasi Toping Mix Ukuran 20x20', price: 25000, desc: 'Bolu & Lapis' },
  { name: 'Bolu Dua Rasa', price: 25000, desc: 'Bolu & Lapis' },
  { name: 'Lapis Legit Kecil', price: 24000, desc: 'Bolu & Lapis' },
  { name: 'Lapis Legit Besar', price: 33000, desc: 'Bolu & Lapis' },
  
  // Brownies
  { name: 'Brownies Panggang Toping Messes', price: 24000, desc: 'Brownies' },
  { name: 'Brownies Kukus Toping Mix', price: 25000, desc: 'Brownies' },
  { name: 'Brownies Panggang Toping Mix', price: 24000, desc: 'Brownies' },
  { name: 'Brownies Panggang Toping Mentah Messes', price: 25000, desc: 'Brownies' },
  { name: 'Brownies Panggang Toping Mentah Keju', price: 26000, desc: 'Brownies' },
  { name: 'Brownies Panggang Toping Mix Mentah', price: 25000, desc: 'Brownies' },
  { name: 'Brownies Lumer Ukuran 23x13 cm', price: 27000, desc: 'Brownies' },
  { name: 'Brownies Keju Lumer Ukuran 23x13 cm', price: 25000, desc: 'Brownies' },

  // Roti, Bolen, Aneka Panggang, dan Donat
  { name: 'Roti Sobek Ukuran 23x13 cm', price: 15000, desc: 'Roti, Bolen, Aneka Panggang, dan Donat' },
  { name: 'Bolen / Bolen Pisang', price: 24000, desc: 'Roti, Bolen, Aneka Panggang, dan Donat' },
  { name: 'Ketan Hitam Kukus / Panggang (Uk. 23x13 cm)', price: 33000, desc: 'Roti, Bolen, Aneka Panggang, dan Donat' },
  { name: 'Crumble Ukuran 23x13 cm', price: 22000, desc: 'Roti, Bolen, Aneka Panggang, dan Donat' },
  { name: 'Ubi Panggang Toping Keju Ukuran 23x13 cm', price: 24000, desc: 'Roti, Bolen, Aneka Panggang, dan Donat' },
  { name: 'Donat Isi 4', price: 15000, desc: 'Roti, Bolen, Aneka Panggang, dan Donat' },
  { name: 'Donat Harga Khusus / Varian Lain', price: 19000, desc: 'Roti, Bolen, Aneka Panggang, dan Donat' },
  { name: 'Donat Isi 12', price: 35000, desc: 'Roti, Bolen, Aneka Panggang, dan Donat' },

  // Kue Tart
  { name: 'Tart Ukuran 14 cm', price: 75000, desc: 'Kue Tart' },
  { name: 'Tart Ukuran 16 cm', price: 85000, desc: 'Kue Tart' },
  { name: 'Tart Ukuran 18 cm', price: 95000, desc: 'Kue Tart' },
  { name: 'Tart Ukuran 20 cm', price: 105000, desc: 'Kue Tart' },
  { name: 'Tart Ukuran 22 cm', price: 120000, desc: 'Kue Tart' },
  { name: 'Tart Karakter Ukuran 20 cm', price: 120000, desc: 'Kue Tart' },
]

async function main() {
  const stores = await prisma.store.findMany()
  if (stores.length === 0) {
    console.log('Tidak ada cabang (Store) yang ditemukan. Buat cabang terlebih dahulu.')
    return
  }

  let totalInserted = 0
  let totalSkipped = 0

  for (const store of stores) {
    console.log(`\nMemproses cabang: ${store.name} (${store.id})`)
    
    // Ambil semua nama produk yang sudah ada di cabang ini agar tidak duplikat
    const existingProducts = await prisma.product.findMany({
      where: { storeId: store.id },
      select: { name: true }
    })
    const existingNames = new Set(existingProducts.map(p => p.name.toLowerCase().trim()))

    for (const menu of menus) {
      if (existingNames.has(menu.name.toLowerCase().trim())) {
        totalSkipped++
        continue
      }

      await prisma.product.create({
        data: {
          storeId: store.id,
          name: menu.name,
          price: menu.price,
          description: `Kategori: ${menu.desc}`,
          stockQuantity: 0,
          discount: 0,
        }
      })
      totalInserted++
    }
  }

  console.log(`\nSelesai! Berhasil menambahkan ${totalInserted} produk baru. Melewati ${totalSkipped} produk yang sudah ada.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
