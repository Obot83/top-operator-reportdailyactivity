import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const filePath = req.nextUrl.searchParams.get('path');
    if (!filePath) {
      return NextResponse.json({ success: false, error: 'Parameter path wajib diisi' }, { status: 400 });
    }

    const sanitizedPath = filePath.replace(/\.\./g, '');

    // 1. Cek penyimpanan lokal jika ada file di folder public/uploads
    const localCandidates = [
      path.join(process.cwd(), 'public', sanitizedPath),
      path.join(process.cwd(), 'uploads', sanitizedPath),
      path.join(process.cwd(), '..', '..', sanitizedPath),
    ];

    for (const candidate of localCandidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const fileBuffer = fs.readFileSync(candidate);
        const ext = path.extname(candidate).toLowerCase();
        const contentType =
          ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : ext === '.png'
            ? 'image/png'
            : ext === '.webp'
            ? 'image/webp'
            : ext === '.pdf'
            ? 'application/pdf'
            : 'application/octet-stream';

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    }

    // 2. Jika STORAGE_PUBLIC_URL diset di .env dan bukan placeholder xxxxx, redirect ke CDN
    const storageUrl = process.env.STORAGE_PUBLIC_URL;
    if (storageUrl && !storageUrl.includes('xxxxx')) {
      const fullRemoteUrl = `${storageUrl.replace(/\/$/, '')}/${sanitizedPath.replace(/^\//, '')}`;
      return NextResponse.redirect(fullRemoteUrl);
    }

    // 3. Fallback jika file fisik belum ada di storage publik
    return NextResponse.json(
      {
        success: false,
        error: 'File belum tersedia di storage lokal atau STORAGE_PUBLIC_URL belum diarahkan ke CDN aktif',
        path: filePath,
        configuredStorageUrl: storageUrl || null,
        note: 'Untuk menghubungkan file fisik, perbarui STORAGE_PUBLIC_URL di file .env dengan endpoint CDN / S3 Kospinus yang valid.',
      },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
