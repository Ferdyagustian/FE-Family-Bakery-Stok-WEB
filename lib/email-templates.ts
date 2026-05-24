export function generateLowStockEmailHTML(products: any[]) {
  const rows = products
    .map(
      (p) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${p.store.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${p.name}</strong></td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; color: ${
        p.stockQuantity === 0 ? '#dc2626' : '#d97706'
      }; font-weight: bold;">
        ${p.stockQuantity === 0 ? 'Habis (0)' : `Sisa ${p.stockQuantity} unit`}
      </td>
    </tr>
  `
    )
    .join('')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background-color: #fef3c7; border: 1px solid #fde68a; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h2 style="color: #92400e; margin: 0;">⚠️ Peringatan Stok Hampir Habis</h2>
        <p style="color: #b45309; margin: 5px 0 0 0;">
          Ada <strong>${products.length} produk</strong> yang perlu segera di-restock.
        </p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Cabang</th>
            <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Produk</th>
            <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Stok Saat Ini</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="margin-top: 30px; text-align: center;">
        <a href="${appUrl}/stores" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Buka Dashboard
        </a>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #6b7280; text-align: center;">
        Ini adalah pesan otomatis dari sistem Family Bakery. Harap jangan membalas email ini.
      </div>
    </div>
  `
}
