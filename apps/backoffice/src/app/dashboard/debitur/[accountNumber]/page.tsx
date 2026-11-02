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
  MapPin, Camera, AlertTriangle, CheckCircle2, Clock,
  FileText, Zap, ArrowRight, Phone, User
} from 'lucide-react';
import type { DebiturControllerData, VisitLogEntry, PTPTrackingData } from '@/shared/types';
import { formatRupiah, formatDate, getDpdBadgeVariant, getKolektibilitasLabel } from '@/lib/formatters';
import { VisitTimelineItem } from '@/components/debitur/VisitTimelineItem';
import { PTPTable } from '@/components/debitur/PTPTable';
import Image from 'next/image';

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
  if (error || !data) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-destructive">Gagal memuat data: {(error as Error)?.message}</p>
    </div>
  );

  const { debitur, loanAccount, latestPTP, activeSpLevel, visitTimeline, ptpHistory, riskScore } = data;

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
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={readOnly ? '/collection-report/debitur-card' : '/kolektor/debitur-card'}
          className="text-sm text-muted-foreground hover:underline"
        >
          Kembali ke daftar
        </Link>
        {readOnly && (
          <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
            Monitoring, tanpa tindakan operasional
          </span>
        )}
      </div>
      {/* ── Header Card ────────────────────────────────── */}
      <Card className="border-2" data-dpd={loanAccount.dpd}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xl">{debitur.name}</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground font-mono">{accountNumber}</p>
              <p className="text-sm text-muted-foreground">CIF: {debitur.cif}</p>
              <div className="flex items-center gap-1 mt-1">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm">{debitur.phone}</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {debitur.domisiliAddress}, {debitur.domisiliKecamatan}, {debitur.domisiliKota}
                </span>
              </div>
            </div>

            {/* Risk Score Badge */}
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
              sub={`dari ${formatRupiah(loanAccount.plafon)}`}
            />
            <MetricCard
              label="Saldo Titipan"
              value={formatRupiah(loanAccount.saldoTitipan)}
              sub={loanAccount.saldoTitipan > 0 ? '✓ Ada saldo' : '-'}
              highlight={loanAccount.saldoTitipan > 0}
            />
            <MetricCard
              label="DPD"
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
              sub={latestPTP ? `Target: ${formatDate(latestPTP.targetDate)}` : 'Tidak ada'}
              badge={latestPTP ? <PTPStatusBadge status={latestPTP.status} /> : null}
            />
          </div>

          {/* Risk Factors */}
          {riskScore.factors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {riskScore.factors.map((f, i) => (
                <span key={i} className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                  {f}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Tabs ───────────────────────────────────────── */}
      <Tabs defaultValue="timeline">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="timeline">
            Timeline Penanganan
            <span className="ml-2 text-xs bg-primary/10 text-primary rounded-full px-1.5">
              {visitTimeline.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="action">{readOnly ? 'Riwayat PTP' : 'PTP & Action Center'}</TabsTrigger>
        </TabsList>

        {/* Tab 1: Timeline */}
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

        {/* Tab 2: PTP & Action Center */}
        <TabsContent value="action" className="mt-4 space-y-4">
          <PTPTable ptpHistory={ptpHistory} />

          {readOnly ? null : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tombol Intervensi</CardTitle>
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
  label, value, sub, badge, highlight,
}: {
  label: string; value: string; sub?: string; badge?: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      {badge}
    </div>
  );
}

function RiskScoreBadge({ score, label }: { score: number; label: string }) {
  const colors = {
    RENDAH: 'bg-green-100 text-green-800 border-green-300',
    SEDANG: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    TINGGI: 'bg-orange-100 text-orange-800 border-orange-300',
    KRITIS: 'bg-red-100 text-red-800 border-red-300',
  };
  return (
    <div className={`border rounded-lg px-3 py-1.5 text-center ${colors[label as keyof typeof colors]}`}>
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
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
