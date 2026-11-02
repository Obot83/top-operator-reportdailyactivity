// top-operator/apps/mobile/src/screens/CollectionDTHScreen.tsx
// React Native - Layar DTH (Daftar Tagihan Harian) Mobile Kolektor

import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl, SectionList, Linking,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { collectionService } from '../services/collectionService';
import type { CollectionTaskEntry, Kolektibilitas } from '../../../shared/types';

// ─── DPD Bucket Config ────────────────────────────────

type DpdBucket = '1-7' | '8-14' | '15-30' | '>30';

const DPD_BUCKET_LABELS: Record<DpdBucket, string> = {
  '1-7': '🟡 DPD 1–7 Hari',
  '8-14': '🟠 DPD 8–14 Hari',
  '15-30': '🔴 DPD 15–30 Hari',
  '>30': '⚫ DPD >30 Hari',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; emoji: string }> = {
  SUDAH_BAYAR:       { label: 'Sudah Bayar',       bg: '#f0fdf4', text: '#166534', emoji: '✅' },
  BELUM_DIKUNJUNGI:  { label: 'Belum Dikunjungi',  bg: '#fffff0', text: '#854d0e', emoji: '⏳' },
  JANJI_BAYAR:       { label: 'Janji Bayar',       bg: '#eff6ff', text: '#1d4ed8', emoji: '🤝' },
  SUDAH_DIKUNJUNGI:  { label: 'Sudah Dikunjungi',  bg: '#fdf4ff', text: '#6b21a8', emoji: '👁' },
  TIDAK_BISA_BAYAR:  { label: 'Tidak Bisa Bayar',  bg: '#fef2f2', text: '#dc2626', emoji: '❌' },
};

const KOLL_COLORS: Record<Kolektibilitas, string> = {
  LANCAR:        '#22c55e',
  DPK:           '#eab308',
  KURANG_LANCAR: '#f97316',
  DIRAGUKAN:     '#ef4444',
  MACET:         '#7f1d1d',
};

// ─── Component ────────────────────────────────────────

export default function CollectionDTHScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBucket, setActiveBucket] = useState<DpdBucket | 'ALL'>('ALL');

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ['collection-dth'],
    queryFn: () => collectionService.fetchMyDTH(),
    staleTime: 60_000,
  });

  // Filter & kelompokkan
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch = !searchQuery ||
        t.debiturName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.accountNumber.includes(searchQuery);
      const matchBucket = activeBucket === 'ALL' || t.dpdBucket === activeBucket;
      return matchSearch && matchBucket;
    });
  }, [tasks, searchQuery, activeBucket]);

  // Buat sections per bucket
  const sections = useMemo(() => {
    const order: DpdBucket[] = ['1-7', '8-14', '15-30', '>30'];
    return order
      .map((bucket) => ({
        bucket,
        title: DPD_BUCKET_LABELS[bucket],
        data: filtered.filter((t) => t.dpdBucket === bucket),
      }))
      .filter((s) => s.data.length > 0);
  }, [filtered]);

  // Summary stats
  const stats = useMemo(() => ({
    total: filtered.length,
    sudahBayar: filtered.filter((t) => t.statusBayar === 'SUDAH_BAYAR').length,
    belumDikunjungi: filtered.filter((t) => t.statusBayar === 'BELUM_DIKUNJUNGI').length,
    janjieBayar: filtered.filter((t) => t.statusBayar === 'JANJI_BAYAR').length,
    totalTagihan: filtered.reduce((s, t) => s + t.totalTagihan, 0),
  }), [filtered]);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Cari nama debitur atau no. rekening..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <SummaryChip label="Total" value={stats.total} color="#6366f1" />
        <SummaryChip label="Sudah Bayar" value={stats.sudahBayar} color="#22c55e" />
        <SummaryChip label="Belum" value={stats.belumDikunjungi} color="#eab308" />
        <SummaryChip label="PTP" value={stats.janjieBayar} color="#3b82f6" />
      </View>

      {/* Bucket Filter */}
      <View style={styles.bucketFilter}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['ALL', '1-7', '8-14', '15-30', '>30'] as const}
          keyExtractor={(i) => i}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.bucketChip, activeBucket === item && styles.bucketChipActive]}
              onPress={() => setActiveBucket(item)}
            >
              <Text style={[styles.bucketChipText, activeBucket === item && styles.bucketChipTextActive]}>
                {item === 'ALL' ? 'Semua' : DPD_BUCKET_LABELS[item as DpdBucket]}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Task List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
            <Text style={styles.sectionHeaderCount}>{section.data.length} debitur</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <DTHTaskCard
            task={item}
            onPress={() =>
              (navigation as any).navigate('DebiturVisit', {
                debiturCif: item.accountNumber.split('/')[0], // simplified
                accountNumber: item.accountNumber,
                debiturName: item.debiturName,
              })
            }
            onCallPress={() => Linking.openURL(`tel:${item.debiturPhone}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isLoading ? '⏳ Memuat daftar tagihan...' : '✅ Tidak ada tagihan yang sesuai filter'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

// ─── DTH Task Card ────────────────────────────────────

function DTHTaskCard({
  task,
  onPress,
  onCallPress,
}: {
  task: CollectionTaskEntry;
  onPress: () => void;
  onCallPress: () => void;
}) {
  const statusCfg = STATUS_CONFIG[task.statusBayar] ?? { label: task.statusBayar, bg: '#f8fafc', text: '#1e293b', emoji: '?' };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        {/* Koll Badge */}
        <View style={[styles.kollBadge, { backgroundColor: KOLL_COLORS[task.kolektibilitas] }]}>
          <Text style={styles.kollText}>DPD {task.dpd}</Text>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[styles.statusText, { color: statusCfg.text }]}>
            {statusCfg.emoji} {statusCfg.label}
          </Text>
        </View>
      </View>

      <Text style={styles.debiturName}>{task.debiturName}</Text>
      <Text style={styles.accountNumber} numberOfLines={1}>{task.accountNumber}</Text>

      {/* Tagihan Breakdown */}
      <View style={styles.tagihanRow}>
        <TagihanItem label="Pokok" amount={task.tagihanPokok} />
        <TagihanItem label="Bunga" amount={task.tagihanBunga} />
        <TagihanItem label="Denda" amount={task.tagihanDenda} />
        {task.saldoTitipan > 0 && (
          <TagihanItem label="Titipan" amount={task.saldoTitipan} isCredit />
        )}
      </View>

      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Tagihan</Text>
        <Text style={styles.totalAmount}>
          {task.totalTagihan.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
        </Text>
      </View>

      {/* PTP Info */}
      {task.latestPTP && task.statusBayar === 'JANJI_BAYAR' && (
        <View style={styles.ptpInfo}>
          <Text style={styles.ptpText}>
            🤝 Janji bayar: {new Date(task.latestPTP.targetDate).toLocaleDateString('id-ID')} —{' '}
            {task.latestPTP.nominalKomitmen.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.callButton} onPress={onCallPress}>
          <Text style={styles.callButtonText}>📞 Hubungi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.visitButton} onPress={onPress}>
          <Text style={styles.visitButtonText}>📝 Input Kunjungan</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Helper Components ────────────────────────────────

function TagihanItem({ label, amount, isCredit }: { label: string; amount: number; isCredit?: boolean }) {
  if (amount === 0) return null;
  return (
    <View style={styles.tagihanItem}>
      <Text style={styles.tagihanLabel}>{label}</Text>
      <Text style={[styles.tagihanAmount, isCredit && { color: '#16a34a' }]}>
        {isCredit ? '-' : ''}{amount.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
      </Text>
    </View>
  );
}

function SummaryChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.summaryChip, { borderColor: color }]}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  searchContainer: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  searchInput: {
    backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0',
  },

  summaryRow: {
    flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  summaryChip: {
    flex: 1, borderWidth: 1, borderRadius: 8, padding: 8, alignItems: 'center',
  },
  summaryValue: { fontSize: 18, fontWeight: '700' },
  summaryLabel: { fontSize: 10, color: '#64748b', marginTop: 1 },

  bucketFilter: { backgroundColor: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  bucketChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  bucketChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  bucketChipText: { fontSize: 12, color: '#64748b' },
  bucketChipTextActive: { color: '#fff', fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 8,
  },
  sectionHeaderText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  sectionHeaderCount: { fontSize: 12, color: '#64748b' },

  listContent: { paddingBottom: 32, paddingHorizontal: 12, paddingTop: 8 },

  card: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 8 },

  kollBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  kollText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flex: 1, alignItems: 'flex-end' },
  statusText: { fontSize: 12, fontWeight: '600' },

  debiturName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  accountNumber: { fontSize: 11, color: '#64748b', fontFamily: 'monospace', marginTop: 1, marginBottom: 10 },

  tagihanRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  tagihanItem: {
    backgroundColor: '#f8fafc', borderRadius: 6, paddingHorizontal: 8,
    paddingVertical: 4, borderWidth: 1, borderColor: '#e2e8f0',
  },
  tagihanLabel: { fontSize: 10, color: '#64748b' },
  tagihanAmount: { fontSize: 12, fontWeight: '600', color: '#1e293b' },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8, marginTop: 4,
  },
  totalLabel: { fontSize: 13, color: '#64748b' },
  totalAmount: { fontSize: 16, fontWeight: '700', color: '#1e293b' },

  ptpInfo: {
    backgroundColor: '#eff6ff', borderRadius: 6, padding: 8, marginTop: 8,
  },
  ptpText: { fontSize: 12, color: '#1d4ed8', fontWeight: '500' },

  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  callButton: {
    flex: 1, borderWidth: 1, borderColor: '#6366f1', borderRadius: 8,
    paddingVertical: 9, alignItems: 'center',
  },
  callButtonText: { fontSize: 13, color: '#6366f1', fontWeight: '600' },
  visitButton: {
    flex: 2, backgroundColor: '#6366f1', borderRadius: 8,
    paddingVertical: 9, alignItems: 'center',
  },
  visitButtonText: { fontSize: 13, color: '#fff', fontWeight: '600' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#94a3b8' },
});
