import { Resend } from 'resend'
import prisma from '@/lib/db'
import { NextResponse } from 'next/server'
import { generateLowStockEmailHTML } from '@/lib/email-templates'
import crypto from 'crypto'

const THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD || '10')

export async function GET(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key')
  
  // 1. Verifikasi authorization header (Cron Secret) dengan perbandingan konstan waktu (Timing-safe)
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[Security Error] CRON_SECRET is not configured.')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  const expectedToken = `Bearer ${cronSecret}`
  const actualToken = authHeader || ''
  
  let isAuthorized = false
  if (expectedToken.length === actualToken.length) {
    isAuthorized = crypto.timingSafeEqual(
      Buffer.from(actualToken),
      Buffer.from(expectedToken)
    )
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Ambil produk yang stoknya <= THRESHOLD
  const lowStockStoreProducts = await prisma.storeProduct.findMany({
    where: { stockQuantity: { lte: THRESHOLD } },
    include: { 
      store: { select: { name: true } },
      product: { select: { name: true } }
    },
    orderBy: { stockQuantity: 'asc' },
  })
  
  const lowStockProducts = lowStockStoreProducts.map(sp => ({
    name: sp.product.name,
    stockQuantity: sp.stockQuantity,
    store: sp.store
  }))

  if (lowStockProducts.length === 0) {
    return NextResponse.json({ message: 'Semua stok aman, tidak ada notifikasi yang dikirim.' })
  }

  const notificationEmail = process.env.NOTIFICATION_EMAIL
  if (!notificationEmail || !process.env.RESEND_API_KEY) {
    console.error('Missing email configuration (NOTIFICATION_EMAIL or RESEND_API_KEY)')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  // 3. Kirim email melalui Resend
  try {
    const data = await resend.emails.send({
      from: 'Family Bakery <onboarding@resend.dev>', // onboarding@resend.dev untuk testing sebelum domain diverifikasi
      to: notificationEmail,
      subject: `⚠️ Peringatan: ${lowStockProducts.length} Produk Hampir Habis`,
      html: generateLowStockEmailHTML(lowStockProducts),
    })

    return NextResponse.json({
      success: true,
      sentCount: lowStockProducts.length,
      data,
    })
  } catch (error: any) {
    console.error('Failed to send email:', error)
    return NextResponse.json({ error: 'Failed to send email', details: error.message }, { status: 500 })
  }
}
