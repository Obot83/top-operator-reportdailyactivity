'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  MapPin,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ArrowRight,
  Phone,
  User,
  Heart,
  Shield,
  Landmark,
  Wallet,
  Calendar,
  Layers,
  Briefcase,
  Home,
  Check,
  ChevronRight,
  ChevronLeft,
  FileCheck,
  Eye,
  X,
  ChevronDown,
  Building2,
  DollarSign,
  Percent,
  Receipt,
  Download,
} from 'lucide-react';
import type {
  DebiturControllerData,
  VisitLogEntry,
  PTPTrackingData,
  DebtorDocumentItem,
  DebtorJobCapacity,
  DebtorOtherContractItem,
  DebtorCreditCapacity,
} from '@/shared/types';
import { formatRupiah, formatDate, getDpdBadgeVariant, getKolektibilitasLabel } from '@/lib/formatters';
import { VisitTimelineItem } from '@/components/debitur/VisitTimelineItem';
import { PTPTable } from '@/components/debitur/PTPTable';
import { CollateralGallery } from '@/components/debitur/CollateralGallery';

async function fetchControllerData(accountNumber: string): Promise<DebiturControllerData> {
  const res = await fetch(`/api/debitur/${accountNumber}/controller`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function postControllerAction(payload: object) {
  const res = await fetch('/api/debitur/controller/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json;
}

export default function DebiturControllerPage() {
  const params = useParams();
  const readOnly = useSearchParams().get('mode') === 'monitor';
  const accountNumber = params.accountNumber as string;
  const queryClient = useQueryClient();

  // State untuk dropdown analisis di tab daftar kontrak
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);

  // State untuk preview dokumen / berkas
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['debitur-controller', accountNumber],
    queryFn: () => fetchControllerData(accountNumber),
    staleTime: 30_000,
  });

  const actionMutation = useMutation({
    mutationFn: postControllerAction,
    onSuccess: (result) => {
      toast.success(result.message ?? 'Aksi berhasil dijalankan');
      queryClient.invalidateQueries({ queryKey: ['debitur-controller', accountNumber] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <ControllerSkeleton />;
  if (error || !data)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Gagal memuat data: {(error as Error)?.message}</p>
      </div>
    );

  const {
    debitur,
    loanAccount,
    latestPTP,
    activeSpLevel,
    visitTimeline,
    ptpHistory,
    riskScore,
    customerDetail,
    spouse,
    guarantors = [],
    collaterals = [],
    creditCapacity,
    otherContracts = [],
    documents = [],
    jobCapacity,
    productCategory,
    isUmiProduct = false,
    isCertificateProduct = false,
  } = data;

  const handleGenerateSP = (spLevel: string) => {
    const tanggalRespons = new Date();
    tanggalRespons.setDate(tanggalRespons.getDate() + 7);
    actionMutation.mutate({
      action: 'GENERATE_SP',
      accountNumber,
      spLevel,
      tanggalRespons: tanggalRespons.toISOString().split('T')[0],
    });
  };

  const debtorInitials = (debitur?.name || 'D')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
      {/* ── Breadcrumb / Top Bar ────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={readOnly ? '/collection-report/debitur-card' : '/kolektor/debitur-card'}
          className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Kembali ke daftar debitur</span>
        </Link>
        {readOnly && (
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
            Mode Monitoring (Read-Only)
          </span>
        )}
      </div>

      {/* ── Multikontrak Alert Banner (Jika NIK punya > 1 kontrak) ──── */}
      {otherContracts.length > 1 && (
        <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-50/80 via-white to-purple-50/40 dark:from-purple-950/20 dark:via-background dark:to-purple-950/10 p-4 sm:p-5 shadow-2xs space-y-3">
          {/* Top Info Row: Icon + Debtor Context */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
                <Layers className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-foreground">
                    Riwayat Multi-Kontrak
                  </h4>
                  <span className="inline-flex items-center rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700 dark:text-purple-300 border border-purple-500/20">
                    {otherContracts.length} Pengajuan Terdaftar
                  </span>
                  {(debitur.nik || customerDetail?.nik) && (
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-muted/80 px-2 py-0.5 rounded text-foreground font-medium border border-border">
                      <span className="text-[10px] text-muted-foreground font-sans">NIK:</span>{' '}
                      {debitur.nik || customerDetail?.nik}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Debitur memiliki riwayat fasilitas majemuk. Menampilkan kontrak{' '}
                  <span className="font-mono font-semibold text-foreground">{accountNumber}</span>{' '}
                  ({loanAccount.productName} • Status:{' '}
                  <span className={loanAccount.dpd === 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
                    {loanAccount.dpd === 0 ? 'Lancar' : `DPD ${loanAccount.dpd} hari`}
                  </span>
                  ).
                </p>
              </div>
            </div>
          </div>

          {/* Switcher Strip: Scrollable pill bar */}
          <div className="pt-2 border-t border-purple-500/15">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-900/80 dark:text-purple-300/80">
                Beralih Kontrak ({otherContracts.length}):
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                ← Geser untuk melihat semua kontrak →
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
              {otherContracts.map((oc) => (
                <Link
                  key={oc.accountNumber}
                  href={
                    readOnly
                      ? `/dashboard/debitur/${encodeURIComponent(oc.accountNumber)}?mode=monitor`
                      : `/dashboard/debitur/${encodeURIComponent(oc.accountNumber)}`
                  }
                  className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono whitespace-nowrap transition-all shrink-0 ${
                    oc.isCurrent
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm font-semibold'
                      : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border hover:border-purple-300'
                  }`}
                  title={`Tanggal: ${oc.contractDate} | Status: ${oc.status}`}
                >
                  <span>{oc.accountNumber}</span>
                  <span
                    className={`text-[10px] font-sans px-1.5 py-0.2 rounded font-medium ${
                      oc.isCurrent
                        ? 'bg-purple-700/80 text-purple-100'
                        : oc.status === 'AKTIF'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {oc.isCurrent ? 'AKTIF' : oc.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Header Card ────────────────────────────────── */}
      <Card className="border border-border/80 shadow-card bg-card overflow-hidden" data-dpd={loanAccount.dpd}>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            {/* Left: Avatar + Debtor Info */}
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-indigo-500/15 via-primary/10 to-indigo-500/5 border border-primary/20 text-primary font-bold text-base sm:text-lg flex items-center justify-center shrink-0 shadow-2xs">
                {debtorInitials}
              </div>
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {debitur.name}
                  </CardTitle>
                  {debitur.nik && debitur.nik !== '-' && (
                    <span className="inline-flex items-center gap-1 font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground font-semibold border border-border">
                      <span className="text-[10px] text-muted-foreground font-sans">NIK:</span> {debitur.nik}
                    </span>
                  )}
                  {otherContracts.length > 1 && (
                    <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-medium">
                      {otherContracts.length} Pengajuan
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm text-muted-foreground font-mono">
                  <span>Kontrak: <strong className="text-foreground">{accountNumber}</strong></span>
                  <span>•</span>
                  <span>CIF: <strong className="text-foreground">{debitur.cif}</strong></span>
                  <span>•</span>
                  <span className="font-sans text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md font-medium">
                    {loanAccount.productName}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-xs text-muted-foreground pt-0.5">
                  {debitur.phone && (
                    <a
                      href={`tel:${debitur.phone}`}
                      className="inline-flex items-center gap-1.5 font-mono text-foreground hover:text-primary transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{debitur.phone}</span>
                    </a>
                  )}
                  {(debitur.domisiliAddress || debitur.domisiliKota) && (
                    <div className="inline-flex items-start gap-1.5 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="line-clamp-2 sm:line-clamp-1">
                        {debitur.domisiliAddress}
                        {debitur.domisiliKecamatan ? `, Kec. ${debitur.domisiliKecamatan}` : ''}
                        {debitur.domisiliKota ? `, ${debitur.domisiliKota}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: SP Badge if active */}
            {activeSpLevel && (
              <div className="flex items-center md:items-end gap-2.5 shrink-0 self-start md:self-center">
                <div className="rounded-xl border border-rose-300 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-center shadow-2xs">
                  <div className="flex items-center justify-center gap-1 text-rose-700 dark:text-rose-400 font-bold text-[10px] uppercase tracking-wider mb-0.5">
                    <FileText className="h-3 w-3" />
                    <span>Surat SP</span>
                  </div>
                  <p className="text-base font-extrabold text-rose-700 dark:text-rose-400 leading-none">{activeSpLevel}</p>
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-border/60">
            <MetricCard
              label="Baki Debet Pokok"
              value={formatRupiah(loanAccount.bakiDebetPokok)}
              sub={`Plafon: ${formatRupiah(loanAccount.plafon)}`}
            />
            <MetricCard
              label="Saldo Titipan"
              value={formatRupiah(loanAccount.saldoTitipan)}
              sub={loanAccount.saldoTitipan > 0 ? '✓ Tersedia saldo titipan' : 'Tidak ada saldo titipan'}
              highlight={loanAccount.saldoTitipan > 0}
            />
            <MetricCard
              label="DPD & Kolektibilitas"
              value={`${loanAccount.dpd} hari`}
              badge={
                <Badge variant={getDpdBadgeVariant(loanAccount.dpd)} className="text-[11px] font-semibold">
                  {getKolektibilitasLabel(loanAccount.kolektibilitas)}
                </Badge>
              }
            />
            <MetricCard
              label="PTP Terkini"
              value={latestPTP ? formatRupiah(latestPTP.nominalKomitmen) : '-'}
              sub={latestPTP ? `Target: ${formatDate(latestPTP.targetDate)}` : 'Tidak ada komitmen'}
              badge={latestPTP ? <PTPStatusBadge status={latestPTP.status} /> : null}
            />
          </div>

          {/* Risk Factors */}
          {riskScore.factors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-border/40">
              <span className="text-[11px] text-muted-foreground mr-1 self-center">Faktor Risiko:</span>
              {riskScore.factors.map((f, i) => (
                <span key={i} className="text-xs bg-destructive/10 text-destructive border border-destructive/20 px-2.5 py-0.5 rounded-full font-medium">
                  {f}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Tabs Navigation ─────────────────────────────────── */}
      <Tabs defaultValue="profil360">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1">
          <TabsTrigger value="profil360" className="py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <User className="h-4 w-4" />
            Profil 360° Debitur
          </TabsTrigger>
          <TabsTrigger value="contracts" className="py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            Daftar Kontrak
            <span className="ml-1 text-[11px] bg-primary/10 text-primary font-mono rounded-full px-1.5 py-0.2">
              {otherContracts.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Timeline Penanganan
            <span className="ml-1 text-[11px] bg-primary/10 text-primary font-mono rounded-full px-1.5 py-0.2">
              {visitTimeline.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="action" className="py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            {readOnly ? 'Riwayat PTP' : 'PTP & Action Center'}
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: PROFIL 360° DEBITUR ────────────────────────── */}
        <TabsContent value="profil360" className="mt-4 space-y-4">
          {/* 1. Card Data Detail Nasabah, Pasangan & Penjamin (1 Card, Table Format) */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">Informasi Data Detail Nasabah, Pasangan & Penjamin</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Data kependudukan, kontak keluarga, dan penjamin/kontak darurat terverifikasi.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {customerDetail?.nik && customerDetail.nik !== '-' && (
                    <Badge variant="outline" className="font-mono text-xs">
                      NIK: {customerDetail.nik}
                    </Badge>
                  )}
                  <Badge variant={spouse?.hasSpouse ? 'default' : 'secondary'} className="text-xs">
                    {spouse?.hasSpouse ? 'Pasangan: Tercatat' : 'Pasangan: -'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {guarantors.length} Penjamin
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-6 text-xs">
              {/* Bagian A: Data Detail Nasabah */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                  <User className="h-4 w-4 text-primary" />
                  <span>A. Data Detail Nasabah</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-border/80 shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <tbody className="divide-y divide-border/50">
                        <tr className="hover:bg-muted/20 transition-colors">
                          <td className="w-1/6 py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Nama Lengkap</td>
                          <td className="w-2/6 py-2.5 px-3.5 font-semibold text-foreground">
                            {customerDetail?.title ? `${customerDetail.title} ` : ''}
                            {customerDetail?.name || debitur.name}
                          </td>
                          <td className="w-1/6 py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Nomor Handphone</td>
                          <td className="w-2/6 py-2.5 px-3.5 font-mono font-medium text-foreground">
                            {customerDetail?.phone || debitur.phone || '-'}
                          </td>
                        </tr>
                        <tr className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">NIK Nasabah</td>
                          <td className="py-2.5 px-3.5 font-mono font-semibold text-foreground">
                            {customerDetail?.nik || debitur.nik || '-'}
                          </td>
                          <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Jenis Kelamin</td>
                          <td className="py-2.5 px-3.5 font-medium text-foreground">
                            {customerDetail?.gender || debitur.gender || '-'}
                          </td>
                        </tr>
                        <tr className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Tempat / Tgl Lahir</td>
                          <td className="py-2.5 px-3.5 font-medium text-foreground">
                            {customerDetail?.birthPlace || '-'}
                            {customerDetail?.birthDate ? `, ${customerDetail.birthDate}` : ''}
                          </td>
                          <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Usia</td>
                          <td className="py-2.5 px-3.5 font-medium text-foreground">
                            {customerDetail?.age ? `${customerDetail.age} tahun` : '-'}
                          </td>
                        </tr>
                        <tr className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Agama</td>
                          <td className="py-2.5 px-3.5 font-medium text-foreground">{customerDetail?.religion || '-'}</td>
                          <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Status Perkawinan</td>
                          <td className="py-2.5 px-3.5 font-medium text-foreground">{customerDetail?.maritalStatus || '-'}</td>
                        </tr>
                        <tr className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Jumlah Tanggungan</td>
                          <td className="py-2.5 px-3.5 font-medium text-foreground">
                            {customerDetail?.dependentsCount !== undefined ? `${customerDetail.dependentsCount} orang` : '-'}
                          </td>
                          <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Nama Ibu Kandung</td>
                          <td className="py-2.5 px-3.5 font-medium text-foreground">{customerDetail?.motherName || '-'}</td>
                        </tr>
                        <tr className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Pekerjaan / Usaha</td>
                          <td colSpan={3} className="py-2.5 px-3.5 font-medium text-foreground">
                            {customerDetail?.occupation || '-'}
                          </td>
                        </tr>
                        <tr className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap align-top">Alamat KTP</td>
                          <td colSpan={3} className="py-2.5 px-3.5 font-medium text-foreground leading-relaxed">
                            {customerDetail?.ktpAddress || customerDetail?.domisiliAddress || debitur.domisiliAddress || '-'}
                          </td>
                        </tr>
                        {customerDetail?.domisiliAddress && customerDetail.domisiliAddress !== customerDetail.ktpAddress && (
                          <tr className="hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap align-top">Alamat Domisili</td>
                            <td colSpan={3} className="py-2.5 px-3.5 font-medium text-foreground leading-relaxed">
                              {customerDetail.domisiliAddress}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bagian B: Data Pasangan (Suami / Istri) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                    <Heart className="h-4 w-4 text-rose-500" />
                    <span>B. Data Pasangan (Suami / Istri)</span>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      spouse?.hasSpouse
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                        : 'bg-muted text-muted-foreground border-border/60'
                    }`}
                  >
                    {spouse?.hasSpouse ? 'Tercatat Dalam Sistem' : 'Tidak Ada Data Pasangan'}
                  </span>
                </div>
                {spouse?.hasSpouse ? (
                  <div className="overflow-hidden rounded-xl border border-border/80 shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <tbody className="divide-y divide-border/50">
                          <tr className="hover:bg-muted/20 transition-colors">
                            <td className="w-1/6 py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Nama Pasangan</td>
                            <td className="w-2/6 py-2.5 px-3.5 font-semibold text-foreground">{spouse.name || '-'}</td>
                            <td className="w-1/6 py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">NIK Pasangan</td>
                            <td className="w-2/6 py-2.5 px-3.5 font-mono font-medium text-foreground">{spouse.nik || '-'}</td>
                          </tr>
                          <tr className="hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Nomor Handphone</td>
                            <td className="py-2.5 px-3.5 font-mono font-medium text-foreground">{spouse.phone || '-'}</td>
                            <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Pekerjaan</td>
                            <td className="py-2.5 px-3.5 font-medium text-foreground">{spouse.occupation || '-'}</td>
                          </tr>
                          <tr className="hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Tempat / Tgl Lahir</td>
                            <td className="py-2.5 px-3.5 font-medium text-foreground">
                              {spouse.birthPlace || '-'}
                              {spouse.birthDate ? `, ${spouse.birthDate}` : ''}
                            </td>
                            <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Agama</td>
                            <td className="py-2.5 px-3.5 font-medium text-foreground">{spouse.religion || '-'}</td>
                          </tr>
                          {spouse.address && (
                            <tr className="hover:bg-muted/20 transition-colors">
                              <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap align-top">Alamat KTP Pasangan</td>
                              <td colSpan={3} className="py-2.5 px-3.5 font-medium text-foreground leading-relaxed">{spouse.address}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-center text-muted-foreground">
                    <p className="text-xs">
                      Tidak ada data pasangan yang terdaftar. Status pernikahan tercatat:{' '}
                      <strong className="text-foreground">{customerDetail?.maritalStatus || 'Belum Kawin / Janda / Duda'}</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Bagian C: Data Penjamin & Kontak Darurat */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <span>C. Data Penjamin & Kontak Darurat</span>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                    {guarantors.length} Kontak Terdaftar
                  </span>
                </div>
                {guarantors.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-border/80 shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 border-b border-border/80 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="py-3 px-3.5 w-12 text-center">No</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">Nama Penjamin</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">Hubungan</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">NIK Penjamin</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">No. Telepon / HP</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">Pekerjaan</th>
                            <th className="py-3 px-3.5 min-w-[180px]">Alamat</th>
                            <th className="py-3 px-3.5 text-center whitespace-nowrap">Dokumen KTP</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {guarantors.map((g, idx) => (
                            <tr key={idx} className="even:bg-muted/[0.12] hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 px-3.5 text-center font-mono text-muted-foreground">{idx + 1}</td>
                              <td className="py-2.5 px-3.5 font-semibold text-foreground whitespace-nowrap">{g.name}</td>
                              <td className="py-2.5 px-3.5 whitespace-nowrap">
                                <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                  {g.relation}
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5 font-mono font-medium text-foreground whitespace-nowrap">{g.nik || '-'}</td>
                              <td className="py-2.5 px-3.5 font-mono font-medium text-foreground whitespace-nowrap">{g.phone || '-'}</td>
                              <td className="py-2.5 px-3.5 font-medium text-foreground whitespace-nowrap">{g.occupation || '-'}</td>
                              <td className="py-2.5 px-3.5 text-foreground text-[11px] max-w-xs truncate" title={g.address}>
                                {g.address || '-'}
                              </td>
                              <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                                {g.ktpPhotoUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewDoc({ name: `Foto KTP Penjamin (${g.name})`, url: g.ktpPhotoUrl! })}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-medium transition-colors"
                                  >
                                    <Eye className="h-3 w-3" />
                                    <span>Lihat KTP</span>
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground text-[11px] italic">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-center text-muted-foreground">
                    <p className="text-xs">Tidak ada data penjamin khusus tercatat pada pengajuan ini.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2. Card Kapasitas Pekerjaan & Profil Usaha (Format Tabel Kompak & Rapi) */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <CardTitle className="text-base">Kapasitas Pekerjaan & Profil Usaha</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Profil operasional usaha dan analisis kemampuan membayar debitur (cashflow).
                    </p>
                  </div>
                </div>
                {jobCapacity?.dsrCategory && (
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 self-start sm:self-auto">
                    <CheckCircle2 className="h-3 w-3" />
                    DSR {jobCapacity.dsrRatio}% ({jobCapacity.dsrCategory === 'SANGAT_SEHAT' ? 'Sangat Sehat' : 'Sehat'})
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              {/* Tabel Bagian 1: Identitas & Profil Operasional Usaha */}
              <div className="space-y-2">
                <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  Profil Usaha & Pekerjaan
                </span>
                <div className="overflow-hidden rounded-xl border border-border/80 shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <tbody className="divide-y divide-border/50">
                        <tr className="hover:bg-muted/20 transition-colors">
                          <td className="w-1/6 py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Profesi / Pekerjaan</td>
                          <td className="w-2/6 py-2.5 px-3.5 font-semibold text-foreground">
                            {jobCapacity?.occupation || customerDetail?.occupation || 'Pedagang'}
                          </td>
                          <td className="w-1/6 py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Nama Usaha</td>
                          <td className="w-2/6 py-2.5 px-3.5 font-semibold text-foreground">
                            {jobCapacity?.businessName || `Usaha Dagang ${debitur.name}`}
                          </td>
                        </tr>
                        <tr className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Bidang / Sektor Usaha</td>
                          <td className="py-2.5 px-3.5 font-medium text-foreground">
                            {jobCapacity?.businessType || 'Perdagangan & Ritel Kebutuhan Pokok'}
                          </td>
                          <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap">Lama Berusaha</td>
                          <td className="py-2.5 px-3.5 font-medium text-foreground">
                            {jobCapacity?.workPeriod || '3 - 5 Tahun'}
                          </td>
                        </tr>
                        <tr className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap align-top">Lokasi / Alamat Usaha</td>
                          <td colSpan={3} className="py-2.5 px-3.5 font-medium text-foreground leading-relaxed">
                            {jobCapacity?.workAddress || debitur.domisiliAddress}
                            {debitur.domisiliKota ? `, ${debitur.domisiliKota}` : ''}
                          </td>
                        </tr>
                        {jobCapacity?.notes && (
                          <tr className="hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 px-3.5 font-medium text-muted-foreground bg-muted/40 dark:bg-muted/20 border-r border-border/40 whitespace-nowrap align-top">Catatan Survei AO</td>
                            <td colSpan={3} className="py-2.5 px-3.5 text-muted-foreground italic leading-relaxed">
                              {jobCapacity.notes}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Tabel Bagian 2: Analisis Kapasitas Keuangan & Kemampuan Membayar (Cashflow) */}
              <div className="space-y-2">
                <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                  Analisis Kapasitas Keuangan & Kemampuan Membayar (Cashflow)
                </span>
                <div className="overflow-hidden rounded-xl border border-border/80 shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 border-b border-border/80 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="py-3 px-3.5 w-12 text-center">No</th>
                          <th className="py-3 px-3.5">Komponen Keuangan</th>
                          <th className="py-3 px-3.5 text-right whitespace-nowrap">Nominal / Nilai</th>
                          <th className="py-3 px-3.5">Rasio & Keterangan Analisis</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        <tr className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3.5 text-center font-mono text-muted-foreground">1</td>
                          <td className="py-2.5 px-3.5 font-medium text-foreground">Omset / Pendapatan Bruto</td>
                          <td className="py-2.5 px-3.5 font-mono font-semibold text-right text-foreground whitespace-nowrap tabular-nums">
                            {formatRupiah(jobCapacity?.monthlyRevenue || 15000000)}
                          </td>
                          <td className="py-2.5 px-3.5 text-muted-foreground">Rata-rata pendapatan kotor per bulan (hasil survei lapangan)</td>
                        </tr>
                        <tr className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3.5 text-center font-mono text-muted-foreground">2</td>
                          <td className="py-2.5 px-3.5 font-medium text-foreground">Biaya Operasional & Rumah Tangga</td>
                          <td className="py-2.5 px-3.5 font-mono font-semibold text-right text-muted-foreground whitespace-nowrap tabular-nums">
                            {formatRupiah(jobCapacity?.monthlyExpense || 9500000)}
                          </td>
                          <td className="py-2.5 px-3.5 text-muted-foreground">Total biaya operasional usaha + pengeluaran hidup bulanan</td>
                        </tr>
                        <tr className="bg-emerald-500/10 hover:bg-emerald-500/15 border-y border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-medium transition-colors">
                          <td className="py-2.5 px-3.5 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">3</td>
                          <td className="py-2.5 px-3.5 font-bold text-emerald-700 dark:text-emerald-400">Pendapatan Bersih (Net Cashflow)</td>
                          <td className="py-2.5 px-3.5 font-mono font-bold text-right text-emerald-700 dark:text-emerald-400 text-sm whitespace-nowrap tabular-nums">
                            {formatRupiah(jobCapacity?.netIncome || 5500000)}
                          </td>
                          <td className="py-2.5 px-3.5 text-emerald-700 dark:text-emerald-400 font-medium">
                            Sisa kapasitas finansial riil untuk pengembalian pinjaman
                          </td>
                        </tr>
                        <tr className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3.5 text-center font-mono text-muted-foreground">4</td>
                          <td className="py-2.5 px-3.5 font-medium text-foreground">Beban Angsuran Bulanan</td>
                          <td className="py-2.5 px-3.5 font-mono font-semibold text-right text-foreground whitespace-nowrap tabular-nums">
                            {formatRupiah(jobCapacity?.estimatedInstallment || 1200000)}
                          </td>
                          <td className="py-2.5 px-3.5 text-muted-foreground">Estimasi total kewajiban cicilan per bulan</td>
                        </tr>
                        <tr className="bg-muted/30 hover:bg-muted/40 border-t border-border/60 transition-colors">
                          <td className="py-2.5 px-3.5 text-center font-mono text-muted-foreground">5</td>
                          <td className="py-2.5 px-3.5 font-semibold text-foreground">Debt Service Ratio (DSR)</td>
                          <td className="py-2.5 px-3.5 font-mono font-bold text-right text-foreground text-sm whitespace-nowrap tabular-nums">
                            {jobCapacity?.dsrRatio || 22}%
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              {jobCapacity?.dsrCategory === 'SANGAT_SEHAT' ? 'Sangat Sehat' : 'Sehat'} (Batas aman perbankan/koperasi ≤ 35%)
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Baris Lampiran Foto Tempat Usaha jika ada */}
              {jobCapacity?.businessPhotoUrl && (
                <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded border border-border shrink-0 bg-muted overflow-hidden">
                      <img src={jobCapacity.businessPhotoUrl} alt="Foto Usaha" className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground block">Dokumentasi Tempat Usaha Terverifikasi</span>
                      <span className="text-[11px] text-muted-foreground">Foto tempat usaha debitur saat verifikasi AO</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({ name: 'Dokumentasi Tempat Usaha', url: jobCapacity.businessPhotoUrl! })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Lihat Foto Usaha</span>
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3 & 4. Grid untuk Agunan dan Dokumen Legalitas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 3. Data Agunan (Jaminan Fisik Saja) */}
            <Card>
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-amber-500" />
                    <CardTitle className="text-base">Data Agunan (Jaminan)</CardTitle>
                  </div>
                  {isUmiProduct ? (
                    <Badge variant="outline" className="text-xs text-muted-foreground border-border">
                      Tanpa Agunan (Produk UMI)
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs font-semibold">
                      Produk Sertifikat ({collaterals[0]?.files?.length || 0} Berkas Agunan)
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4 text-xs">
                {isUmiProduct ? (
                  <div className="py-8 text-center text-muted-foreground space-y-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-1">
                      <Shield className="h-6 w-6" />
                    </div>
                    <h4 className="font-semibold text-sm text-foreground">
                      Produk Pembiayaan Mikro UMI (Tanpa Agunan Fisik)
                    </h4>
                    <p className="text-xs max-w-sm mx-auto text-muted-foreground leading-relaxed">
                      Sesuai skema pembiayaan UMI (Ultra Mikro), fasilitas pembiayaan ini tidak mempersyaratkan agunan / jaminan fisik dan menggunakan sistem tanggung renteng kelompok.
                    </p>
                  </div>
                ) : collaterals.length > 0 ? (
                  <div className="space-y-4">
                    {collaterals.map((c, idx) => (
                      <div key={idx} className="space-y-3">
                        {/* Ringkasan Properti Agunan */}
                        <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                              <Landmark className="h-4 w-4 text-amber-600" />
                              {c.unitName}
                            </span>
                            {c.certificateType && (
                              <Badge variant="secondary" className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20">
                                {c.certificateType}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-muted-foreground block text-[10px]">Nilai Taksasi Pasar</span>
                              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                                {c.taksasi ? formatRupiah(c.taksasi) : 'Taksasi Surveyor'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[10px]">Lokasi / Wilayah</span>
                              <span className="font-medium text-foreground">{c.location || debitur.domisiliKota || '-'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Berkas & Foto Agunan */}
                        {c.files && c.files.length > 0 && (
                          <div className="pt-2">
                            <CollateralGallery files={c.files} leadId={c.leadId} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground space-y-1">
                    <Landmark className="h-8 w-8 mx-auto text-muted-foreground/40 mb-1" />
                    <p className="font-medium text-foreground">Berkas Agunan Tidak Ditemukan</p>
                    <p className="text-[11px] max-w-xs mx-auto">
                      Tidak ditemukan berkas agunan fisik untuk nomor rekening ini.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 4. Card Data Dokumen (KTP, KK, Buku Nikah, NPWP, TTD, dll) */}
            <Card>
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-blue-500" />
                    <CardTitle className="text-base">Data Dokumen & Legalitas</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {documents.length || 5} Berkas Terdata
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 text-xs space-y-3">
                {documents.length > 0 ? (
                  <div className="divide-y divide-border/60">
                    {documents.map((doc) => (
                      <div key={doc.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground text-xs">{doc.name}</span>
                            <span
                              className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                doc.status === 'TERVERIFIKASI'
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                  : doc.status === 'TERLAMPIR'
                                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              ✓ {doc.status}
                            </span>
                          </div>
                          {doc.number && (
                            <p className="font-mono text-[11px] text-muted-foreground">
                              No: <strong className="text-foreground">{doc.number}</strong>
                            </p>
                          )}
                          {doc.notes && <p className="text-[10px] text-muted-foreground">{doc.notes}</p>}
                        </div>

                        {doc.url ? (
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({ name: doc.name, url: doc.url! })}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-medium shrink-0 transition-colors"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Lihat</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic shrink-0">Arsip Fisik</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-muted-foreground">
                    <p>Tidak ada berkas dokumen khusus terdata.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB 2: DAFTAR KONTRAK LAINNYA & HISTORI PENGAJUAN ── */}
        <TabsContent value="contracts" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4 text-purple-600" />
                    Daftar Seluruh Kontrak & Pengajuan Kredit Debitur
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Histori seluruh fasilitas kredit untuk NIK:{' '}
                    <span className="font-mono font-semibold text-foreground">{debitur.nik || customerDetail?.nik || '-'}</span> (
                    {debitur.name})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Total: {otherContracts.length} Pengajuan
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {otherContracts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Tidak ada data kontrak lainnya untuk debitur ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border/80 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <tr>
                        <th className="px-3.5 py-3 whitespace-nowrap">No. Rekening / Kontrak</th>
                        <th className="px-3.5 py-3 whitespace-nowrap">Produk Pinjaman</th>
                        <th className="px-3.5 py-3 whitespace-nowrap">Tanggal Akad</th>
                        <th className="px-3.5 py-3 text-right whitespace-nowrap">Plafon</th>
                        <th className="px-3.5 py-3 text-right whitespace-nowrap">Baki Debet Pokok</th>
                        <th className="px-3.5 py-3 text-center whitespace-nowrap">Tenor</th>
                        <th className="px-3.5 py-3 whitespace-nowrap">DPD & Kol</th>
                        <th className="px-3.5 py-3 text-center whitespace-nowrap">Status</th>
                        <th className="px-3.5 py-3 text-center whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {otherContracts.map((c) => {
                        const targetHref = readOnly
                          ? `/dashboard/debitur/${encodeURIComponent(c.accountNumber)}?mode=monitor`
                          : `/dashboard/debitur/${encodeURIComponent(c.accountNumber)}`;
                        const isExpanded = expandedContractId === c.accountNumber;

                        return (
                          <React.Fragment key={c.accountNumber}>
                            <tr
                              className={`transition-colors ${
                                c.isCurrent
                                  ? 'bg-purple-500/10 font-medium'
                                  : isExpanded
                                  ? 'bg-muted/40'
                                  : 'even:bg-muted/[0.12] hover:bg-muted/30'
                              }`}
                            >
                              <td className="px-3.5 py-3 font-mono">
                                <div className="flex items-center gap-1.5">
                                  {c.isCurrent ? (
                                    <span className="font-bold text-purple-700 dark:text-purple-300">
                                      {c.accountNumber}
                                    </span>
                                  ) : (
                                    <Link href={targetHref} className="text-primary hover:underline font-semibold">
                                      {c.accountNumber}
                                    </Link>
                                  )}
                                  {c.isCurrent && (
                                    <span className="rounded-full bg-purple-600 text-white text-[9px] px-1.5 py-0.2 font-sans font-bold">
                                      Sedang Ditampilkan
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3.5 py-3 font-medium text-foreground">{c.productName}</td>
                              <td className="px-3.5 py-3 text-muted-foreground whitespace-nowrap">{c.contractDate}</td>
                              <td className="px-3.5 py-3 text-right font-mono font-medium text-foreground tabular-nums">
                                {formatRupiah(c.plafon)}
                              </td>
                              <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {formatRupiah(c.bakiDebetPokok)}
                              </td>
                              <td className="px-3.5 py-3 text-center font-mono">
                                <span className="inline-flex items-center justify-center font-mono font-semibold px-2 py-0.5 rounded bg-muted/60 text-foreground text-[11px]">
                                  {c.tenor}{' '}
                                  {(c.productName || '').toUpperCase().includes('SERTIFIKAT') ||
                                  (c.creditCapacity?.tenorType || '').toUpperCase() === 'BULAN' ||
                                  (c.accountNumber || '').startsWith('10.') ||
                                  (c.accountNumber || '').startsWith('01.') ||
                                  c.plafon > 15000000
                                    ? 'bln'
                                    : 'mg'}
                                </span>
                              </td>
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[11px] font-semibold">{c.dpd} hr</span>
                                  <Badge variant={getDpdBadgeVariant(c.dpd)} className="text-[9px] py-0 px-1 font-semibold">
                                    {getKolektibilitasLabel(c.kolektibilitas)}
                                  </Badge>
                                </div>
                              </td>
                              <td className="px-3.5 py-3 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    c.status === 'AKTIF'
                                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                      : c.status === 'LUNAS'
                                      ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                      : 'bg-muted text-muted-foreground border border-border'
                                  }`}
                                >
                                  {c.status}
                                </span>
                              </td>
                              <td className="px-3.5 py-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* Dropdown Toggle Button (Accordion seperti di menu daftar leads) */}
                                  <button
                                    type="button"
                                    onClick={() => setExpandedContractId(isExpanded ? null : c.accountNumber)}
                                    aria-expanded={isExpanded}
                                    aria-label={`Toggle dropdown analisis ${c.accountNumber}`}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors ${
                                      isExpanded
                                        ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300'
                                        : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                                    }`}
                                    title="Dropdown Analisis Pengajuan"
                                  >
                                    <ChevronDown
                                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                        isExpanded ? 'rotate-180' : ''
                                      }`}
                                    />
                                    <span>Analisis</span>
                                  </button>

                                  {/* Buka Kontrak Ini */}
                                  {c.isCurrent ? (
                                    <span className="text-[11px] text-muted-foreground italic flex items-center gap-1 px-1.5">
                                      <Check className="h-3 w-3 text-purple-600" /> Terpilih
                                    </span>
                                  ) : (
                                    <Link
                                      href={targetHref}
                                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 text-[11px] font-semibold transition-colors"
                                    >
                                      <span>Buka</span>
                                      <ArrowRight className="h-3 w-3" />
                                    </Link>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Dropdown Accordion Panel Row (Persis seperti di Daftar Leads) */}
                            {isExpanded && (
                              <tr className="bg-slate-50/90 dark:bg-slate-900/60 border-b border-border/80">
                                <td colSpan={9} className="p-4 sm:p-5">
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h5 className="text-xs font-bold text-foreground flex items-center gap-2">
                                        <Wallet className="h-3.5 w-3.5 text-blue-600" />
                                        Detail Kapasitas Kredit & Analisis Pengajuan — Rekening{' '}
                                        <span className="font-mono text-purple-700 dark:text-purple-300">
                                          {c.accountNumber}
                                        </span>
                                      </h5>
                                    </div>

                                    <ContractAnalysisDetail
                                      contract={c}
                                      creditCapacity={c.creditCapacity || creditCapacity}
                                      loanAccount={loanAccount}
                                    />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 3: TIMELINE PENANGANAN ───────────────────────── */}
        <TabsContent value="timeline" className="mt-4">
          {visitTimeline.length === 0 ? (
            <EmptyState message="Belum ada rekam jejak kunjungan" />
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4">
                {visitTimeline.map((visit, idx) => (
                  <VisitTimelineItem key={visit.id} visit={visit} isFirst={idx === 0} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── TAB 4: PTP & ACTION CENTER ────────────────────────── */}
        <TabsContent value="action" className="mt-4 space-y-4">
          <PTPTable ptpHistory={ptpHistory} />

          {readOnly ? null : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tombol Intervensi Operasional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Surat Peringatan */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Surat Peringatan (SP)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cetak dokumen Surat Peringatan resmi bagi debitur yang menunggak atau melanggar janji bayar.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['SP1', 'SP2', 'SP3'].map((sp) => (
                      <Button
                        key={sp}
                        variant="outline"
                        size="sm"
                        disabled={actionMutation.isPending}
                        onClick={() => handleGenerateSP(sp)}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Cetak {sp}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>


      {/* ── Modal Preview Dokumen Gambar ──────────────────────────── */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative max-w-2xl w-full rounded-2xl bg-card border border-border p-4 shadow-elevated">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h4 className="text-sm font-bold text-foreground">{previewDoc.name}</h4>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Tutup preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 max-h-[75vh] overflow-auto flex items-center justify-center bg-black/5 rounded-xl p-2">
              <img src={previewDoc.url} alt={previewDoc.name} className="max-h-[70vh] w-auto rounded-lg object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────

/**
 * Komponen reusable untuk analisis kapasitas kredit & rekomendasi komite
 * Digunakan di dropdown row maupun di modal dialog tab Daftar Kontrak
 */
function ContractAnalysisDetail({
  contract,
  creditCapacity,
  loanAccount,
}: {
  contract: DebtorOtherContractItem;
  creditCapacity?: DebtorCreditCapacity;
  loanAccount: any;
}) {
  const plafonRealisasi = contract.plafon || loanAccount.plafon;
  const plafonPengajuan = creditCapacity?.plafonPengajuan || plafonRealisasi;
  const tenor = creditCapacity?.tenorPengajuan || contract.tenor;
  const angsuran = creditCapacity?.angsuranEstimasi || Math.round((plafonRealisasi / (tenor || 30)) * 1.15);

  const isCertificateProduct =
    (creditCapacity?.tenorType || '').toUpperCase() === 'BULAN' ||
    (contract.productName || '').toUpperCase().includes('SERTIFIKAT') ||
    (loanAccount.productName || '').toUpperCase().includes('SERTIFIKAT') ||
    (contract.accountNumber || '').startsWith('10.') ||
    (contract.accountNumber || '').startsWith('01.') ||
    contract.plafon > 15000000;

  const tenorUnit = isCertificateProduct ? 'Bulan' : 'Minggu';

  return (
    <div className="space-y-4 text-xs">
      {/* 4 Box Metrik Pengajuan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border/80 bg-background p-3">
          <span className="text-muted-foreground block text-[11px]">Plafon Pengajuan</span>
          <span className="font-mono font-bold text-foreground text-sm block mt-0.5">
            {formatRupiah(plafonPengajuan)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Tenor: {tenor} {isCertificateProduct ? 'BULAN' : (creditCapacity?.tenorType || 'Minggu')}
          </span>
        </div>

        <div className="rounded-lg border border-border/80 bg-background p-3">
          <span className="text-muted-foreground block text-[11px]">Plafon Realisasi (Cair)</span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm block mt-0.5">
            {formatRupiah(plafonRealisasi)}
          </span>
          <span className="text-[10px] text-muted-foreground">Disetujui Komite</span>
        </div>

        <div className="rounded-lg border border-border/80 bg-background p-3">
          <span className="text-muted-foreground block text-[11px]">Angsuran per Periode</span>
          <span className="font-mono font-bold text-foreground text-sm block mt-0.5">
            {formatRupiah(angsuran)}
          </span>
          <span className="text-[10px] text-muted-foreground">Pokok + Jasa</span>
        </div>

        <div className="rounded-lg border border-border/80 bg-background p-3">
          <span className="text-muted-foreground block text-[11px]">Tujuan & Paket</span>
          <span className="font-semibold text-foreground text-sm block mt-0.5 truncate">
            {creditCapacity?.loanPurpose || 'Modal Usaha (Produktif)'}
          </span>
          <span className="text-[10px] text-muted-foreground truncate block">
            Grade: {creditCapacity?.scoringGrade || 'A'}
          </span>
        </div>
      </div>

      {/* Rekomendasi Surveyor AO & Credit Analyst */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border/80 p-3 space-y-1.5 bg-background">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> Rekomendasi Surveyor / AO
            </span>
            <Badge variant="outline" className="text-[10px]">
              {creditCapacity?.surveyorRecommendation?.status || 'REKOMENDASI'}
            </Badge>
          </div>
          <div className="text-[11px] space-y-1 text-muted-foreground">
            <p>
              Plafon Usulan:{' '}
              <span className="font-mono font-medium text-foreground">
                {formatRupiah(creditCapacity?.surveyorRecommendation?.plafon || plafonRealisasi)}
              </span>
              {creditCapacity?.surveyorRecommendation?.tenor ? ` (${creditCapacity.surveyorRecommendation.tenor} ${tenorUnit})` : ''}
            </p>
            <p>
              Petugas AO:{' '}
              <span className="font-medium text-foreground">
                {creditCapacity?.surveyorRecommendation?.officerName || 'Petugas AO Lapangan'}
              </span>
            </p>
            <p className="italic text-foreground mt-1 bg-muted/40 p-2 rounded">
              &ldquo;{creditCapacity?.surveyorRecommendation?.keterangan || 'Usaha aktif berjalan lancar dan memenuhi kriteria kelayakan pembiayaan.'}&rdquo;
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border/80 p-3 space-y-1.5 bg-background">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Rekomendasi Credit Analyst
            </span>
            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
              {creditCapacity?.analystRecommendation?.status || 'REKOMENDASI'}
            </Badge>
          </div>
          <div className="text-[11px] space-y-1 text-muted-foreground">
            <p>
              Plafon Disetujui:{' '}
              <span className="font-mono font-medium text-foreground">
                {formatRupiah(creditCapacity?.analystRecommendation?.plafon || plafonRealisasi)}
              </span>
              {creditCapacity?.analystRecommendation?.tenor ? ` (${creditCapacity.analystRecommendation.tenor} ${tenorUnit})` : ''}
            </p>
            <p>
              Analis Kredit:{' '}
              <span className="font-medium text-foreground">
                {creditCapacity?.analystRecommendation?.analystName || 'Analis Kredit Cabang'}
              </span>
            </p>
            <p className="italic text-foreground mt-1 bg-muted/40 p-2 rounded">
              &ldquo;{creditCapacity?.analystRecommendation?.keterangan || 'Kapasitas bayar (DSR) sehat dan kemampuan angsuran memadai untuk direalisasikan.'}&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  badge,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  badge?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3.5 transition-all duration-150 ${
        highlight
          ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20'
          : 'border-border/80 bg-muted/20 dark:bg-muted/10'
      }`}
    >
      <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</p>
      <div className="flex items-baseline justify-between gap-2 mt-1">
        <p className="text-base sm:text-lg font-bold text-foreground tabular-nums tracking-tight">{value}</p>
        {badge}
      </div>
      {sub && (
        <p
          className={`text-xs mt-1 truncate ${
            highlight ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-muted-foreground'
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function PTPStatusBadge({ status }: { status: string }) {
  const config = {
    PENDING: { label: 'Menunggu', variant: 'secondary' as const },
    HONORED: { label: 'Terpenuhi', variant: 'default' as const },
    BROKEN: { label: 'Dilanggar', variant: 'destructive' as const },
  };
  const c = config[status as keyof typeof config] ?? { label: status, variant: 'outline' as const };
  return <Badge variant={c.variant} className="text-[10px] font-semibold">{c.label}</Badge>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Clock className="h-10 w-10 text-muted-foreground mb-3" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

function ControllerSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
