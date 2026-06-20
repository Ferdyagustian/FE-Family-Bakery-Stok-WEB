'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { assertStoreAccess } from '@/lib/actions/auth-guard'
import { ENV } from '@/lib/env'

const API_BASE = ENV.API_BASE

async function getSessionUser() {
  const session = await getSession()
  return session?.user ?? null
}

export async function createMasterProduct(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const imageUrl = (formData.get('imageUrl') as string)?.trim() || null
  const price = parseFloat(formData.get('price') as string)

  if (!name || isNaN(price) || price <= 0) {
    return { error: 'Data tidak lengkap atau tidak valid' }
  }

  try {
    const res = await fetch(`${API_BASE}/products/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, imageUrl, price })
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => null)
      return { error: errorData?.detail || 'Gagal menambah produk master' }
    }
    const product = await res.json()

    revalidatePath('/products')
    return { success: true, product }
  } catch (error) {
    return { error: 'Gagal menambah produk master' }
  }
}

export async function addStoreProduct(formData: FormData) {
  const storeId = formData.get('storeId') as string
  const productId = formData.get('productId') as string
  const stockQuantity = parseInt(formData.get('stockQuantity') as string)

  try {
    await assertStoreAccess(storeId);
  } catch (err) {
    return { error: 'Unauthorized or Forbidden' };
  }

  if (!storeId || !productId || isNaN(stockQuantity) || stockQuantity < 0) {
    return { error: 'Data tidak lengkap atau tidak valid' }
  }

  try {
    const res = await fetch(`${API_BASE}/products/store-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, productId, stockQuantity })
    })

    if (!res.ok) {
      return { error: 'Gagal menambah produk ke cabang' }
    }

    revalidatePath(`/stores/${storeId}`)
    return { success: true }
  } catch (error) {
    return { error: 'Gagal menambah produk ke cabang' }
  }
}

export async function updateProduct(formData: FormData) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const productId = formData.get('productId') as string
  const storeId = formData.get('storeId') as string | null
  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const imageUrl = (formData.get('imageUrl') as string)?.trim() || null
  const price = parseFloat(formData.get('price') as string)
  const discount = parseInt(formData.get('discount') as string) || 0

  if (!productId || !name || isNaN(price) || price <= 0) {
    return { error: 'Data tidak lengkap atau tidak valid' }
  }
  if (discount < 0 || discount > 100) {
    return { error: 'Diskon harus antara 0 dan 100 persen' }
  }

  try {
    const res = await fetch(`${API_BASE}/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, imageUrl, price, discount })
    })

    if (!res.ok) {
      return { error: 'Gagal memperbarui produk' }
    }

    if (storeId) revalidatePath(`/stores/${storeId}`)
    revalidatePath('/products')
    revalidatePath('/', 'layout')
    
    return { success: true }
  } catch (error: any) {
    return { error: 'Gagal memperbarui produk' }
  }
}

export async function recordSale(productId: string, storeId: string, quantity: number) {
  try {
    await assertStoreAccess(storeId);
  } catch (err) {
    return { error: 'Unauthorized or Forbidden' };
  }

  if (!productId || !storeId || quantity <= 0 || !Number.isInteger(quantity)) {
    return { error: 'Data penjualan tidak valid' }
  }

  try {
    const res = await fetch(`${API_BASE}/products/${productId}/record-sale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, quantity })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => null)
      return { error: err?.detail || 'Gagal mencatat penjualan' }
    }

    revalidatePath(`/stores/${storeId}`)
    return { success: true }
  } catch (error: any) {
    return { error: 'Gagal mencatat penjualan' }
  }
}

export async function deleteMasterProduct(productId: string) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }

  try {
    const res = await fetch(`${API_BASE}/products/${productId}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      return { error: 'Gagal menghapus produk master' }
    }

    revalidatePath('/products')
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    return { error: 'Gagal menghapus produk master' }
  }
}

export async function bulkRestockProducts(
  restocks: { productId: string; qty: number; name?: string }[],
  storeId: string
) {
  try {
    await assertStoreAccess(storeId);
  } catch (err) {
    return { error: 'Unauthorized or Forbidden' };
  }

  const validRestocks = restocks.filter((r) => Number.isInteger(r.qty) && r.qty > 0)
  if (validRestocks.length === 0) return { error: 'Tidak ada produk yang diisi jumlah restoknya' }

  try {
    const res = await fetch(`${API_BASE}/products/bulk-restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, restocks: validRestocks })
    })

    if (!res.ok) {
      return { error: 'Gagal menyimpan restok. Silakan coba lagi.' }
    }

    revalidatePath(`/stores/${storeId}`)
    revalidatePath(`/stores/${storeId}/restock`)
    return { success: true, count: validRestocks.length }
  } catch (error) {
    return { error: 'Gagal menyimpan restok. Silakan coba lagi.' }
  }
}

export async function recordBulkSales(
  items: { productId: string; quantity: number }[],
  storeId: string
) {
  try {
    await assertStoreAccess(storeId);
  } catch (err) {
    return { error: 'Unauthorized or Forbidden' };
  }

  const validItems = items.filter((item) => item.productId && Number.isInteger(item.quantity) && item.quantity > 0)
  if (validItems.length === 0) return { error: 'Keranjang kosong atau data tidak valid' }

  try {
    const res = await fetch(`${API_BASE}/products/bulk-sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, items: validItems })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => null)
      return { error: err?.detail || 'Gagal memproses transaksi kasir' }
    }

    revalidatePath(`/stores/${storeId}`)
    return { success: true }
  } catch (error: any) {
    return { error: 'Gagal memproses transaksi kasir' }
  }
}

export async function updateBulkPrices(items: { id: string, price: number }[]) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }

  const validItems = items.filter(i => i.id && !isNaN(i.price) && i.price >= 0)
  if (validItems.length === 0) return { error: 'Tidak ada data valid untuk disimpan' }

  try {
    const res = await fetch(`${API_BASE}/products/bulk-prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: validItems })
    })

    if (!res.ok) return { error: 'Gagal menyimpan perubahan harga secara massal' }

    revalidatePath('/products')
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    return { error: 'Gagal menyimpan perubahan harga secara massal' }
  }
}

export async function adjustAllPrices(type: 'increase' | 'decrease', amountType: 'nominal' | 'percent', value: number) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { error: 'Unauthorized' }
  if (isNaN(value) || value <= 0) return { error: 'Nilai harus lebih dari 0' }

  try {
    const res = await fetch(`${API_BASE}/products/adjust-all-prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, amountType, value })
    })

    if (!res.ok) return { error: 'Gagal menyesuaikan harga secara massal' }

    revalidatePath('/products')
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    return { error: 'Gagal menyesuaikan harga secara massal' }
  }
}