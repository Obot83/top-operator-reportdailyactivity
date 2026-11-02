// top-operator/packages/jobs/src/ptpEvaluator.ts
// Background Job: Evaluator PTP Harian & Auto-Debet Titipan

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────
// PTP DAILY EVALUATOR
// Jadwalkan setiap hari jam 23:55 (atau via cron)
// ─────────────────────────────────────────────────────

export async function evaluatePTPDaily(targetDate?: Date): Promise<EvaluationResult> {
  const today = targetDate ?? new Date();
  today.setHours(0, 0, 0, 0);

  const result: EvaluationResult = {
    honored: [],
    broken: [],
    errors: [],
  };

  // Ambil semua PTP yang masih PENDING
  const pendingPTPs = await prisma.pTPTracking.findMany({
    where: { status: 'PENDING' },
    include: {
      loanAccount: {
        select: {
          accountNumber: true,
          debiturCif: true,
          totalAngsuran: true,
        },
      },
    },
  });

  for (const ptp of pendingPTPs) {
    try {
      const ptpTargetDate = new Date(ptp.targetDate);
      ptpTargetDate.setHours(0, 0, 0, 0);

      // Cek transaksi masuk dari debitur pada atau sebelum targetDate
      const payment = await prisma.angsuranLedger.findFirst({
        where: {
          accountNumber: ptp.accountNumber,
          tanggalBayar: {
            gte: ptp.createdAt,     // Sejak PTP dibuat
            lte: ptpTargetDate,     // Sampai tanggal janji
          },
          totalBayar: { gte: ptp.nominalKomitmen },
        },
        orderBy: { tanggalBayar: 'desc' },
      });

      if (payment) {
        // PTP HONORED
        await prisma.pTPTracking.update({
          where: { id: ptp.id },
          data: {
            status: 'HONORED',
            honoredDate: payment.tanggalBayar,
            honoredNominal: payment.totalBayar,
            ledgerRefId: payment.id,
          },
        });
        result.honored.push({ ptpId: ptp.id, accountNumber: ptp.accountNumber });
      } else if (today > ptpTargetDate) {
        // Sudah melewati tanggal janji tanpa bayar → BROKEN
        await prisma.pTPTracking.update({
          where: { id: ptp.id },
          data: {
            status: 'BROKEN',
            brokenAt: today,
            brokenReason: 'Melewati batas tanggal janji bayar tanpa realisasi',
            notificationSent: false,
          },
        });

        // Trigger notifikasi (fire-and-forget)
        sendBrokenPTPNotification(ptp.id, ptp.accountNumber, ptp.loanAccount.debiturCif)
          .catch((e) => console.error(`[PTP Notif] ${ptp.id}:`, e));

        result.broken.push({ ptpId: ptp.id, accountNumber: ptp.accountNumber });
      }
      // Else: PENDING dan belum melewati targetDate → biarkan
    } catch (err) {
      result.errors.push({
        ptpId: ptp.id,
        error: (err as Error).message,
      });
    }
  }

  console.log(`[PTP Evaluator] ${today.toISOString().split('T')[0]}: HONORED=${result.honored.length} BROKEN=${result.broken.length} ERRORS=${result.errors.length}`);
  return result;
}

// ─────────────────────────────────────────────────────
// AUTODEBET TITIPAN
// Potong saldo titipan ke angsuran jika ada outstanding
// ─────────────────────────────────────────────────────

export interface AutodebitResult {
  accountNumber: string;
  saldoTitipanAwal: number;
  nominalDipotong: number;
  sisaSaldoTitipan: number;
  keteranganPotongan: string;
}

export async function processAutodebitTitipan(
  accountNumber: string
): Promise<AutodebitResult | null> {
  const loanAccount = await prisma.loanAccount.findUnique({
    where: { accountNumber },
    select: {
      accountNumber: true,
      debiturCif: true,
      saldoTitipan: true,
      bakiDebetPokok: true,
      totalAngsuran: true,
      autodebitEnabled: true,
      dpd: true,
    },
  });

  if (!loanAccount) throw new Error(`Rekening ${accountNumber} tidak ditemukan`);
  if (!loanAccount.autodebitEnabled) return null;

  const saldoTitipan = Number(loanAccount.saldoTitipan);
  const totalAngsuran = Number(loanAccount.totalAngsuran);

  if (saldoTitipan < totalAngsuran) {
    console.log(`[Autodebit] ${accountNumber}: Saldo titipan (${saldoTitipan}) < angsuran (${totalAngsuran}), skip`);
    return null;
  }

  // Hitung berapa angsuran yang bisa ditutup
  const jumlahAngsuranBisaDitutup = Math.floor(saldoTitipan / totalAngsuran);
  const nominalDipotong = jumlahAngsuranBisaDitutup * totalAngsuran;
  const sisaSaldoTitipan = saldoTitipan - nominalDipotong;

  // Kalkulasi proporsi pokok & bunga
  const rasioPokok = Number(loanAccount.totalAngsuran) > 0
    ? Number(loanAccount.bakiDebetPokok) / Number(loanAccount.totalAngsuran)
    : 0.7;
  const bayarPokok = Math.min(nominalDipotong * rasioPokok, Number(loanAccount.bakiDebetPokok));
  const bayarBunga = nominalDipotong - bayarPokok;

  const bakiDebetSetelah = Number(loanAccount.bakiDebetPokok) - bayarPokok;

  // Jalankan transaksi DB
  await prisma.$transaction([
    // Buat ledger angsuran
    prisma.angsuranLedger.create({
      data: {
        accountNumber,
        tanggalBayar: new Date(),
        noReferensi: `AUTODEBIT-${Date.now()}`,
        canalPembayaran: 'AUTODEBET_TITIPAN',
        bayarPokok,
        bayarBunga,
        bayarDenda: 0,
        bayarTitipan: 0,
        totalBayar: nominalDipotong,
        bakiDebetSetelah: Math.max(bakiDebetSetelah, 0),
        saldoTitipanSetelah: sisaSaldoTitipan,
        catatan: `Autodebet ${jumlahAngsuranBisaDitutup}x angsuran dari saldo titipan`,
      },
    }),

    // Update loan account
    prisma.loanAccount.update({
      where: { accountNumber },
      data: {
        bakiDebetPokok: Math.max(bakiDebetSetelah, 0),
        saldoTitipan: sisaSaldoTitipan,
        dpd: 0, // Reset DPD setelah bayar
        kolektibilitas: 'LANCAR',
        updatedAt: new Date(),
      },
    }),
  ]);

  const keterangan = `Autodebet ${jumlahAngsuranBisaDitutup}x angsuran (${totalAngsuran.toLocaleString('id-ID')}/minggu) dari saldo titipan`;
  console.log(`[Autodebit] ${accountNumber}: ${keterangan}`);

  return {
    accountNumber,
    saldoTitipanAwal: saldoTitipan,
    nominalDipotong,
    sisaSaldoTitipan,
    keteranganPotongan: keterangan,
  };
}

// ─────────────────────────────────────────────────────
// BATCH AUTODEBIT (untuk semua rekening eligible)
// ─────────────────────────────────────────────────────

export async function batchProcessAutodebit(): Promise<AutodebitResult[]> {
  const eligibleAccounts = await prisma.loanAccount.findMany({
    where: {
      autodebitEnabled: true,
      isActive: true,
      isWriteOff: false,
      saldoTitipan: { gt: 0 },
    },
    select: { accountNumber: true },
  });

  const results: AutodebitResult[] = [];
  for (const acc of eligibleAccounts) {
    try {
      const result = await processAutodebitTitipan(acc.accountNumber);
      if (result) results.push(result);
    } catch (err) {
      console.error(`[Batch Autodebit] ${acc.accountNumber}:`, err);
    }
  }

  console.log(`[Batch Autodebit] Selesai: ${results.length}/${eligibleAccounts.length} rekening diproses`);
  return results;
}

// ─────────────────────────────────────────────────────
// UPDATE DPD HARIAN
// ─────────────────────────────────────────────────────

export async function updateDPDHarian(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeAccounts = await prisma.loanAccount.findMany({
    where: { isActive: true, isWriteOff: false },
    select: {
      accountNumber: true,
      tanggalJatuhTempo: true,
      bakiDebetPokok: true,
      angsuranLedger: {
        where: { tanggalBayar: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) } },
        orderBy: { tanggalBayar: 'desc' },
        take: 1,
      },
    },
  });

  const updates: Array<{ accountNumber: string; dpd: number; kolektibilitas: string }> = [];

  for (const acc of activeAccounts) {
    // DPD = hari sejak jatuh tempo terakhir tanpa bayar
    const lastPayment = acc.angsuranLedger[0];
    const referenceDate = lastPayment
      ? new Date(lastPayment.tanggalBayar)
      : new Date(acc.tanggalJatuhTempo);
    referenceDate.setHours(0, 0, 0, 0);

    const dpd = Math.max(0, Math.floor((today.getTime() - referenceDate.getTime()) / 86400000));
    const kolektibilitas = getDpdKolektibilitas(dpd, Number(acc.bakiDebetPokok));

    updates.push({ accountNumber: acc.accountNumber, dpd, kolektibilitas });
  }

  // Batch update
  await prisma.$transaction(
    updates.map((u) =>
      prisma.loanAccount.update({
        where: { accountNumber: u.accountNumber },
        data: { dpd: u.dpd, kolektibilitas: u.kolektibilitas as any, updatedAt: new Date() },
      })
    )
  );

  console.log(`[DPD Updater] Updated ${updates.length} rekening`);
}

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

function getDpdKolektibilitas(dpd: number, bakiDebet: number): string {
  if (bakiDebet === 0) return 'LANCAR';
  if (dpd === 0) return 'LANCAR';
  if (dpd <= 90) return 'DPK';
  if (dpd <= 120) return 'KURANG_LANCAR';
  if (dpd <= 180) return 'DIRAGUKAN';
  return 'MACET';
}

async function sendBrokenPTPNotification(
  ptpId: string,
  accountNumber: string,
  debiturCif: string
): Promise<void> {
  // Implementasi notifikasi (Push Notification / WhatsApp / Email)
  // Placeholder — integrasi dengan Firebase FCM atau layanan notif lain
  console.log(`[Notif] PTP Broken: ptpId=${ptpId} acc=${accountNumber} cif=${debiturCif}`);

  await prisma.pTPTracking.update({
    where: { id: ptpId },
    data: { notificationSent: true },
  });
}

// ─────────────────────────────────────────────────────
// ENTRY POINT (jalankan via cron atau CLI)
// ─────────────────────────────────────────────────────

async function main() {
  console.log('=== TOP Operator: Daily Jobs ===');
  try {
    await updateDPDHarian();
    await evaluatePTPDaily();
    await batchProcessAutodebit();
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────

export interface EvaluationResult {
  honored: Array<{ ptpId: string; accountNumber: string }>;
  broken: Array<{ ptpId: string; accountNumber: string }>;
  errors: Array<{ ptpId: string; error: string }>;
}
