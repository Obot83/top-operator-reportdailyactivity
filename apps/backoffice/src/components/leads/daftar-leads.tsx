'use client';

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { leads, type Lead } from '@/lib/leads-sample';

const SUMMARY_FIELDS: { key: keyof Lead['detail']; label: string }[] = [
  { key: 'tglLahir', label: 'Tgl Lahir' },
  { key: 'soa', label: 'SoA' },
  { key: 'tglPengajuan', label: 'Tgl Pengajuan' },
  { key: 'namaSales', label: 'Nama Sales' },
  { key: 'jenisKelamin', label: 'Jenis Kelamin' },
  { key: 'statusData', label: 'Status Data' },
  { key: 'tenor', label: 'Tenor' },
  { key: 'keterangan', label: 'Keterangan' },
];

const TABS = [
  'Data Pemohon',
  'Data Pengajuan',
  'Data Pasangan',
  'Data Penjamin',
  'Data Agunan',
  'Credit Checking',
] as const;

type TabName = (typeof TABS)[number];

const PAGE_SIZE = 6;
const FILTERS = ['Semua', 'Proses Survey', 'Credit Checking', 'PASSED', 'DONE'] as const;

function rupiah(value: number) {
  return `Rp ${value.toLocaleString('en-US')}`;
}

export function DaftarLeads() {
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Semua');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState<number>();

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setPanelWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [detailLead]);

  if (detailLead) {
    return <LeadDetailView lead={detailLead} onBack={() => setDetailLead(null)} />;
  }

  const filtered = leads.filter((lead) => {
    const keyword = query.trim().toLowerCase();
    const matchesQuery = !keyword || [lead.nama, lead.id, lead.nik, lead.noHp].some((value) => value.toLowerCase().includes(keyword));
    const matchesFilter = filter === 'Semua' || lead.actionLead === filter || lead.statusCredit === filter;
    return matchesQuery && matchesFilter;
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pageIds = pageRows.map((lead) => lead.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  function toggleAll() {
    setSelected((current) => (
      allSelected ? current.filter((id) => !pageIds.includes(id)) : Array.from(new Set([...current, ...pageIds]))
    ));
  }

  function toggleOne(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <main className="min-h-screen bg-[#f4f6fb] px-4 py-6 sm:px-6">
      <p className="text-xs text-slate-400">Leads / List Leads</p>
      <h1 className="mt-1 text-[28px] font-bold tracking-tight text-slate-900">List Leads</h1>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <label className="relative block w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          Filter By :
          <select
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value as (typeof FILTERS)[number]);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
          >
            {FILTERS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div ref={scrollerRef} className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b text-left text-slate-400">
            <tr>
              <th className="w-12 px-4 py-3 font-medium">
                <input type="checkbox" aria-label="Pilih semua leads di halaman ini" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-slate-300" />
              </th>
              <th className="px-3 py-3 font-medium">Nama / Leads Id</th>
              <th className="px-3 py-3 font-medium">No KTP/Telp</th>
              <th className="px-3 py-3 font-medium">Pengajuan</th>
              <th className="px-3 py-3 font-medium">Action Lead</th>
              <th className="px-3 py-3 font-medium">Status Credit Checking</th>
              <th className="px-3 py-3 font-medium">Tgl Pengajuan</th>
              <th className="w-24 px-3 py-3 font-medium"><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((lead) => {
              const open = expandedId === lead.id;
              return (
                <Fragment key={lead.id}>
                  <tr className="border-b last:border-0">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        aria-label={`Pilih ${lead.nama}`}
                        checked={selected.includes(lead.id)}
                        onChange={() => toggleOne(lead.id)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-3 py-4">
                      <div className="font-semibold uppercase text-slate-800">{lead.nama}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{lead.id}</div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="font-medium text-slate-800">{lead.diri.noKtp}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{lead.diri.noHp}</div>
                    </td>
                    <td className="px-3 py-4 text-slate-700">{rupiah(lead.nominalPengajuan)}</td>
                    <td className="px-3 py-4"><ActionLeadStatus value={lead.actionLead} /></td>
                    <td className="px-3 py-4 text-slate-700">{lead.statusCredit}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-slate-700">{lead.detail.tglPengajuan}</td>
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-end gap-1 text-slate-400">
                        <button
                          type="button"
                          aria-label={`Detail pengajuan ${lead.nama}`}
                          className="rounded-md p-1.5 hover:bg-slate-100 hover:text-slate-700"
                          onClick={() => setDetailLead(lead)}
                        >
                          <Search className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-label={`Ringkasan data ${lead.nama}`}
                          className="rounded-md p-1.5 hover:bg-slate-100 hover:text-slate-700"
                          onClick={() => setExpandedId(open ? null : lead.id)}
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr className="border-b bg-[#f7f8fb]">
                      <td colSpan={8} className="p-0">
                        <div className="sticky left-0 px-8 py-6" style={{ width: panelWidth }}>
                          <SummaryGrid lead={lead} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-slate-500">
        <p>{filtered.length === 0 ? 'Tidak ada leads' : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} dari ${filtered.length}`}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Halaman sebelumnya"
            disabled={safePage === 1}
            onClick={() => setPage(safePage - 1)}
            className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: pageCount }, (_, index) => {
            const number = index + 1;
            const active = number === safePage;
            return (
              <button
                key={number}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => setPage(number)}
                className={`h-8 min-w-8 rounded-md px-2 ${active ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
              >
                {number}
              </button>
            );
          })}
          <button
            type="button"
            aria-label="Halaman berikutnya"
            disabled={safePage === pageCount}
            onClick={() => setPage(safePage + 1)}
            className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      </div>
    </main>
  );
}

function ActionLeadStatus({ value }: { value: Lead['actionLead'] }) {
  const survey = value === 'Proses Survey';
  return (
    <span className={`inline-flex items-center gap-2 ${survey ? 'text-amber-500' : 'text-emerald-500'}`}>
      <span className={`h-2 w-2 rounded-full ${survey ? 'bg-amber-400' : 'bg-emerald-500'}`} />
      {value}
    </span>
  );
}

function SummaryGrid({ lead }: { lead: Lead }) {
  return (
    <dl className="grid grid-cols-4 gap-x-8 gap-y-7">
      {SUMMARY_FIELDS.map((field) => (
        <div key={field.key}>
          <dt className="text-[13px] text-slate-400">{field.label}</dt>
          <dd className="mt-1 text-sm text-slate-600">{lead.detail[field.key]}</dd>
        </div>
      ))}
    </dl>
  );
}

function LeadDetailView({ lead, onBack }: { lead: Lead; onBack: () => void }) {
  const [tab, setTab] = useState<TabName>('Data Pemohon');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  return (
    <main className="min-h-screen bg-[#f4f6fb]">
      <div>
        <div className="px-6 pb-2 pt-5">
          <h2 id="lead-detail-title" className="text-[22px] font-bold tracking-tight text-slate-900">Detail Leads</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            <button type="button" className="hover:text-slate-600" onClick={onBack}>Leads</button>
            <span className="px-0.5">›</span>
            <span className="text-slate-500">Detail Leads</span>
          </p>
        </div>

        <div className="flex border-b border-slate-200 px-2" role="tablist">
          {TABS.map((name) => {
            const active = tab === name;
            return (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(name)}
                className={`relative min-w-0 flex-1 px-1 py-3 text-center text-[13px] leading-tight sm:text-sm ${active ? 'font-medium text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {name}
                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-slate-900" />}
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-5" role="tabpanel">
          <div className="rounded-xl bg-white px-5 py-5 shadow-sm sm:px-6">
            {tab === 'Data Pemohon' && <DataPemohonPanel lead={lead} />}
            {tab === 'Data Pengajuan' && (
              <Section title="Data Pengajuan" subtitle="ID leads, tenor, sales, dan keterangan pengajuan.">
                <DetailRow label="ID Leads">{lead.id}</DetailRow>
                <DetailRow label="Tanggal Leads">{lead.tanggalLeads}</DetailRow>
                <DetailRow label="Tgl Pengajuan">{lead.detail.tglPengajuan}</DetailRow>
                <DetailRow label="Tenor">{lead.detail.tenor}</DetailRow>
                <DetailRow label="Nama Sales">{lead.detail.namaSales}</DetailRow>
                <DetailRow label="SoA">{lead.detail.soa}</DetailRow>
                <DetailRow label="Status Data">{lead.detail.statusData}</DetailRow>
                <DetailRow label="Keterangan">{lead.detail.keterangan}</DetailRow>
              </Section>
            )}
            {tab === 'Data Pasangan' && (
              <Section title="Data Pasangan" subtitle="Nama, NIK, pekerjaan, dan nomor HP pasangan.">
                {lead.pasangan ? (
                  <>
                    <DetailRow label="Nama">{lead.pasangan.nama}</DetailRow>
                    <DetailRow label="NIK">{lead.pasangan.nik}</DetailRow>
                    <DetailRow label="Pekerjaan">{lead.pasangan.pekerjaan}</DetailRow>
                    <DetailRow label="No HP">{lead.pasangan.noHp}</DetailRow>
                  </>
                ) : (
                  <EmptyNote>Tidak ada data pasangan.</EmptyNote>
                )}
              </Section>
            )}
            {tab === 'Data Penjamin' && (
              <Section title="Data Penjamin" subtitle="Nama, hubungan, dan kontak penjamin.">
                {lead.penjamin ? (
                  <>
                    <DetailRow label="Nama">{lead.penjamin.nama}</DetailRow>
                    <DetailRow label="Hubungan">{lead.penjamin.hubungan}</DetailRow>
                    <DetailRow label="NIK">{lead.penjamin.nik}</DetailRow>
                    <DetailRow label="No HP">{lead.penjamin.noHp}</DetailRow>
                    <DetailRow label="Alamat">{lead.penjamin.alamat}</DetailRow>
                  </>
                ) : (
                  <EmptyNote>Tidak ada data penjamin.</EmptyNote>
                )}
              </Section>
            )}
            {tab === 'Data Agunan' && (
              <Section title="Data Agunan" subtitle="Jenis, deskripsi, dan nilai agunan.">
                {lead.agunan ? (
                  <>
                    <DetailRow label="Jenis Agunan">{lead.agunan.jenis}</DetailRow>
                    <DetailRow label="Deskripsi">{lead.agunan.deskripsi}</DetailRow>
                    <DetailRow label="Perkiraan Nilai">{lead.agunan.nilai}</DetailRow>
                    <DetailRow label="Atas Nama">{lead.agunan.atasNama}</DetailRow>
                  </>
                ) : (
                  <EmptyNote>Tidak ada data agunan.</EmptyNote>
                )}
              </Section>
            )}
            {tab === 'Credit Checking' && (
              <Section title="Credit Checking" subtitle="Hasil SLIK dan catatan pemeriksaan.">
                {lead.creditChecking ? (
                  <>
                    <DetailRow label="Hasil SLIK">{lead.creditChecking.hasilSlik}</DetailRow>
                    <DetailRow label="Kolektibilitas">{lead.creditChecking.kolektibilitas}</DetailRow>
                    <DetailRow label="Tanggal Checking">{lead.creditChecking.tanggal}</DetailRow>
                    <DetailRow label="Catatan">{lead.creditChecking.catatan}</DetailRow>
                  </>
                ) : (
                  <EmptyNote>Tidak ada data credit checking.</EmptyNote>
                )}
              </Section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function DataPemohonPanel({ lead }: { lead: Lead }) {
  const diri = lead.diri;
  const alamat = diri.alamatKtp;
  return (
    <div className="space-y-8">
      <Section title="Data Diri Pemohon" subtitle="Nama, KTP, No HP, Pekerjaan dll.">
        <DetailRow label="Jenis Leads">{diri.jenisLeads}</DetailRow>
        <DetailRow label="No KTP">{diri.noKtp}</DetailRow>
        <DetailRow label="Nama">{diri.nama}</DetailRow>
        <DetailRow label="Foto KTP">
          <KtpPhoto src={diri.fotoKtp} nama={diri.nama} />
        </DetailRow>
        <DetailRow label="No HP">{diri.noHp}</DetailRow>
        <DetailRow label="Jenis Kelamin">{diri.jenisKelamin}</DetailRow>
        <DetailRow label="Tempat Lahir">{diri.tempatLahir}</DetailRow>
        <DetailRow label="Tanggal Lahir">{diri.tanggalLahir}</DetailRow>
        <DetailRow label="Agama">{diri.agama}</DetailRow>
        <DetailRow label="Status Pernikahan">{diri.statusPernikahan}</DetailRow>
        <DetailRow label="Pekerjaan">{diri.pekerjaan}</DetailRow>
        <DetailRow label="Nama Ibu Kandung">{diri.namaIbuKandung}</DetailRow>
        <DetailRow label="Warga Negara">{diri.wargaNegara}</DetailRow>
        <DetailRow label="Tujuan Pinjaman">{diri.tujuanPinjaman}</DetailRow>
      </Section>
      <Section title="Alamat Sesuai KTP" subtitle="Provinsi, Kota, Kecamatan, Kelurahan">
        <DetailRow label="Provinsi">{alamat.provinsi}</DetailRow>
        <DetailRow label="Kota">{alamat.kota}</DetailRow>
        <DetailRow label="Kecamatan">{alamat.kecamatan}</DetailRow>
        <DetailRow label="Kelurahan">{alamat.kelurahan}</DetailRow>
        <DetailRow label="RT / RW">{alamat.rtRw}</DetailRow>
        <DetailRow label="Kodepos">{alamat.kodepos}</DetailRow>
        <DetailRow label="Alamat Lengkap">{alamat.alamatLengkap}</DetailRow>
      </Section>
    </div>
  );
}

function KtpPhoto({ src, nama }: { src?: string; nama: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-36 w-full max-w-[360px] items-center justify-center rounded-md border border-dashed border-slate-200 text-sm text-slate-400">
        Foto KTP belum dilampirkan
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`Foto KTP ${nama}`}
      onError={() => setFailed(true)}
      className="mt-1 w-full max-w-[360px] rounded-sm"
    />
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
      <p className="mt-0.5 text-[13px] text-slate-400">{subtitle}</p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(7.25rem,32%)_minmax(0,1fr)] items-start gap-x-6 border-b border-slate-200 py-3.5">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800">{children}</dd>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="border-b border-slate-200 py-4 text-sm text-slate-500">{children}</p>;
}
