import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const officers = await prisma.user.findMany({
      where: { role: 'AO', isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: officers });
  } catch (error) {
    console.error('[AO Officers]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil daftar AO' },
      { status: 500 },
    );
  }
}
