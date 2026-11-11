'use client';

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
  Zap,
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
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import type { DebiturControllerData, VisitLogEntry, PTPTrackingData } from '@/shared/types';
import { formatRupiah, formatDate, getDpdBadgeVariant, getKolektibilitasLabel } from '@/lib/formatters';
import { VisitTimelineItem } from '@/components/debitur/VisitTimelineItem';
import { PTPTable } from '@/components/debitur/PTPTable';

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

  const handleToggleAutodebit = () => {
    actionMutation.mutate({
      action: 'TOGGLE_AUTODEBIT',
      accountNumber,
      enable: !loanAccount.autodebitEnabled,
    });
  };

  const handleAlihkanRemedial = () => {
    if (!confirm('Yakin akan mengalihkan rekening ini ke unit remedial?')) return;
    actionMutation.mutate({
      action: 'ALIHKAN_REMEDIAL',
      accountNumber,
      catatan: 'Pengalihan manual dari Back Office',
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
      {/* ── Breadcrumb / Top Bar ────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={readOnly ? '/collection-report/debitur-card' : '/kolektor/debitur-card'}
          className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"
        >
          ← Kembali ke daftar debitur
        </Link>
        {readOnly && (
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
            Mode Monitoring (Read-Only)
          </span>
        )}
      </div>

      {/* ── Multikontrak Alert Banner (Jika NIK punya > 1 kontrak) ──── */}
      {otherContracts.length > 1 && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-foreground">
                  Riwayat Multi-Kontrak ({otherContracts.length} Pengajuan Terdaftar)
                </h4>
                <Badge variant="outline" className="border-purple-500/30 text-purple-700 dark:text-purple-300 text-[10px]">
                  NIK: {debitur.nik || customerDetail?.nik || '-'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Debitur memiliki beberapa riwayat pinjaman/akad. Sedang menampilkan kontrak{' '}
                <span className="font-mono font-semibold text-foreground">{accountNumber}</span> ({loanAccount.productName} - Status:{' '}
                <span className={loanAccount.dpd === 0 ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                  {loanAccount.dpd === 0 ? 'Lancar' : `DPD ${loanAccount.dpd} hari`}
                </span>
                ).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap self-end md:self-center shrink-0">
            <span className="text-xs text-muted-foreground mr-1">Beralih kontrak:</span>
            {otherContracts.map((oc) => (
              <Link
                key={oc.accountNumber}
                href={
                  readOnly
                    ? `/dashboard/debitur/${encodeURIComponent(oc.accountNumber)}?mode=monitor`
                    : `/dashboard/debitur/${encodeURIComponent(oc.accountNumber)}`
                }
                className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-colors ${
                  oc.isCurrent
                    ? 'bg-purple-600 text-white border-purple-600 font-semibold shadow-sm'
                    : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                }`}
                title={`Tanggal: ${oc.contractDate} | Status: ${oc.status}`}
              >
                {oc.accountNumber}
                <span className="text-[10px] ml-1 opacity-80">({oc.status})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Header Card ────────────────────────────────── */}
      <Card className="border-2" data-dpd={loanAccount.dpd}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <User className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xl">{debitur.name}</CardTitle>
                {debitur.nik && debitur.nik !== '-' && (
                  <span className="inline-flex items-center gap-1 font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground font-semibold border border-border">
                    <span className="text-[10px] text-muted-foreground font-sans">NIK:</span> {debitur.nik}
                  </span>
                )}
                {otherContracts.length > 1 && (
                  <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300">
                    {otherContracts.length} Pengajuan
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground font-mono">
                <span>Kontrak: {accountNumber}</span>
                <span>•</span>
                <span>CIF: {debitur.cif}</span>
                <span>•</span>
                <span className="font-sans text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  {loanAccount.productName}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm font-mono">{debitur.phone}</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {debitur.domisiliAddress}
                  {debitur.domisiliKecamatan ? `, Kec. ${debitur.domisiliKecamatan}` : ''}
                  {debitur.domisiliKota ? `, ${debitur.domisiliKota}` : ''}
                </span>
              </div>
            </div>

            {/* Risk Score & SP Badge */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <RiskScoreBadge score={riskScore.score} label={riskScore.label} />
              {activeSpLevel && (
                <Badge variant="destructive" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  {activeSpLevel}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              label="Baki Debet Pokok"
              value={formatRupiah(loanAccount.bakiDebetPokok)}
              sub={`Plafon: ${formatRupiah(loanAccount.plafon)}`}
            />
            <MetricCard
              label="Saldo Titipan"
              value={formatRupiah(loanAccount.saldoTitipan)}
              sub={loanAccount.saldoTitipan > 0 ? '✓ Tersedia saldo' : 'Tidak ada saldo'}
              highlight={loanAccount.saldoTitipan > 0}
            />
            <MetricCard
              label="DPD & Kolektibilitas"
              value={`${loanAccount.dpd} hari`}
              badge={
                <Badge variant={getDpdBadgeVariant(loanAccount.dpd)} className="text-xs mt-1">
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
            <div className="mt-3 flex flex-wrap gap-1">
              {riskScore.factors.map((f, i) => (
                <span key={i} className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. Data Detail Nasabah */}
            <Card>
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Data Detail Nasabah</CardTitle>
                  </div>
                  {customerDetail?.nik && customerDetail.nik !== '-' && (
                    <Badge variant="outline" className="font-mono text-xs">
                      NIK: {customerDetail.nik}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4 text-xs space-y-2.5">
                <div className="grid grid-cols-2 gap-2 pb-2 border-b border-border/40">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Nama Lengkap</span>
                    <span className="font-semibold text-foreground text-sm">
                      {customerDetail?.title ? `${customerDetail.title} ` : ''}
                      {customerDetail?.name || debitur.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Nomor Handphone</span>
                    <span className="font-mono font-medium text-foreground text-sm">
                      {customerDetail?.phone || debitur.phone}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Jenis Kelamin</span>
                    <span className="font-medium text-foreground">{customerDetail?.gender || debitur.gender || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Tempat / Tgl Lahir</span>
                    <span className="font-medium text-foreground">
                      {customerDetail?.birthPlace || '-'}
                      {customerDetail?.birthDate ? `, ${customerDetail.birthDate}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Usia</span>
                    <span className="font-medium text-foreground">
                      {customerDetail?.age ? `${customerDetail.age} tahun` : '-'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Agama</span>
                    <span className="font-medium text-foreground">{customerDetail?.religion || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Status Kawin</span>
                    <span className="font-medium text-foreground">{customerDetail?.maritalStatus || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Tanggungan</span>
                    <span className="font-medium text-foreground">
                      {customerDetail?.dependentsCount !== undefined ? `${customerDetail.dependentsCount} orang` : '-'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Pekerjaan / Bidang Usaha</span>
                    <span className="font-medium text-foreground">{customerDetail?.occupation || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Nama Gadis Ibu Kandung</span>
                    <span className="font-medium text-foreground">{customerDetail?.motherName || '-'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 space-y-1.5">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Alamat KTP</span>
                    <p className="font-medium text-foreground leading-relaxed">
                      {customerDetail?.ktpAddress || customerDetail?.domisiliAddress || debitur.domisiliAddress}
                    </p>
                  </div>
                  {customerDetail?.domisiliAddress && customerDetail.domisiliAddress !== customerDetail.ktpAddress && (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Alamat Domisili</span>
                      <p className="font-medium text-foreground leading-relaxed">{customerDetail.domisiliAddress}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 2. Data Pasangan (Spouse) */}
            <Card>
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-rose-500" />
                    <CardTitle className="text-base">Data Pasangan (Suami / Istri)</CardTitle>
                  </div>
                  <Badge variant={spouse?.hasSpouse ? 'default' : 'outline'} className="text-xs">
                    {spouse?.hasSpouse ? 'Tercatat' : 'Tidak Ada'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 text-xs">
                {spouse?.hasSpouse ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 pb-2 border-b border-border/40">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Nama Pasangan</span>
                        <span className="font-semibold text-foreground text-sm">{spouse.name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">NIK Pasangan</span>
                        <span className="font-mono font-medium text-foreground">{spouse.nik || '-'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">No. Handphone</span>
                        <span className="font-mono font-medium text-foreground">{spouse.phone || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Pekerjaan</span>
                        <span className="font-medium text-foreground">{spouse.occupation || '-'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Tempat / Tgl Lahir</span>
                        <span className="font-medium text-foreground">
                          {spouse.birthPlace || '-'}
                          {spouse.birthDate ? `, ${spouse.birthDate}` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Agama</span>
                        <span className="font-medium text-foreground">{spouse.religion || '-'}</span>
                      </div>
                    </div>

                    {spouse.address && (
                      <div className="pt-2 border-t border-border/40">
                        <span className="text-muted-foreground block text-[11px]">Alamat KTP Pasangan</span>
                        <p className="font-medium text-foreground leading-relaxed">{spouse.address}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground space-y-1">
                    <Heart className="h-8 w-8 mx-auto text-muted-foreground/40 mb-1" />
                    <p className="font-medium">Tidak ada data pasangan yang terdaftar</p>
                    <p className="text-[11px]">
                      Status pernikahan tercatat: {customerDetail?.maritalStatus || 'Belum Kawin / Janda / Duda'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. Data Penjamin (LEC / Emergency Contacts) */}
            <Card>
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <CardTitle className="text-base">Data Penjamin & Kontak Darurat</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {guarantors.length} Penjamin
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 text-xs">
                {guarantors.length > 0 ? (
                  <div className="space-y-3">
                    {guarantors.map((g, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground text-sm">{g.name}</span>
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                            {g.relation}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-muted-foreground block">NIK Penjamin</span>
                            <span className="font-mono font-medium text-foreground">{g.nik || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">No. Telepon / HP</span>
                            <span className="font-mono font-medium text-foreground">{g.phone || '-'}</span>
                          </div>
                        </div>
                        {g.occupation && (
                          <div className="text-[11px]">
                            <span className="text-muted-foreground block">Pekerjaan</span>
                            <span className="font-medium text-foreground">{g.occupation}</span>
                          </div>
                        )}
                        {g.address && (
                          <div className="text-[11px]">
                            <span className="text-muted-foreground block">Alamat</span>
                            <p className="font-medium text-foreground leading-relaxed">{g.address}</p>
                          </div>
                        )}
                        {g.ktpPhotoUrl && (
                          <div className="pt-1">
                            <span className="text-[10px] text-muted-foreground block mb-1">Lampiran Dokumen</span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
                              <Camera className="h-3 w-3" /> Foto KTP Penjamin Terlampir
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground space-y-1">
                    <Shield className="h-8 w-8 mx-auto text-muted-foreground/40 mb-1" />
                    <p className="font-medium">Tidak ada data penjamin khusus</p>
                    <p className="text-[11px]">Tidak ada kontak darurat/penjamin tercatat pada pengajuan ini.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 4. Data Agunan (Collateral) */}
            <Card>
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-amber-500" />
                    <CardTitle className="text-base">Data Agunan (Jaminan)</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {collaterals.length > 0 ? `${collaterals.length} Agunan` : 'Tanpa Agunan'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 text-xs">
                {collaterals.length > 0 ? (
                  <div className="space-y-3">
                    {collaterals.map((c, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground text-sm">{c.unitName}</span>
                          {c.certificateType && (
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              {c.certificateType}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-muted-foreground block">Nilai Taksasi Pasar</span>
                            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {c.taksasi ? formatRupiah(c.taksasi) : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Lokasi / Wilayah</span>
                            <span className="font-medium text-foreground">{c.location || '-'}</span>
                          </div>
                        </div>
                        {c.typeMerk && (
                          <div className="text-[11px]">
                            <span className="text-muted-foreground block">Merk / Tipe</span>
                            <span className="font-medium text-foreground">{c.typeMerk}</span>
                          </div>
                        )}
                        {c.description && (
                          <div className="text-[11px]">
                            <span className="text-muted-foreground block">Keterangan Agunan</span>
                            <p className="font-medium text-foreground">{c.description}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground space-y-1">
                    <Landmark className="h-8 w-8 mx-auto text-muted-foreground/40 mb-1" />
                    <p className="font-medium text-foreground">Pembiayaan Tanpa Agunan Fisik</p>
                    <p className="text-[11px] max-w-xs mx-auto">
                      Produk pembiayaan mikro / kelompok tanpa agunan fisik dengan skema tanggung renteng.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 5. Kapasitas Kredit & Penilaian Pengajuan (Full Width) */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-blue-500" />
                    <CardTitle className="text-base">Kapasitas Kredit & Analisis Pengajuan</CardTitle>
                  </div>
                  {creditCapacity?.scoringGrade && (
                    <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                      Scoring Grade: {creditCapacity.scoringGrade}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4 text-xs space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <span className="text-muted-foreground block text-[11px]">Plafon Pengajuan</span>
                    <span className="font-mono font-bold text-foreground text-sm block mt-0.5">
                      {formatRupiah(creditCapacity?.plafonPengajuan || loanAccount.plafon)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Tenor: {creditCapacity?.tenorPengajuan || loanAccount.tenorMinggu} {creditCapacity?.tenorType || 'Minggu'}
                    </span>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <span className="text-muted-foreground block text-[11px]">Plafon Realisasi (Cair)</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm block mt-0.5">
                      {formatRupiah(loanAccount.plafon)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Disetujui komite</span>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <span className="text-muted-foreground block text-[11px]">Angsuran per Periode</span>
                    <span className="font-mono font-bold text-foreground text-sm block mt-0.5">
                      {formatRupiah(loanAccount.totalAngsuran || creditCapacity?.angsuranEstimasi || 0)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Pokok + Jasa</span>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <span className="text-muted-foreground block text-[11px]">Tujuan Pinjaman</span>
                    <span className="font-semibold text-foreground text-sm block mt-0.5">
                      {creditCapacity?.loanPurpose || 'Modal Usaha (Produktif)'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{creditCapacity?.paketName || '-'}</span>
                  </div>
                </div>

                {/* Rekomendasi Surveyor & Komite Kredit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="rounded-lg border border-border/80 p-3 space-y-1.5 bg-background">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> Rekomendasi Surveyor / AO
                      </span>
                      {creditCapacity?.surveyorRecommendation?.status && (
                        <Badge variant="outline" className="text-[10px]">
                          {creditCapacity.surveyorRecommendation.status}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] space-y-1 text-muted-foreground">
                      <p>
                        Plafon Usulan:{' '}
                        <span className="font-mono font-medium text-foreground">
                          {creditCapacity?.surveyorRecommendation?.plafon
                            ? formatRupiah(creditCapacity.surveyorRecommendation.plafon)
                            : '-'}
                        </span>
                        {creditCapacity?.surveyorRecommendation?.tenor ? ` (${creditCapacity.surveyorRecommendation.tenor} Minggu)` : ''}
                      </p>
                      <p>
                        Petugas AO:{' '}
                        <span className="font-medium text-foreground">
                          {creditCapacity?.surveyorRecommendation?.officerName || '-'}
                        </span>
                      </p>
                      {creditCapacity?.surveyorRecommendation?.keterangan && (
                        <p className="italic text-foreground mt-1 bg-muted/30 p-1.5 rounded">
                          &ldquo;{creditCapacity.surveyorRecommendation.keterangan}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/80 p-3 space-y-1.5 bg-background">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Rekomendasi Credit Analyst
                      </span>
                      {creditCapacity?.analystRecommendation?.status && (
                        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                          {creditCapacity.analystRecommendation.status}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] space-y-1 text-muted-foreground">
                      <p>
                        Plafon Disetujui:{' '}
                        <span className="font-mono font-medium text-foreground">
                          {creditCapacity?.analystRecommendation?.plafon
                            ? formatRupiah(creditCapacity.analystRecommendation.plafon)
                            : formatRupiah(loanAccount.plafon)}
                        </span>
                        {creditCapacity?.analystRecommendation?.tenor ? ` (${creditCapacity.analystRecommendation.tenor} Minggu)` : ''}
                      </p>
                      <p>
                        Analis Kredit:{' '}
                        <span className="font-medium text-foreground">
                          {creditCapacity?.analystRecommendation?.analystName || '-'}
                        </span>
                      </p>
                      {creditCapacity?.analystRecommendation?.keterangan && (
                        <p className="italic text-foreground mt-1 bg-muted/30 p-1.5 rounded">
                          &ldquo;{creditCapacity.analystRecommendation.keterangan}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                </div>
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
                    <thead className="bg-muted/40 text-left uppercase tracking-wider text-muted-foreground font-semibold">
                      <tr>
                        <th className="px-4 py-3">No. Rekening / Kontrak</th>
                        <th className="px-4 py-3">Produk Pinjaman</th>
                        <th className="px-4 py-3">Tanggal Akad</th>
                        <th className="px-4 py-3 text-right">Plafon</th>
                        <th className="px-4 py-3 text-right">Baki Debet Pokok</th>
                        <th className="px-4 py-3 text-center">Tenor</th>
                        <th className="px-4 py-3">DPD & Kol</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {otherContracts.map((c) => {
                        const targetHref = readOnly
                          ? `/dashboard/debitur/${encodeURIComponent(c.accountNumber)}?mode=monitor`
                          : `/dashboard/debitur/${encodeURIComponent(c.accountNumber)}`;

                        return (
                          <tr
                            key={c.accountNumber}
                            className={`transition-colors ${
                              c.isCurrent
                                ? 'bg-purple-500/10 font-medium'
                                : 'hover:bg-muted/30'
                            }`}
                          >
                            <td className="px-4 py-3 font-mono">
                              <div className="flex items-center gap-1.5">
                                {c.isCurrent ? (
                                  <span className="font-bold text-purple-700 dark:text-purple-300">
                                    {c.accountNumber}
                                  </span>
                                ) : (
                                  <Link href={targetHref} className="text-primary hover:underline">
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
                            <td className="px-4 py-3 font-medium text-foreground">{c.productName}</td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{c.contractDate}</td>
                            <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                              {formatRupiah(c.plafon)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatRupiah(c.bakiDebetPokok)}
                            </td>
                            <td className="px-4 py-3 text-center font-mono">{c.tenor} mg</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px]">{c.dpd} hr</span>
                                <Badge variant={getDpdBadgeVariant(c.dpd)} className="text-[9px] py-0 px-1">
                                  {getKolektibilitasLabel(c.kolektibilitas)}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
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
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {c.isCurrent ? (
                                <span className="text-[11px] text-muted-foreground italic flex items-center justify-center gap-1">
                                  <Check className="h-3 w-3 text-purple-600" /> Terpilih
                                </span>
                              ) : (
                                <Link
                                  href={targetHref}
                                  className="inline-flex items-center gap-1 rounded bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 text-[11px] font-semibold transition-colors"
                                >
                                  Buka Kontrak Ini
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              )}
                            </td>
                          </tr>
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
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Generate SP */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Surat Peringatan
                  </p>
                  <div className="flex flex-wrap gap-2">
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

                {/* Autodebet Toggle */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Autodebet Titipan
                  </p>
                  <Button
                    variant={loanAccount.autodebitEnabled ? 'default' : 'outline'}
                    size="sm"
                    disabled={actionMutation.isPending || loanAccount.saldoTitipan === 0}
                    onClick={handleToggleAutodebit}
                  >
                    <Zap className="h-3.5 w-3.5 mr-1" />
                    {loanAccount.autodebitEnabled ? 'Nonaktifkan' : 'Aktifkan'} Autodebet
                  </Button>
                  {loanAccount.saldoTitipan === 0 && (
                    <p className="text-xs text-muted-foreground">Saldo titipan kosong</p>
                  )}
                </div>

                {/* Remedial */}
                <div className="space-y-2 sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Eskalasi
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={actionMutation.isPending}
                    onClick={handleAlihkanRemedial}
                  >
                    <ArrowRight className="h-3.5 w-3.5 mr-1" />
                    Alihkan ke Unit Remedial
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────

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
      className={`rounded-lg border p-3 ${
        highlight ? 'border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-950/20' : 'bg-card'
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      {badge}
    </div>
  );
}

function RiskScoreBadge({ score, label }: { score: number; label: string }) {
  const colors = {
    RENDAH: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950/40 dark:text-green-300',
    SEDANG: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-300',
    TINGGI: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300',
    KRITIS: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300',
    SANGAT_TINGGI: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300',
  };
  return (
    <div className={`border rounded-lg px-3 py-1.5 text-center ${colors[label as keyof typeof colors] || colors.SEDANG}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-xl font-bold leading-none">{score}</p>
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
  return <Badge variant={c.variant} className="text-xs mt-1">{c.label}</Badge>;
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
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
