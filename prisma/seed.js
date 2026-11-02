const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BRANCH_CODE = 'BDG01';

function daysFromToday(offset, hour = 0, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function dateOnly(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function weekPeriod(date) {
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((date.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7
  );
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

async function clearSample() {
  const branch = await prisma.branch.findUnique({ where: { code: BRANCH_CODE } });
  if (!branch) return;

  const loans = await prisma.loanAccount.findMany({
    where: { branchId: branch.id },
    select: { id: true },
  });
  const loanIds = loans.map((loan) => loan.id);
  const users = await prisma.user.findMany({
    where: { branchId: branch.id },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);

  if (loanIds.length || userIds.length) {
    await prisma.debiturVisitLog.deleteMany({
      where: {
        OR: [
          { loanAccountId: { in: loanIds } },
          { officerId: { in: userIds } },
        ],
      },
    });
  }
  if (loanIds.length) {
    await prisma.pTPTracking.deleteMany({ where: { loanAccountId: { in: loanIds } } });
    await prisma.collectionTask.deleteMany({ where: { loanAccountId: { in: loanIds } } });
    await prisma.angsuranLedger.deleteMany({ where: { loanAccountId: { in: loanIds } } });
    await prisma.suratPeringatan.deleteMany({ where: { loanAccountId: { in: loanIds } } });
    await prisma.loanAccount.deleteMany({ where: { id: { in: loanIds } } });
  }
  await prisma.aOActivity.deleteMany({ where: { branchId: branch.id } });
  await prisma.user.deleteMany({ where: { branchId: branch.id } });
  await prisma.debitur.deleteMany({
    where: { cif: { in: ['CIF10001', 'CIF10002', 'CIF10003', 'CIF10004', 'CIF10005', 'CIF10006'] } },
  });
  await prisma.branch.delete({ where: { id: branch.id } });
}

async function main() {
  await clearSample();

  const periode = weekPeriod(new Date());
  const branch = await prisma.branch.create({
    data: {
      code: BRANCH_CODE,
      name: 'Cabang Bandung',
      alamat: 'Jl. Asia Afrika No. 120, Bandung',
    },
  });

  const [admin, ao, rina, andi] = await Promise.all([
    prisma.user.create({
      data: {
        branchId: branch.id,
        name: 'Sari Wulandari',
        employeeId: 'EMP-ADM-01',
        email: 'sari.wulandari@sample.top.local',
        password: 'sample-only',
        role: 'ADMIN',
      },
    }),
    prisma.user.create({
      data: {
        branchId: branch.id,
        name: 'Budi Santoso',
        employeeId: 'EMP-AO-01',
        email: 'budi.santoso@sample.top.local',
        password: 'sample-only',
        role: 'AO',
      },
    }),
    prisma.user.create({
      data: {
        branchId: branch.id,
        name: 'Rina Kartika',
        employeeId: 'EMP-COL-01',
        email: 'rina.kartika@sample.top.local',
        password: 'sample-only',
        role: 'COLLECTOR',
      },
    }),
    prisma.user.create({
      data: {
        branchId: branch.id,
        name: 'Andi Pratama',
        employeeId: 'EMP-COL-02',
        email: 'andi.pratama@sample.top.local',
        password: 'sample-only',
        role: 'COLLECTOR',
      },
    }),
  ]);

  const debiturs = [
    {
      cif: 'CIF10001',
      name: 'Siti Aminah',
      nik: '3273014501850001',
      phone: '081234560001',
      gender: 'P',
      domisiliAddress: 'Jl. Cibaduyut No. 18',
      domisiliKecamatan: 'Bojongloa Kidul',
      domisiliKota: 'Bandung',
      usahaAddress: 'Pasar Caringin Blok B12',
      defaultLatitude: -6.9512,
      defaultLongitude: 107.5954,
    },
    {
      cif: 'CIF10002',
      name: 'Ahmad Fauzi',
      nik: '3273021203900002',
      phone: '081234560002',
      gender: 'L',
      domisiliAddress: 'Jl. Kopo Sayati No. 45',
      domisiliKecamatan: 'Margahayu',
      domisiliKota: 'Bandung',
      usahaAddress: 'Warung Sembako Kopo',
      defaultLatitude: -6.9618,
      defaultLongitude: 107.5782,
    },
    {
      cif: 'CIF10003',
      name: 'Dewi Lestari',
      nik: '3273035604920003',
      phone: '081234560003',
      gender: 'P',
      domisiliAddress: 'Jl. Soekarno-Hatta No. 210',
      domisiliKecamatan: 'Bandung Kidul',
      domisiliKota: 'Bandung',
      usahaAddress: 'Konveksi Dewi, Soekarno-Hatta',
      defaultLatitude: -6.9475,
      defaultLongitude: 107.6331,
    },
    {
      cif: 'CIF10004',
      name: 'Hendra Wijaya',
      nik: '3273040101780004',
      phone: '081234560004',
      gender: 'L',
      domisiliAddress: 'Jl. Ahmad Yani No. 88',
      domisiliKecamatan: 'Batununggal',
      domisiliKota: 'Bandung',
      usahaAddress: 'Bengkel Motor Ahmad Yani',
      defaultLatitude: -6.9324,
      defaultLongitude: 107.6368,
    },
    {
      cif: 'CIF10005',
      name: 'Rudi Hartono',
      nik: '3273052208700005',
      phone: '081234560005',
      gender: 'L',
      domisiliAddress: 'Jl. Kiaracondong No. 7',
      domisiliKecamatan: 'Kiaracondong',
      domisiliKota: 'Bandung',
      usahaAddress: null,
      defaultLatitude: -6.9248,
      defaultLongitude: 107.6455,
    },
    {
      cif: 'CIF10006',
      name: 'Maya Putri',
      nik: '3273066708950006',
      phone: '081234560006',
      gender: 'P',
      domisiliAddress: 'Jl. Buah Batu No. 132',
      domisiliKecamatan: 'Lengkong',
      domisiliKota: 'Bandung',
      usahaAddress: 'Kedai Kopi Buah Batu',
      defaultLatitude: -6.9389,
      defaultLongitude: 107.6274,
    },
  ];

  const createdDebiturs = {};
  for (const debitur of debiturs) {
    createdDebiturs[debitur.cif] = await prisma.debitur.create({ data: debitur });
  }

  const accounts = [
    {
      accountNumber: '1002600001',
      cif: 'CIF10001',
      plafon: 8000000,
      baki: 3200000,
      titipan: 0,
      dpd: 0,
      kolektibilitas: 'LANCAR',
      autodebit: false,
      writeOff: false,
      tenor: 50,
      angsuranPokok: 160000,
      angsuranBunga: 24000,
    },
    {
      accountNumber: '1002600002',
      cif: 'CIF10002',
      plafon: 12000000,
      baki: 7600000,
      titipan: 350000,
      dpd: 6,
      kolektibilitas: 'DPK',
      autodebit: true,
      writeOff: false,
      tenor: 50,
      angsuranPokok: 240000,
      angsuranBunga: 36000,
    },
    {
      accountNumber: '1002600003',
      cif: 'CIF10003',
      plafon: 15000000,
      baki: 11200000,
      titipan: 0,
      dpd: 24,
      kolektibilitas: 'KURANG_LANCAR',
      autodebit: false,
      writeOff: false,
      tenor: 40,
      angsuranPokok: 375000,
      angsuranBunga: 45000,
    },
    {
      accountNumber: '1002600004',
      cif: 'CIF10004',
      plafon: 10000000,
      baki: 9100000,
      titipan: 125000,
      dpd: 52,
      kolektibilitas: 'DIRAGUKAN',
      autodebit: false,
      writeOff: false,
      tenor: 40,
      angsuranPokok: 250000,
      angsuranBunga: 30000,
    },
    {
      accountNumber: '1002600005',
      cif: 'CIF10005',
      plafon: 7000000,
      baki: 6400000,
      titipan: 0,
      dpd: 128,
      kolektibilitas: 'MACET',
      autodebit: false,
      writeOff: true,
      tenor: 30,
      angsuranPokok: 233000,
      angsuranBunga: 21000,
    },
    {
      accountNumber: '1002600006',
      cif: 'CIF10006',
      plafon: 5000000,
      baki: 2750000,
      titipan: 150000,
      dpd: 14,
      kolektibilitas: 'DPK',
      autodebit: false,
      writeOff: false,
      tenor: 25,
      angsuranPokok: 200000,
      angsuranBunga: 18000,
    },
  ];

  const loans = {};
  for (const account of accounts) {
    const debitur = createdDebiturs[account.cif];
    loans[account.accountNumber] = await prisma.loanAccount.create({
      data: {
        accountNumber: account.accountNumber,
        debiturId: debitur.id,
        debiturCif: debitur.cif,
        branchId: branch.id,
        productName: 'LancarKu',
        plafon: account.plafon,
        bakiDebetPokok: account.baki,
        saldoTitipan: account.titipan,
        bungaPerTahun: 18,
        tenorMinggu: account.tenor,
        angsuranPokok: account.angsuranPokok,
        angsuranBunga: account.angsuranBunga,
        totalAngsuran: account.angsuranPokok + account.angsuranBunga,
        tanggalAkad: dateOnly(-120),
        tanggalJatuhTempo: dateOnly(account.tenor * 7 - 120),
        dpd: account.dpd,
        kolektibilitas: account.kolektibilitas,
        autodebitEnabled: account.autodebit,
        isWriteOff: account.writeOff,
        isActive: true,
      },
    });
  }

  await prisma.angsuranLedger.create({
    data: {
      loanAccountId: loans['1002600001'].id,
      tanggalBayar: dateOnly(-7),
      jumlahBayar: 184000,
      bayarPokok: 160000,
      bayarBunga: 24000,
      bayarDenda: 0,
      sumberBayar: 'TUNAI',
      keterangan: 'Angsuran minggu lalu',
    },
  });

  const ptpAhmad = await prisma.pTPTracking.create({
    data: {
      accountNumber: '1002600002',
      loanAccountId: loans['1002600002'].id,
      officerId: rina.id,
      targetDate: dateOnly(3),
      nominalKomitmen: 276000,
      status: 'PENDING',
      catatan: 'Janji bayar setelah dagangan laku di pasar.',
    },
  });
  const ptpDewiBroken = await prisma.pTPTracking.create({
    data: {
      accountNumber: '1002600003',
      loanAccountId: loans['1002600003'].id,
      officerId: rina.id,
      targetDate: dateOnly(-10),
      nominalKomitmen: 420000,
      status: 'BROKEN',
      brokenAt: daysFromToday(-8, 16),
      brokenReason: 'Usaha sepi, belum ada pemasukan.',
      catatan: 'Janji sebelumnya tidak ditepati.',
    },
  });
  await prisma.pTPTracking.create({
    data: {
      accountNumber: '1002600003',
      loanAccountId: loans['1002600003'].id,
      officerId: rina.id,
      targetDate: dateOnly(5),
      nominalKomitmen: 200000,
      status: 'PENDING',
      catatan: 'Komitmen parsial minggu depan.',
    },
  });
  await prisma.pTPTracking.create({
    data: {
      accountNumber: '1002600004',
      loanAccountId: loans['1002600004'].id,
      officerId: andi.id,
      targetDate: dateOnly(-20),
      nominalKomitmen: 280000,
      status: 'HONORED',
      honoredDate: daysFromToday(-18, 11),
      honoredNominal: 280000,
      catatan: 'Dibayar tunai di kantor cabang.',
    },
  });
  await prisma.pTPTracking.create({
    data: {
      accountNumber: '1002600004',
      loanAccountId: loans['1002600004'].id,
      officerId: andi.id,
      targetDate: dateOnly(-4),
      nominalKomitmen: 280000,
      status: 'BROKEN',
      brokenAt: daysFromToday(-3, 17),
      brokenReason: 'Debitur menolak ditemui dan tidak mengangkat telepon.',
    },
  });

  const visits = [
    {
      loanAccountId: loans['1002600001'].id,
      debiturCif: 'CIF10001',
      officerId: rina.id,
      visitTimestamp: daysFromToday(-7, 9),
      latitude: -6.9512,
      longitude: 107.5954,
      gpsAccuracy: 8,
      visitStatus: 'MET_DEBTOR',
      fieldNotes: 'Pembayaran diterima di tempat usaha.',
      photoUrls: [],
      hasPTP: false,
    },
    {
      loanAccountId: loans['1002600002'].id,
      debiturCif: 'CIF10002',
      officerId: rina.id,
      visitTimestamp: daysFromToday(-1, 10),
      latitude: -6.9618,
      longitude: 107.5782,
      gpsAccuracy: 12,
      visitStatus: 'MET_DEBTOR',
      reasonCategory: 'Usaha sepi',
      reasonDetail: 'Omzet pasar turun minggu ini.',
      fieldNotes: 'Debitur ada di warung dan membuat janji bayar.',
      photoUrls: [],
      hasPTP: true,
      ptpTrackingId: ptpAhmad.id,
    },
    {
      loanAccountId: loans['1002600003'].id,
      debiturCif: 'CIF10003',
      officerId: rina.id,
      visitTimestamp: daysFromToday(-12, 14),
      latitude: -6.9475,
      longitude: 107.6331,
      gpsAccuracy: 15,
      visitStatus: 'VACANT',
      fieldNotes: 'Konveksi tutup, tetangga bilang pemilik ke luar kota.',
      photoUrls: [],
      hasPTP: false,
    },
    {
      loanAccountId: loans['1002600003'].id,
      debiturCif: 'CIF10003',
      officerId: rina.id,
      visitTimestamp: daysFromToday(-2, 11),
      latitude: -6.9476,
      longitude: 107.6334,
      gpsAccuracy: 9,
      visitStatus: 'PARTIAL_MET',
      reasonCategory: 'Piutang macet',
      reasonDetail: 'Pelanggan konveksi belum membayar.',
      fieldNotes: 'Bertemu suami debitur. Janji sebagian minggu depan.',
      photoUrls: [],
      hasPTP: true,
      ptpTrackingId: ptpDewiBroken.id,
    },
    {
      loanAccountId: loans['1002600004'].id,
      debiturCif: 'CIF10004',
      officerId: andi.id,
      visitTimestamp: daysFromToday(-6, 15),
      latitude: -6.9324,
      longitude: 107.6368,
      gpsAccuracy: 11,
      visitStatus: 'REFUSED',
      reasonCategory: 'Menolak ditemui',
      reasonDetail: 'Debitur menyuruh kolektor datang lain waktu.',
      fieldNotes: 'Pintu bengkel ditutup setelah kolektor memperkenalkan diri.',
      photoUrls: [],
      hasPTP: false,
    },
    {
      loanAccountId: loans['1002600004'].id,
      debiturCif: 'CIF10004',
      officerId: andi.id,
      visitTimestamp: daysFromToday(-1, 16),
      latitude: -6.9322,
      longitude: 107.6365,
      gpsAccuracy: 18,
      visitStatus: 'PHONE_ONLY',
      fieldNotes: 'Telepon diangkat sebentar lalu ditutup.',
      photoUrls: [],
      hasPTP: false,
    },
    {
      loanAccountId: loans['1002600005'].id,
      debiturCif: 'CIF10005',
      officerId: andi.id,
      visitTimestamp: daysFromToday(-3, 13),
      latitude: -6.9248,
      longitude: 107.6455,
      gpsAccuracy: 20,
      visitStatus: 'OTHER',
      reasonCategory: 'Pindah alamat',
      reasonDetail: 'Penghuni baru tidak mengenal debitur.',
      fieldNotes: 'Rekening sudah write-off. Alamat domisili tidak valid.',
      photoUrls: [],
      hasPTP: false,
    },
  ];

  for (const visit of visits) {
    await prisma.debiturVisitLog.create({ data: visit });
  }

  await prisma.suratPeringatan.create({
    data: {
      nomorSP: 'SP1/26/09/BDG01/0001',
      accountNumber: '1002600003',
      loanAccountId: loans['1002600003'].id,
      branchId: branch.id,
      issuedById: admin.id,
      spLevel: 'SP1',
      tanggalTerbit: daysFromToday(-20, 9),
      tanggalRespons: dateOnly(-13),
      catatan: 'Peringatan pertama atas tunggakan 3 minggu.',
    },
  });
  await prisma.suratPeringatan.create({
    data: {
      nomorSP: 'SP1/26/08/BDG01/0002',
      accountNumber: '1002600004',
      loanAccountId: loans['1002600004'].id,
      branchId: branch.id,
      issuedById: admin.id,
      spLevel: 'SP1',
      tanggalTerbit: daysFromToday(-40, 9),
      tanggalRespons: dateOnly(-33),
    },
  });
  await prisma.suratPeringatan.create({
    data: {
      nomorSP: 'SP2/26/10/BDG01/0003',
      accountNumber: '1002600004',
      loanAccountId: loans['1002600004'].id,
      branchId: branch.id,
      issuedById: admin.id,
      spLevel: 'SP2',
      tanggalTerbit: daysFromToday(-8, 9),
      tanggalRespons: dateOnly(-1),
      catatan: 'SP2 karena janji bayar dilanggar dan menolak ditemui.',
    },
  });
  await prisma.suratPeringatan.create({
    data: {
      nomorSP: 'SP3/26/10/BDG01/0004',
      accountNumber: '1002600005',
      loanAccountId: loans['1002600005'].id,
      branchId: branch.id,
      issuedById: admin.id,
      spLevel: 'SP3',
      tanggalTerbit: daysFromToday(-15, 9),
      tanggalRespons: dateOnly(-8),
      catatan: 'SP3 sebelum pengalihan write-off.',
    },
  });

  const tasks = [
    {
      accountNumber: '1002600001',
      officerId: rina.id,
      statusBayar: 'SUDAH_BAYAR',
      pokok: 160000,
      bunga: 24000,
      realPokok: 160000,
      realBunga: 24000,
      tanggal: 0,
    },
    {
      accountNumber: '1002600002',
      officerId: rina.id,
      statusBayar: 'JANJI_BAYAR',
      pokok: 240000,
      bunga: 36000,
      titipan: 350000,
      saldoAwal: 350000,
      tanggal: -1,
    },
    {
      accountNumber: '1002600003',
      officerId: rina.id,
      statusBayar: 'SUDAH_DIKUNJUNGI',
      pokok: 375000,
      bunga: 45000,
      denda: 25000,
      tanggal: -2,
    },
    {
      accountNumber: '1002600004',
      officerId: andi.id,
      statusBayar: 'TIDAK_BISA_BAYAR',
      pokok: 250000,
      bunga: 30000,
      denda: 50000,
      titipan: 125000,
      saldoAwal: 125000,
      tanggal: -1,
    },
    {
      accountNumber: '1002600005',
      officerId: andi.id,
      statusBayar: 'SUDAH_BAYAR',
      pokok: 0,
      bunga: 0,
      wo: 500000,
      tanggal: -3,
    },
    {
      accountNumber: '1002600006',
      officerId: andi.id,
      statusBayar: 'BELUM_DIKUNJUNGI',
      pokok: 200000,
      bunga: 18000,
      titipan: 150000,
      saldoAwal: 150000,
      tanggal: null,
    },
  ];

  for (const task of tasks) {
    await prisma.collectionTask.create({
      data: {
        loanAccountId: loans[task.accountNumber].id,
        accountNumber: task.accountNumber,
        officerId: task.officerId,
        periodeTagih: periode,
        tanggalTagih: task.tanggal === null ? null : dateOnly(task.tanggal),
        tanggalKunjungan: task.tanggal === null ? null : daysFromToday(task.tanggal, 10),
        tagihanPokok: task.pokok,
        tagihanBunga: task.bunga,
        tagihanDenda: task.denda ?? 0,
        tagihanTitipan: task.titipan ?? 0,
        saldoTitipanAwal: task.saldoAwal ?? 0,
        terealisasiPokok: task.realPokok ?? 0,
        terealisasiBunga: task.realBunga ?? 0,
        terealisasiDenda: 0,
        terealisasiTitipan: 0,
        penerimaanWO: task.wo ?? 0,
        statusBayar: task.statusBayar,
      },
    });
  }

  const aoActivities = [
    { type: 'PROSPEK', hour: 8, name: 'Lina Marlina', nominal: 10000000, status: 'FOLLOW_UP', note: 'Pemilik warung di Cibaduyut.' },
    { type: 'SURVEY_AGUNAN', hour: 9, name: 'Agus Salim', status: 'SELESAI', note: 'Survei kios di Pasar Baru.' },
    { type: 'VERIFIKASI', hour: 10, name: 'Lina Marlina', status: 'LAYAK', note: 'Dokumen KTP dan KK lengkap.' },
    { type: 'BOOKING', hour: 11, name: 'Lina Marlina', nominal: 8000000, status: 'BOOKED', note: 'Plafon disepakati 8 juta.' },
    { type: 'REALISASI', hour: 13, account: '1002600001', nominal: 8000000, status: 'CAIR', note: 'Pencairan LancarKu Siti Aminah.' },
    { type: 'POTONGAN_TITIPAN', hour: 14, account: '1002600002', titipan: 100000, status: 'SELESAI', note: 'Potong titipan Ahmad Fauzi.' },
  ];

  for (const activity of aoActivities) {
    await prisma.aOActivity.create({
      data: {
        aoId: ao.id,
        branchId: branch.id,
        accountNumber: activity.account ?? null,
        activityType: activity.type,
        activityDate: daysFromToday(0, activity.hour, 10),
        nominalRealisasi: activity.type === 'REALISASI' ? activity.nominal : null,
        nominalTitipanMuka: activity.titipan ?? null,
        prospekName: activity.name ?? null,
        prospekNominalPengajuan: activity.type === 'PROSPEK' || activity.type === 'BOOKING' ? activity.nominal : null,
        status: activity.status,
        catatan: activity.note,
        latitude: -6.9214,
        longitude: 107.6111,
        photoUrls: [],
      },
    });
  }

  console.log(`Sample data siap. Periode tagih ${periode}.`);
  console.log('Rekening: 1002600001, 1002600002, 1002600003, 1002600004, 1002600005, 1002600006');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
