import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { assertStoreAccess } from "@/lib/actions/auth-guard";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId") || undefined;

    // ── Auth Guard ──────────────────────────────
    if (storeId) {
      try {
        await assertStoreAccess(storeId);
      } catch (err) {
        return NextResponse.json({ error: "Forbidden: Access denied to this store" }, { status: 403 });
      }
    } else {
      const session = await getSession();
      if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized or requires specific store ID" }, { status: 401 });
      }
    }

    const type = searchParams.get("type"); // "sales" | "stock"
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!type || !["sales", "stock"].includes(type)) {
      return NextResponse.json(
        { error: "Parameter 'type' harus 'sales' atau 'stock'" },
        { status: 400 }
      );
    }

    // ── Export: Penjualan ────────────────────────
    if (type === "sales") {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
      }

      const sales = await prisma.sale.findMany({
        where: {
          ...(storeId ? { storeId } : {}),
          ...(Object.keys(dateFilter).length > 0
            ? { saleDate: dateFilter }
            : {}),
        },
        include: {
          store: { select: { name: true } },
          product: { select: { name: true, price: true } },
        },
        orderBy: { saleDate: "desc" },
      });

      const rows = sales.map((s: any, i: number) => ({
        no: i + 1,
        tanggal: s.saleDate.toISOString(),
        cabang: s.store.name,
        produk: s.product.name,
        jumlah: s.quantitySold,
        hargaSatuan: s.product.price,
        total: s.totalAmount,
      }));

      return NextResponse.json({ data: rows });
    }

    // ── Export: Stok Produk ──────────────────────
    if (type === "stock") {
      const products = await prisma.storeProduct.findMany({
        where: storeId ? { storeId } : {},
        include: { product: true, store: true },
        orderBy: [{ store: { name: 'asc' } }, { product: { name: 'asc' } }],
      });

      const rows = products.map((p, i) => ({
        "No.": i + 1,
        Cabang: p.store.name,
        Produk: p.product.name,
        Deskripsi: p.product.description || "-",
        Harga: `Rp ${p.product.price.toLocaleString("id-ID")}`,
        "Diskon (%)": p.product.discount,
        Stok: p.stockQuantity,
        Status:
          p.stockQuantity === 0
            ? "Habis"
            : p.stockQuantity < 10
            ? "Menipis"
            : "Aman",
      }));

      return NextResponse.json({ data: rows });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Export API error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data" },
      { status: 500 }
    );
  }
}
