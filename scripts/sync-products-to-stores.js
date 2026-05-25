const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function syncProductsToAllStores() {
  console.log('Fetching master products and stores...')
  const products = await prisma.product.findMany({ select: { id: true } })
  const stores = await prisma.store.findMany({ select: { id: true } })

  console.log(`Found ${products.length} products and ${stores.length} stores.`)

  const dataToInsert = []

  for (const store of stores) {
    for (const product of products) {
      dataToInsert.push({
        storeId: store.id,
        productId: product.id,
        stockQuantity: 0 // Initial stock is 0
      })
    }
  }

  if (dataToInsert.length === 0) {
    console.log('No data to sync.')
    return
  }

  console.log(`Attempting to insert/sync ${dataToInsert.length} total StoreProduct combinations...`)

  // skipDuplicates ensures that if a store already has the product, its stock is NOT reset to 0
  const result = await prisma.storeProduct.createMany({
    data: dataToInsert,
    skipDuplicates: true
  })

  console.log(`Success! Berhasil menambahkan ${result.count} menu baru ke seluruh cabang (menu yang sudah ada sebelumnya dilewati agar stok tidak ter-reset).`)
}

syncProductsToAllStores().catch(console.error).finally(() => prisma.$disconnect())
