const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function deduplicate() {
  console.log('Starting deduplication...')
  const products = await prisma.product.findMany()
  
  const groups = {}
  products.forEach(p => {
    const key = p.name.trim().toLowerCase()
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  })

  let duplicateCount = 0

  for (const [name, items] of Object.entries(groups)) {
    if (items.length > 1) {
      console.log(`Found ${items.length} duplicates for "${name}"`)
      const master = items[0] // keep first
      const duplicates = items.slice(1)

      for (const dup of duplicates) {
        console.log(`  Merging ${dup.id} into master ${master.id}`)
        
        // Find StoreProducts for this duplicate
        const storeProducts = await prisma.storeProduct.findMany({ where: { productId: dup.id } })
        
        for (const sp of storeProducts) {
          // Check if master already has this store
          const existingMasterSp = await prisma.storeProduct.findUnique({
            where: { storeId_productId: { storeId: sp.storeId, productId: master.id } }
          })

          if (existingMasterSp) {
            // Merge stock
            await prisma.storeProduct.update({
              where: { id: existingMasterSp.id },
              data: { stockQuantity: { increment: sp.stockQuantity } }
            })
            // Delete duplicate store product
            await prisma.storeProduct.delete({ where: { id: sp.id } })
          } else {
            // Update to point to master
            await prisma.storeProduct.update({
              where: { id: sp.id },
              data: { productId: master.id }
            })
          }
        }

        // Update sales to point to master
        await prisma.sale.updateMany({
          where: { productId: dup.id },
          data: { productId: master.id }
        })

        // Finally delete the duplicate product
        await prisma.product.delete({ where: { id: dup.id } })
        duplicateCount++
      }
    }
  }

  console.log(`Deduplication finished! Removed ${duplicateCount} duplicate products.`)
}

deduplicate().catch(console.error).finally(() => prisma.$disconnect())
