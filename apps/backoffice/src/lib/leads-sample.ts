export type LeadDetail = {
  tglLahir: string;
  jenisKelamin: string;
  soa: string;
  statusData: string;
  tglPengajuan: string;
  tenor: string;
  namaSales: string;
  keterangan: string;
};

export type AlamatKtp = {
  provinsi: string;
  kota: string;
  kecamatan: string;
  kelurahan: string;
  rtRw: string;
  kodepos: string;
  alamatLengkap: string;
};

export type DataDiri = {
  jenisLeads: string;
  noKtp: string;
  nama: string;
  fotoKtp?: string;
  noHp: string;
  jenisKelamin: string;
  tempatLahir: string;
  tanggalLahir: string;
  agama: string;
  statusPernikahan: string;
  pekerjaan: string;
  namaIbuKandung: string;
  wargaNegara: string;
  tujuanPinjaman: string;
  alamatKtp: AlamatKtp;
};

export type Lead = {
  id: string;
  nik: string;
  nama: string;
  noHp: string;
  alamat: string;
  kelurahan: string;
  kecamatan: string;
  tanggalLeads: string;
  nominalPengajuan: number;
  actionLead: 'Proses Survey' | 'Credit Checking';
  statusCredit: 'PASSED' | 'DONE';
  detail: LeadDetail;
  diri: DataDiri;
  pasangan: { nama: string; nik: string; pekerjaan: string; noHp: string } | null;
  penjamin: { nama: string; hubungan: string; nik: string; noHp: string; alamat: string } | null;
  agunan: { jenis: string; deskripsi: string; nilai: string; atasNama: string } | null;
  creditChecking: { hasilSlik: string; kolektibilitas: string; tanggal: string; catatan: string } | null;
};

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

/** D + tahun + bulan + tanggal pengajuan + nomor urut 5 digit. Contoh: D2026102900002 */
export function formatLeadId(tglPengajuan: string, urut: number): string {
  const [day, month, year] = tglPengajuan.split(' ');
  return `D${year}${MONTHS[month]}${day.padStart(2, '0')}${String(urut).padStart(5, '0')}`;
}

function listedLead(input: {
  id: string;
  nama: string;
  nik: string;
  noHp: string;
  nominalPengajuan: number;
  actionLead: Lead['actionLead'];
  statusCredit: Lead['statusCredit'];
  tglPengajuan: string;
}): Lead {
  return {
    id: input.id,
    nik: input.nik,
    nama: input.nama,
    noHp: input.noHp,
    alamat: '-',
    kelurahan: '-',
    kecamatan: '-',
    tanggalLeads: input.tglPengajuan,
    nominalPengajuan: input.nominalPengajuan,
    actionLead: input.actionLead,
    statusCredit: input.statusCredit,
    detail: {
      tglLahir: '-',
      jenisKelamin: '-',
      soa: '-',
      statusData: '-',
      tglPengajuan: input.tglPengajuan,
      tenor: '-',
      namaSales: '-',
      keterangan: '-',
    },
    diri: {
      jenisLeads: 'Perseorang',
      noKtp: input.nik,
      nama: input.nama,
      noHp: input.noHp,
      jenisKelamin: '-',
      tempatLahir: '-',
      tanggalLahir: '-',
      agama: '-',
      statusPernikahan: '-',
      pekerjaan: '-',
      namaIbuKandung: '-',
      wargaNegara: 'Warga Negara Indonesia',
      tujuanPinjaman: '-',
      alamatKtp: {
        provinsi: '-',
        kota: '-',
        kecamatan: '-',
        kelurahan: '-',
        rtRw: '-',
        kodepos: '-',
        alamatLengkap: '-',
      },
    },
    pasangan: null,
    penjamin: null,
    agunan: null,
    creditChecking: null,
  };
}

const leadRows: Lead[] = [
  listedLead({
    id: 'D2026102700126',
    nama: 'WAHYUNI',
    nik: '3674064707840006',
    noHp: '08889177729',
    nominalPengajuan: 2_541_000,
    actionLead: 'Proses Survey',
    statusCredit: 'PASSED',
    tglPengajuan: '27 Oct 2026',
  }),
  listedLead({
    id: 'D2026102900042',
    nama: 'SITI SUHERNI',
    nik: '3201166510930002',
    noHp: '089531904853',
    nominalPengajuan: 2_541_000,
    actionLead: 'Credit Checking',
    statusCredit: 'DONE',
    tglPengajuan: '29 Oct 2026',
  }),
  listedLead({
    id: 'D2026102900041',
    nama: 'JUNAAH',
    nik: '3604044902750341',
    noHp: '0878954699465',
    nominalPengajuan: 2_541_000,
    actionLead: 'Credit Checking',
    statusCredit: 'DONE',
    tglPengajuan: '29 Oct 2026',
  }),
  listedLead({
    id: 'D2026100600018',
    nama: 'YUYUN YUNANI',
    nik: '3210116412870081',
    noHp: '087716707003',
    nominalPengajuan: 3_146_000,
    actionLead: 'Proses Survey',
    statusCredit: 'PASSED',
    tglPengajuan: '06 Oct 2026',
  }),
  listedLead({
    id: 'D2026102900040',
    nama: 'ASMARANI',
    nik: '3671055810810002',
    noHp: '08822243197',
    nominalPengajuan: 2_541_000,
    actionLead: 'Credit Checking',
    statusCredit: 'DONE',
    tglPengajuan: '29 Oct 2026',
  }),
  listedLead({
    id: 'D2026102900039',
    nama: 'AMNAH',
    nik: '3216044809930006',
    noHp: '0859328196859',
    nominalPengajuan: 2_541_000,
    actionLead: 'Credit Checking',
    statusCredit: 'DONE',
    tglPengajuan: '29 Oct 2026',
  }),
  {
    id: 'D2026102000001',
    nik: '3273014501850001',
    nama: 'Siti Aminah',
    noHp: '081234567890',
    alamat: 'Jl. Merdeka No. 10',
    kelurahan: 'Sukajadi',
    kecamatan: 'Sukajadi',
    tanggalLeads: '20 Oct 2026',
    nominalPengajuan: 5_000_000,
    actionLead: 'Credit Checking',
    statusCredit: 'DONE',
    detail: {
      tglLahir: '12 Dec 1993',
      jenisKelamin: 'Perempuan',
      soa: 'BROSUR',
      statusData: 'Sudah Lengkap',
      tglPengajuan: '20 Oct 2026',
      tenor: '30 MINGGU',
      namaSales: 'lindasefa',
      keterangan: 'Karakteristik debitur dapat dibiayai',
    },
    diri: {
      jenisLeads: 'Perseorang',
      noKtp: '3273014501850001',
      nama: 'Siti Aminah',
      noHp: '081234567890',
      jenisKelamin: 'Perempuan',
      tempatLahir: 'BANDUNG',
      tanggalLahir: '1993-12-12',
      agama: 'Islam',
      statusPernikahan: 'Kawin',
      pekerjaan: 'Wiraswasta',
      namaIbuKandung: 'Siti Maryam',
      wargaNegara: 'Warga Negara Indonesia',
      tujuanPinjaman: 'Modal Usaha',
      alamatKtp: {
        provinsi: 'Jawa Barat',
        kota: 'Kota Bandung',
        kecamatan: 'Sukajadi',
        kelurahan: 'Sukajadi',
        rtRw: '001 / 002',
        kodepos: '40162',
        alamatLengkap: 'Jl. Merdeka No. 10',
      },
    },
    pasangan: {
      nama: 'Rudi Hartono',
      nik: '3273011201900008',
      pekerjaan: 'Karyawan swasta',
      noHp: '081255500111',
    },
    penjamin: {
      nama: 'Dewi Lestari',
      hubungan: 'Saudara',
      nik: '3273035604920003',
      noHp: '081234560003',
      alamat: 'Jl. Soekarno-Hatta No. 210, Bandung',
    },
    agunan: {
      jenis: 'BPKB motor',
      deskripsi: 'Honda Beat 2022, nomor polisi D 1234 AB',
      nilai: 'Rp 15.000.000',
      atasNama: 'Siti Aminah',
    },
    creditChecking: {
      hasilSlik: 'Tidak ada tunggakan',
      kolektibilitas: 'Lancar',
      tanggal: '20 Oct 2026',
      catatan: 'Hasil checking mendukung pengajuan.',
    },
  },
  {
    id: 'D2026102100002',
    nik: '3273021203900002',
    nama: 'Budi Santoso',
    noHp: '081298765432',
    alamat: 'Jl. Asia Afrika No. 5',
    kelurahan: 'Cikawao',
    kecamatan: 'Cicendo',
    tanggalLeads: '21 Oct 2026',
    nominalPengajuan: 4_000_000,
    actionLead: 'Credit Checking',
    statusCredit: 'DONE',
    detail: {
      tglLahir: '5 Mar 1990',
      jenisKelamin: 'Laki-laki',
      soa: 'REFERRAL',
      statusData: 'Sudah Lengkap',
      tglPengajuan: '21 Oct 2026',
      tenor: '40 MINGGU',
      namaSales: 'andipratama',
      keterangan: 'Usaha warung sudah berjalan 4 tahun.',
    },
    diri: {
      jenisLeads: 'Perseorang',
      noKtp: '3273021203900002',
      nama: 'Budi Santoso',
      noHp: '081298765432',
      jenisKelamin: 'Laki-laki',
      tempatLahir: 'BANDUNG',
      tanggalLahir: '1990-03-05',
      agama: 'Islam',
      statusPernikahan: 'Belum Kawin',
      pekerjaan: 'Pedagang',
      namaIbuKandung: 'Rukmini',
      wargaNegara: 'Warga Negara Indonesia',
      tujuanPinjaman: 'Modal Usaha',
      alamatKtp: {
        provinsi: 'Jawa Barat',
        kota: 'Kota Bandung',
        kecamatan: 'Cicendo',
        kelurahan: 'Cikawao',
        rtRw: '004 / 006',
        kodepos: '40173',
        alamatLengkap: 'Jl. Asia Afrika No. 5',
      },
    },
    pasangan: null,
    penjamin: {
      nama: 'Agus Salim',
      hubungan: 'Rekan usaha',
      nik: '3273040101780011',
      noHp: '081811122233',
      alamat: 'Jl. Braga No. 8, Bandung',
    },
    agunan: {
      jenis: 'Sertifikat kios',
      deskripsi: 'Kios Pasar Baru blok C12',
      nilai: 'Rp 40.000.000',
      atasNama: 'Budi Santoso',
    },
    creditChecking: {
      hasilSlik: 'Ada fasilitas aktif',
      kolektibilitas: 'Lancar',
      tanggal: '21 Oct 2026',
      catatan: 'Angsuran berjalan masih lancar.',
    },
  },
  {
    id: 'D2026102200003',
    nik: '3273036708950003',
    nama: 'Linda Sefa',
    noHp: '081377788899',
    alamat: 'Jl. Braga No. 15',
    kelurahan: 'Braga',
    kecamatan: 'Sumur Bandung',
    tanggalLeads: '22 Oct 2026',
    nominalPengajuan: 2_500_000,
    actionLead: 'Proses Survey',
    statusCredit: 'PASSED',
    detail: {
      tglLahir: '8 Aug 1995',
      jenisKelamin: 'Perempuan',
      soa: 'WALK IN',
      statusData: 'Menunggu kelengkapan',
      tglPengajuan: '22 Oct 2026',
      tenor: '25 MINGGU',
      namaSales: 'lindasefa',
      keterangan: 'Menunggu foto usaha dan KTP pasangan.',
    },
    diri: {
      jenisLeads: 'Perseorang',
      noKtp: '3273036708950003',
      nama: 'Linda Sefa',
      noHp: '081377788899',
      jenisKelamin: 'Perempuan',
      tempatLahir: 'BANDUNG',
      tanggalLahir: '1995-08-08',
      agama: 'Islam',
      statusPernikahan: 'Kawin',
      pekerjaan: 'Karyawan swasta',
      namaIbuKandung: 'Yanti',
      wargaNegara: 'Warga Negara Indonesia',
      tujuanPinjaman: 'Modal Usaha',
      alamatKtp: {
        provinsi: 'Jawa Barat',
        kota: 'Kota Bandung',
        kecamatan: 'Sumur Bandung',
        kelurahan: 'Braga',
        rtRw: '002 / 005',
        kodepos: '40111',
        alamatLengkap: 'Jl. Braga No. 15',
      },
    },
    pasangan: {
      nama: 'Hendra Wijaya',
      nik: '3273040101780004',
      pekerjaan: 'Pemilik bengkel',
      noHp: '081234560004',
    },
    penjamin: {
      nama: 'Maya Putri',
      hubungan: 'Teman',
      nik: '3273066708950006',
      noHp: '081234560006',
      alamat: 'Jl. Buah Batu No. 132, Bandung',
    },
    agunan: {
      jenis: 'Belum ada',
      deskripsi: 'Agunan belum dilampirkan',
      nilai: '-',
      atasNama: '-',
    },
    creditChecking: {
      hasilSlik: 'Belum dicek',
      kolektibilitas: '-',
      tanggal: '-',
      catatan: 'Menunggu data lengkap sebelum SLIK.',
    },
  },
  {
    id: 'D2026102900004',
    nik: '3672055212930004',
    nama: 'Ibu NINING PURWANTI',
    noHp: '0819168121812',
    alamat: 'LINK. ROKAL BARAT',
    kelurahan: 'Jombang Wetan',
    kecamatan: 'Jombang',
    tanggalLeads: '29 Oct 2026',
    nominalPengajuan: 2_541_000,
    actionLead: 'Proses Survey',
    statusCredit: 'PASSED',
    detail: {
      tglLahir: '12 Dec 1993',
      jenisKelamin: 'Perempuan',
      soa: '-',
      statusData: 'Sudah Lengkap',
      tglPengajuan: '29 Oct 2026',
      tenor: '-',
      namaSales: '-',
      keterangan: '-',
    },
    diri: {
      jenisLeads: 'Perseorang',
      noKtp: '3672055212930004',
      nama: 'Ibu NINING PURWANTI',
      fotoKtp: '/leads/ktp-nining.png',
      noHp: '0819168121812',
      jenisKelamin: 'Perempuan',
      tempatLahir: 'SERANG',
      tanggalLahir: '1993-12-12',
      agama: 'Islam',
      statusPernikahan: 'Kawin',
      pekerjaan: 'Pedagang',
      namaIbuKandung: 'mama',
      wargaNegara: 'Warga Negara Indonesia',
      tujuanPinjaman: 'Modal Usaha',
      alamatKtp: {
        provinsi: 'Banten',
        kota: 'Kota Cilegon',
        kecamatan: 'Jombang',
        kelurahan: 'Jombang Wetan',
        rtRw: '003 / 011',
        kodepos: '42411',
        alamatLengkap: 'LINK. ROKAL BARAT',
      },
    },
    pasangan: null,
    penjamin: null,
    agunan: null,
    creditChecking: null,
  },
];

export const leads: Lead[] = leadRows.map((lead, index) => ({
  ...lead,
  id: lead.id || formatLeadId(lead.detail.tglPengajuan, index + 1),
}));
