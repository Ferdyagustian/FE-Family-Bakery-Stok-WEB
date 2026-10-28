const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // Ambil password dari environment variable — JANGAN hardcode di sini!
  const password = process.env.ADMIN_PASSWORD
  const username = process.env.ADMIN_USERNAME || 'familybakery'
  const adminName = process.env.ADMIN_NAME || 'Super Admin'

  if (!password) {
    console.error('ERROR: Environment variable ADMIN_PASSWORD tidak ditemukan.')
    console.error('')
    console.error('Cara penggunaan yang benar:')
    console.error('  ADMIN_PASSWORD=passwordbaru node scripts/update-password.js')
    console.error('')
    console.error('Opsional:')
    console.error('  ADMIN_USERNAME=namauser ADMIN_NAME="Nama Admin" ADMIN_PASSWORD=pass node scripts/update-password.js')
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('ERROR: Password terlalu pendek. Minimal 8 karakter.')
    process.exit(1)
  }

  // Hash password dengan salt rounds 12 (lebih aman dari default 10)
  const passwordHash = await bcrypt.hash(password, 12)

  const admin = await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      role: 'ADMIN',
    },
    create: {
      username,
      name: adminName,
      passwordHash,
      role: 'ADMIN',
    },
  })

  console.log('[OK] Akun admin berhasil dikonfigurasi:', admin.username)
  console.log('   Role:', admin.role)
  console.log('   ID:', admin.id)
}

main()
  .catch((e) => {
    console.error('[ERROR] Gagal:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
