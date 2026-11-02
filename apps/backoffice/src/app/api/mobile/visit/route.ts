// top-operator/apps/backoffice/src/app/api/mobile/visit/route.ts
// Endpoint menerima multipart/form-data dari mobile app

import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/shared/types';
import { uploadPhotoToStorage } from '@/lib/storage';

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const formData = await req.formData();

    const debiturCif    = formData.get('debiturCif') as string;
    const accountNumber = formData.get('accountNumber') as string;
    const latitude      = parseFloat(formData.get('latitude') as string);
    const longitude     = parseFloat(formData.get('longitude') as string);
    const gpsAccuracy   = parseFloat(formData.get('gpsAccuracy') as string);
    const visitStatus   = formData.get('visitStatus') as string;
    const reasonCategory = formData.get('reasonCategory') as string | null;
    const reasonDetail  = formData.get('reasonDetail') as string | null;
    const fieldNotes    = formData.get('fieldNotes') as string | null;
    const hasPTP        = formData.get('hasPTP') === 'true';
    const ptpTargetDate = formData.get('ptpTargetDate') as string | null;
    const ptpNominal    = formData.get('ptpNominal') as string | null;
    const officerId     = req.headers.get('x-user-id') ?? '';

    // Validasi minimal
    if (!debiturCif || !accountNumber || !visitStatus || !officerId) {
      return NextResponse.json({ success: false, error: 'Field wajib tidak lengkap' }, { status: 400 });
    }

    const loanAccount = await prisma.loanAccount.findUnique({
      where: { accountNumber },
      select: { id: true },
    });
    if (!loanAccount) {
      return NextResponse.json({ success: false, error: 'Rekening tidak ditemukan' }, { status: 404 });
    }

    // Upload foto-foto
    const photoUrls: string[] = [];
    let photoIndex = 0;
    while (formData.has(`photo_${photoIndex}`)) {
      const file = formData.get(`photo_${photoIndex}`) as File;
      const url = await uploadPhotoToStorage(file, `visit/${debiturCif}/${Date.now()}_${photoIndex}.jpg`);
      photoUrls.push(url);
      photoIndex++;
    }

    // Buat PTP jika ada
    let ptpId: string | undefined;
    if (hasPTP && ptpTargetDate && ptpNominal) {
      const ptp = await prisma.pTPTracking.create({
        data: {
          accountNumber,
          loanAccountId: loanAccount.id,
          officerId,
          targetDate: new Date(ptpTargetDate),
          nominalKomitmen: parseFloat(ptpNominal),
          status: 'PENDING',
        },
      });
      ptpId = ptp.id;
    }

    // Buat Visit Log
    const visitLog = await prisma.debiturVisitLog.create({
      data: {
        loanAccountId: loanAccount.id,
        debiturCif,
        officerId,
        latitude,
        longitude,
        gpsAccuracy: isNaN(gpsAccuracy) ? undefined : gpsAccuracy,
        visitStatus: visitStatus as any,
        reasonCategory: reasonCategory || undefined,
        reasonDetail: reasonDetail || undefined,
        fieldNotes: fieldNotes || undefined,
        photoUrls,
        hasPTP,
        ptpTrackingId: ptpId,
      },
    });

    // Update geo-lokasi default debitur jika belum diset
    const debitur = await prisma.debitur.findUnique({
      where: { cif: debiturCif },
      select: { defaultLatitude: true },
    });
    if (!debitur?.defaultLatitude) {
      await prisma.debitur.update({
        where: { cif: debiturCif },
        data: { defaultLatitude: latitude, defaultLongitude: longitude },
      });
    }

    // Update status collection task jika ada
    const periodeTagih = getISOWeekString(new Date());
    await prisma.collectionTask.updateMany({
      where: { accountNumber, periodeTagih },
      data: {
        statusBayar: hasPTP ? 'JANJI_BAYAR' : 'SUDAH_DIKUNJUNGI',
        tanggalKunjungan: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: { visitLogId: visitLog.id, ptpId },
      message: 'Kunjungan berhasil dicatat',
    }, { status: 201 });
  } catch (error) {
    console.error('[Mobile Visit Submit]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menyimpan data kunjungan' },
      { status: 500 }
    );
  }
}

function getISOWeekString(date: Date): string {
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((date.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7
  );
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
