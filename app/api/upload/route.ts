import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: "Forbidden: Only admins can upload files" }, { status: 403 });
    }

    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, error: "Invalid file type. Only JPG, PNG, and WebP are allowed." }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: "File size exceeds 5MB limit." }, { status: 400 });
    }

    const extensionMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };
    const safeExtension = extensionMap[file.type];
    if (!safeExtension) {
      return NextResponse.json({ success: false, error: "Tipe file tidak didukung." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Verifikasi Magic Bytes (Header biner sebenarnya dari file gambar)
    let isMagicValid = false;
    if (buffer.length >= 12) {
      if (file.type === 'image/jpeg' && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        isMagicValid = true;
      } else if (file.type === 'image/png' && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        isMagicValid = true;
      } else if (file.type === 'image/webp' && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
        isMagicValid = true;
      }
    }

    if (!isMagicValid) {
      return NextResponse.json({ success: false, error: "Konten file tidak valid atau bukan gambar asli." }, { status: 400 });
    }

    // Nama file unik dengan ekstensi tervalidasi
    const fileName = `${crypto.randomUUID()}.${safeExtension}`;
    
    // Upload ke Supabase Storage bucket 'products'
    const { error: uploadError } = await supabase
      .storage
      .from('products')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error("Supabase storage error:", uploadError);
      
      // Deteksi error jika env vars belum diset
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        return NextResponse.json({ success: false, error: "Sistem belum dikonfigurasi untuk Storage (URL/Key kosong)" }, { status: 500 });
      }
      
      return NextResponse.json({ success: false, error: `Gagal mengupload ke Storage: ${uploadError.message}` }, { status: 500 });
    }

    // Dapatkan Public URL
    const { data: publicUrlData } = supabase
      .storage
      .from('products')
      .getPublicUrl(fileName);

    return NextResponse.json({ success: true, url: publicUrlData.publicUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
