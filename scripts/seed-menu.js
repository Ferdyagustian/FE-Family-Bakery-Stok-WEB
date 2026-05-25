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

  let totalProducts = 0
  let totalLinks = 0

  for (const menu of menus) {
    // Upsert the master product
    let product = await prisma.product.findFirst({ where: { name: menu.name } })
    if (!product) {
       product = await prisma.product.create({
         data: {
           name: menu.name,
           price: menu.price,
           description: `Kategori: ${menu.desc}`,
           discount: 0,
         }
       })
       totalProducts++
    }

    // Link it to all stores
    for (const store of stores) {
      const existingLink = await prisma.storeProduct.findUnique({
         where: { storeId_productId: { storeId: store.id, productId: product.id } }
      })
      if (!existingLink) {
         await prisma.storeProduct.create({
           data: {
             storeId: store.id,
             productId: product.id,
             stockQuantity: 10 // Beri stok awal dummy
           }
         })
         totalLinks++
      }
    }
  }

  console.log(`\nSelesai! Berhasil menambahkan ${totalProducts} produk master baru dan ${totalLinks} tautan StoreProduct.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
