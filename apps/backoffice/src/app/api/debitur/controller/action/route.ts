import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import type { ControllerActionPayload, ApiResponse } from '@/shared/types';
import { generateSPNumber } from '@/lib/helpers';

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const body: ControllerActionPayload = await req.json();
    // Ambil user dari session (middleware auth)
    const userId = req.headers.get('x-user-id') ?? '';

    switch (body.action) {
      case 'GENERATE_SP': {
        const { accountNumber, spLevel, tanggalRespons, catatan } = body;

        const loanAccount = await prisma.loanAccount.findUnique({ where: { accountNumber } });
        if (!loanAccount) {
          return NextResponse.json({ success: false, error: 'Rekening tidak ditemukan' }, { status: 404 });
        }

        // Cek SP sebelumnya (harus berurutan)
        const existingSP = await prisma.suratPeringatan.findMany({
          where: { accountNumber },
          orderBy: { tanggalTerbit: 'desc' },
        });

        // Generate nomor SP
        const nomorSP = await generateSPNumber(spLevel, loanAccount.branchId);

        const sp = await prisma.suratPeringatan.create({
          data: {
            accountNumber,
            loanAccountId: loanAccount.id,
            branchId: loanAccount.branchId,
            spLevel: spLevel as any,
            nomorSP,
            tanggalTerbit: new Date(),
            tanggalRespons: new Date(tanggalRespons),
            issuedById: userId,
            catatan,
          },
        });

        return NextResponse.json({
          success: true,
          data: { nomorSP: sp.nomorSP, spId: sp.id },
          message: `${spLevel} berhasil diterbitkan: ${nomorSP}`,
        });
      }

      case 'TOGGLE_AUTODEBIT': {
        const { accountNumber, enable } = body;

        const updated = await prisma.loanAccount.update({
          where: { accountNumber },
          data: { autodebitEnabled: enable },
          select: { accountNumber: true, autodebitEnabled: true, saldoTitipan: true },
        });

        return NextResponse.json({
          success: true,
          data: updated,
          message: `Autodebet titipan ${enable ? 'diaktifkan' : 'dinonaktifkan'} untuk rekening ${accountNumber}`,
        });
      }

      case 'ALIHKAN_REMEDIAL': {
        const { accountNumber, catatan } = body;

        // Update loan account ke status remedial
        await prisma.loanAccount.update({
          where: { accountNumber },
          data: {
            kolektibilitas: 'MACET',
            // Tambah field remedialDate jika diperlukan di schema
          },
        });

        // Log aktivitas pengalihan
        await prisma.debiturVisitLog.create({
          data: {
            debiturCif: (
              await prisma.loanAccount.findUnique({
                where: { accountNumber },
                select: { debiturCif: true },
              })
            )!.debiturCif,
            officerId: userId,
            latitude: 0,
            longitude: 0,
            visitStatus: 'NO_CONTACT',
            fieldNotes: `[SISTEM] Dialihkan ke unit remedial. Catatan: ${catatan}`,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Rekening ${accountNumber} berhasil dialihkan ke unit remedial`,
        });
      }

      default:
        return NextResponse.json({ success: false, error: 'Action tidak dikenali' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Controller Action]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menjalankan aksi controller' },
      { status: 500 }
    );
  }
}
