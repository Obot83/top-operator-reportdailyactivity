'use client';

import { MapPin, Camera, CheckCircle2, XCircle, AlertCircle, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { VisitLogEntry } from '@/shared/types';
import { formatDate, formatDateTime } from '@/lib/formatters';

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  MET_DEBTOR:    { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-green-600', label: 'Ketemu Langsung' },
  VACANT:        { icon: <XCircle className="h-3.5 w-3.5" />, color: 'text-gray-500', label: 'Kosong' },
  REFUSED:       { icon: <AlertCircle className="h-3.5 w-3.5" />, color: 'text-red-500', label: 'Menolak' },
  PARTIAL_MET:   { icon: <Users className="h-3.5 w-3.5" />, color: 'text-blue-500', label: 'Ditemui Sebagian' },
  PHONE_ONLY:    { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-purple-500', label: 'Via Telepon' },
  OTHER:         { icon: <AlertCircle className="h-3.5 w-3.5" />, color: 'text-gray-500', label: 'Lainnya' },
};

export function VisitTimelineItem({
  visit,
  isFirst,
}: {
  visit: VisitLogEntry;
  isFirst: boolean;
}) {
  const statusCfg = STATUS_CONFIG[visit.visitStatus] ?? {
    icon: <AlertCircle className="h-3.5 w-3.5" />, color: 'text-gray-500', label: visit.visitStatus,
  };

  return (
    <div className="relative">
      {/* Timeline Dot */}
      <div
        className={`absolute -left-[21px] top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-background
          ${isFirst ? 'border-primary' : 'border-muted-foreground/40'}`}
      />

      <div className="bg-card border rounded-lg p-4 ml-1 space-y-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">{formatDateTime(visit.visitTimestamp)}</p>
            <p className="text-sm font-medium">{visit.officerName}</p>
            <Badge variant="outline" className="text-xs mt-0.5">{visit.officerRole}</Badge>
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-medium ${statusCfg.color}`}>
            {statusCfg.icon}
            <span>{statusCfg.label}</span>
          </div>
        </div>

        {/* GPS */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="font-mono">
            {visit.latitude == null || visit.longitude == null
              ? 'Koordinat tidak tersedia'
              : `${visit.latitude.toFixed(6)}, ${visit.longitude.toFixed(6)}`}
          </span>
        </div>

        {/* Alasan */}
        {(visit.reasonCategory || visit.reasonDetail) && (
          <div className="bg-muted rounded-md px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Alasan Menunggak</p>
            {visit.reasonCategory && (
              <Badge variant="secondary" className="text-xs mr-1">{visit.reasonCategory}</Badge>
            )}
            {visit.reasonDetail && (
              <p className="text-sm mt-1">{visit.reasonDetail}</p>
            )}
          </div>
        )}

        {/* Catatan Lapangan */}
        {visit.fieldNotes && (
          <p className="text-sm text-muted-foreground italic">{visit.fieldNotes}</p>
        )}

        {/* PTP Info */}
        {visit.hasPTP && visit.ptpData && (
          <div className="border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 rounded-md px-3 py-2">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">🤝 Janji Bayar (PTP)</p>
            <p className="text-sm mt-0.5">
              <span className="font-medium">Rp {visit.ptpData.nominalKomitmen.toLocaleString('id-ID')}</span>
              <span className="text-muted-foreground"> — Target: {formatDate(visit.ptpData.targetDate)}</span>
            </p>
            <PTPStatusChip status={visit.ptpData.status} />
          </div>
        )}

        {/* Foto Bukti */}
        {visit.photoUrls.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Camera className="h-3 w-3" />
              <span>{visit.photoUrls.length} foto bukti kunjungan</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {visit.photoUrls.slice(0, 4).map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={url}
                    alt={`Foto ${i + 1}`}
                    className="w-16 h-16 object-cover rounded-md border hover:opacity-80 transition-opacity"
                    loading="lazy"
                  />
                </a>
              ))}
              {visit.photoUrls.length > 4 && (
                <div className="w-16 h-16 rounded-md border bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">+{visit.photoUrls.length - 4}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PTPStatusChip({ status }: { status: string }) {
  const map = { PENDING: '⏳ Menunggu', HONORED: '✅ Terpenuhi', BROKEN: '❌ Dilanggar' };
  return <span className="text-xs mt-1 inline-block">{map[status as keyof typeof map] ?? status}</span>;
}
