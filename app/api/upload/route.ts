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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Bikin nama file unik
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${crypto.randomUUID()}.${fileExtension}`;
    
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
