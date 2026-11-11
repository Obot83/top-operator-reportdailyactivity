'use client';

import React, { useState, useEffect } from 'react';
import {
  Camera,
  Maximize2,
  Eye,
  ExternalLink,
  MapPin,
  Landmark,
  FileText,
  Home,
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  ImageOff,
  Calendar,
  UserCheck,
} from 'lucide-react';
import type { DebtorCollateralFile } from '@/shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CollateralGalleryProps {
  files: DebtorCollateralFile[];
  leadId?: string;
}

export function CollateralGallery({ files, leadId }: CollateralGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Kategori counts
  const counts = {
    ALL: files.length,
    SERTIFIKAT: files.filter((f) => f.category === 'SERTIFIKAT').length,
    FOTO_EKSTERIOR: files.filter((f) => f.category === 'FOTO_EKSTERIOR').length,
    FOTO_INTERIOR: files.filter((f) => f.category === 'FOTO_INTERIOR').length,
    SURVEY_LOKASI: files.filter((f) => f.category === 'SURVEY_LOKASI').length,
    LAINNYA: files.filter((f) => f.category === 'LAINNYA').length,
  };

  const filteredFiles =
    activeCategory === 'ALL' ? files : files.filter((f) => f.category === activeCategory);

  // Keyboard navigation untuk modal viewer
  useEffect(() => {
    if (selectedFileIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedFileIndex(null);
      } else if (e.key === 'ArrowRight') {
        setSelectedFileIndex((prev) =>
          prev !== null ? (prev + 1) % filteredFiles.length : null
        );
      } else if (e.key === 'ArrowLeft') {
        setSelectedFileIndex((prev) =>
          prev !== null ? (prev - 1 + filteredFiles.length) % filteredFiles.length : null
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFileIndex, filteredFiles.length]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    toast.success('Path berkas berhasil disalin');
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const activeModalFile =
    selectedFileIndex !== null ? filteredFiles[selectedFileIndex] : null;

  return (
    <div className="space-y-3">
      {/* Header & Filter Kategori */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-1.5">
          <Camera className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-xs text-foreground">
            Galeri Berkas Dokumen & Foto Agunan ({files.length} berkas)
          </h4>
        </div>
        {leadId && (
          <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded border border-border/50">
            ref_id: <strong className="text-foreground">{leadId}</strong>
          </span>
        )}
      </div>

      {/* Filter Tabs Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setActiveCategory('ALL');
            setSelectedFileIndex(null);
          }}
          className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
            activeCategory === 'ALL'
              ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
              : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Semua ({counts.ALL})
        </button>

        {counts.SERTIFIKAT > 0 && (
          <button
            type="button"
            onClick={() => {
              setActiveCategory('SERTIFIKAT');
              setSelectedFileIndex(null);
            }}
            className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
              activeCategory === 'SERTIFIKAT'
                ? 'bg-amber-600 text-white shadow-xs font-semibold'
                : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            Sertifikat & Legalitas ({counts.SERTIFIKAT})
          </button>
        )}

        {counts.FOTO_EKSTERIOR > 0 && (
          <button
            type="button"
            onClick={() => {
              setActiveCategory('FOTO_EKSTERIOR');
              setSelectedFileIndex(null);
            }}
            className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
              activeCategory === 'FOTO_EKSTERIOR'
                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20'
            }`}
          >
            Foto Eksterior ({counts.FOTO_EKSTERIOR})
          </button>
        )}

        {counts.FOTO_INTERIOR > 0 && (
          <button
            type="button"
            onClick={() => {
              setActiveCategory('FOTO_INTERIOR');
              setSelectedFileIndex(null);
            }}
            className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
              activeCategory === 'FOTO_INTERIOR'
                ? 'bg-purple-600 text-white shadow-xs font-semibold'
                : 'bg-purple-500/10 text-purple-800 dark:text-purple-300 hover:bg-purple-500/20'
            }`}
          >
            Foto Interior ({counts.FOTO_INTERIOR})
          </button>
        )}

        {counts.SURVEY_LOKASI > 0 && (
          <button
            type="button"
            onClick={() => {
              setActiveCategory('SURVEY_LOKASI');
              setSelectedFileIndex(null);
            }}
            className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
              activeCategory === 'SURVEY_LOKASI'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'bg-blue-500/10 text-blue-800 dark:text-blue-300 hover:bg-blue-500/20'
            }`}
          >
            Survey & Titik Lokasi ({counts.SURVEY_LOKASI})
          </button>
        )}
      </div>

      {/* Grid Thumbnail Gambar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
        {filteredFiles.map((file, idx) => {
          const isFailed = failedImages[file.id];
          const hasImage = Boolean(file.url) && !isFailed;

          return (
            <div
              key={file.id}
              className="group relative rounded-lg border border-border/70 bg-card overflow-hidden hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Media Thumbnail Container */}
              <div
                onClick={() => setSelectedFileIndex(idx)}
                className="relative aspect-[4/3] w-full bg-muted/40 cursor-pointer overflow-hidden border-b border-border/50 flex items-center justify-center"
              >
                {hasImage ? (
                  <>
                    <img
                      src={file.url}
                      alt={file.name}
                      loading="lazy"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [file.id]: true }))
                      }
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <span className="rounded-full bg-white/90 text-slate-900 px-3 py-1.5 text-xs font-semibold flex items-center gap-1 shadow-lg backdrop-blur-xs">
                        <Eye className="h-3.5 w-3.5" /> Buka Foto
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="p-3 text-center flex flex-col items-center justify-center h-full w-full bg-gradient-to-br from-muted/30 to-muted/80">
                    <div className="rounded-full bg-background/80 p-2 text-muted-foreground shadow-xs mb-1">
                      {file.category === 'SERTIFIKAT' ? (
                        <Landmark className="h-5 w-5 text-amber-600" />
                      ) : file.category === 'SURVEY_LOKASI' ? (
                        <MapPin className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Home className="h-5 w-5 text-emerald-600" />
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-foreground truncate max-w-[180px]">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground/80 mt-0.5 font-mono">
                      {file.path.split('/').pop()}
                    </span>
                    <span className="mt-2 text-[9px] px-1.5 py-0.5 rounded bg-background/90 text-muted-foreground border border-border flex items-center gap-1">
                      <Maximize2 className="h-2.5 w-2.5" /> Klik untuk Detail
                    </span>
                  </div>
                )}

                {/* Badge Kategori di Atas Thumbnail */}
                <div className="absolute top-2 left-2 z-10">
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-md font-bold shadow-xs backdrop-blur-xs ${
                      file.category === 'SERTIFIKAT'
                        ? 'bg-amber-500/90 text-amber-950 dark:bg-amber-500 dark:text-black'
                        : file.category === 'FOTO_EKSTERIOR'
                        ? 'bg-emerald-500/90 text-emerald-950 dark:bg-emerald-500 dark:text-black'
                        : file.category === 'FOTO_INTERIOR'
                        ? 'bg-purple-500/90 text-purple-950 dark:bg-purple-500 dark:text-black'
                        : 'bg-blue-500/90 text-blue-950 dark:bg-blue-500 dark:text-black'
                    }`}
                  >
                    {file.category === 'SERTIFIKAT'
                      ? 'SERTIFIKAT'
                      : file.category === 'FOTO_EKSTERIOR'
                      ? 'EKSTERIOR'
                      : file.category === 'FOTO_INTERIOR'
                      ? 'INTERIOR'
                      : 'SURVEY LOKASI'}
                  </span>
                </div>
              </div>

              {/* Detail Info Card */}
              <div className="p-2.5 space-y-1.5 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-1">
                    <span
                      className="font-semibold text-foreground text-xs leading-tight line-clamp-1"
                      title={file.name}
                    >
                      {file.name}
                    </span>
                  </div>

                  {file.notes && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                        Ket: <strong className="text-foreground">{file.notes}</strong>
                      </span>
                    </div>
                  )}

                  <div
                    className="text-[10px] text-muted-foreground font-mono truncate hover:text-foreground cursor-pointer flex items-center gap-1"
                    title={`Klik untuk menyalin: ${file.path}`}
                    onClick={() => handleCopy(file.path)}
                  >
                    <span className="truncate">{file.path}</span>
                    {copiedPath === file.path ? (
                      <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                    )}
                  </div>
                </div>

                {/* Footer: GPS & Surveyor */}
                <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px]">
                  {file.latitude && file.longitude ? (
                    <a
                      href={`https://www.google.com/maps?q=${file.latitude},${file.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                    >
                      <MapPin className="h-3 w-3" />
                      <span>Maps ({file.latitude.toFixed(4)}, {file.longitude.toFixed(4)})</span>
                    </a>
                  ) : (
                    <span className="text-muted-foreground/70">GPS tidak tersemat</span>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedFileIndex(idx)}
                    className="text-primary hover:underline font-medium text-[10px] flex items-center gap-0.5"
                  >
                    Detail <Maximize2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox / Modal Fullscreen Preview */}
      {activeModalFile && selectedFileIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[92vh] bg-card rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">
                  {activeModalFile.name}
                </h3>
                <Badge variant="outline" className="text-[10px]">
                  {activeModalFile.categoryLabel}
                </Badge>
                <span className="text-xs text-muted-foreground ml-2">
                  ({selectedFileIndex + 1} dari {filteredFiles.length})
                </span>
              </div>

              <div className="flex items-center gap-2">
                {activeModalFile.url && (
                  <a
                    href={activeModalFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Buka Tab Baru
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedFileIndex(null)}
                  className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Image Preview */}
            <div className="relative flex-1 bg-black/95 flex items-center justify-center min-h-[320px] max-h-[60vh] overflow-hidden p-4">
              {activeModalFile.url && !failedImages[activeModalFile.id] ? (
                <img
                  src={activeModalFile.url}
                  alt={activeModalFile.name}
                  className="max-h-full max-w-full object-contain rounded-md"
                  onError={() =>
                    setFailedImages((prev) => ({
                      ...prev,
                      [activeModalFile.id]: true,
                    }))
                  }
                />
              ) : (
                <div className="max-w-md p-6 text-center text-white/90 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-white/10 mx-auto flex items-center justify-center">
                    <ImageOff className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      File Fisik Sedang Diproses / Tersimpan di Storage Private
                    </h4>
                    <p className="text-xs text-white/70 mt-1 leading-relaxed">
                      Dokumen tercatat aktif pada database MongoDB collection{' '}
                      <code className="text-amber-300 font-mono">files</code> dengan relasi{' '}
                      <code className="text-amber-300 font-mono">ref_id: {leadId}</code>.
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-white/5 border border-white/10 text-left font-mono text-[11px] text-white/80 space-y-1">
                    <div>
                      <span className="text-white/50">ID Berkas:</span> {activeModalFile.id}
                    </div>
                    <div className="break-all">
                      <span className="text-white/50">Path:</span> {activeModalFile.path}
                    </div>
                    {activeModalFile.notes && (
                      <div>
                        <span className="text-white/50">Notes:</span> {activeModalFile.notes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Prev & Next Floating Buttons */}
              {filteredFiles.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFileIndex((prev) =>
                        prev !== null
                          ? (prev - 1 + filteredFiles.length) % filteredFiles.length
                          : 0
                      );
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors backdrop-blur-xs"
                    title="Foto Sebelumnya (Panah Kiri)"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFileIndex((prev) =>
                        prev !== null ? (prev + 1) % filteredFiles.length : 0
                      );
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors backdrop-blur-xs"
                    title="Foto Berikutnya (Panah Kanan)"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            {/* Modal Footer - Metadata */}
            <div className="p-4 border-t border-border bg-card space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground block">
                    Kategori & Jenis Berkas
                  </span>
                  <span className="font-semibold text-foreground">
                    {activeModalFile.categoryLabel}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground block">
                    Keterangan Dokumen
                  </span>
                  <span className="font-medium text-foreground">
                    {activeModalFile.notes || '-'}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground block">
                    Pengunggah / Sumber
                  </span>
                  <span className="font-medium text-foreground flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-primary" />
                    {activeModalFile.from || 'SURVEYOR LAPANGAN'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {activeModalFile.latitude && activeModalFile.longitude ? (
                    <a
                      href={`https://www.google.com/maps?q=${activeModalFile.latitude},${activeModalFile.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-xs bg-primary/10 px-2.5 py-1 rounded-md"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Lihat Titik Survey di Google Maps ({activeModalFile.latitude.toFixed(5)},{' '}
                      {activeModalFile.longitude.toFixed(5)})
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-[11px]">
                      Koordinat GPS tidak tersedia pada berkas ini
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 gap-1"
                    onClick={() => handleCopy(activeModalFile.path)}
                  >
                    {copiedPath === activeModalFile.path ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    Salin Path File
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
