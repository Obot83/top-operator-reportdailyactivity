// top-operator/apps/mobile/src/screens/DebiturVisitScreen.tsx
// React Native - Layar Input Kunjungan Penanganan Debitur

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Switch, Image, Alert, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { visitService } from '../services/visitService';
import type { VisitStatus } from '../../../shared/types';

// ─── Types ─────────────────────────────────────────────

type VisitScreenParams = {
  debiturCif: string;
  accountNumber: string;
  debiturName: string;
};

type PickedPhoto = {
  uri: string;
  type: string;
  name: string;
};

// ─── Constants ────────────────────────────────────────

const VISIT_STATUS_OPTIONS: { value: VisitStatus; label: string }[] = [
  { value: 'MET_DEBTOR',    label: '👤 Ketemu Langsung' },
  { value: 'VACANT',        label: '🏠 Rumah / Tempat Usaha Kosong' },
  { value: 'REFUSED',       label: '🚫 Menolak Ditemui' },
  { value: 'THIRD_PARTY',   label: '👥 Ditemui Pihak Ketiga' },
  { value: 'PHONE_CONTACT', label: '📞 Kontak Via Telepon' },
  { value: 'NO_CONTACT',    label: '❌ Tidak Bisa Dihubungi' },
];

const REASON_CATEGORIES = [
  'LUPA', 'KESULITAN_USAHA', 'BENCANA', 'SAKIT',
  'SENGAJA', 'BARU_TERIMA_GAJI', 'DITAGIH_PIHAK_LAIN', 'LAINNYA',
];

const REASON_LABELS: Record<string, string> = {
  LUPA: 'Lupa',
  KESULITAN_USAHA: 'Kesulitan Usaha',
  BENCANA: 'Bencana / Force Majeure',
  SAKIT: 'Sakit / Rawat Inap',
  SENGAJA: 'Sengaja Tidak Bayar',
  BARU_TERIMA_GAJI: 'Baru Terima Gaji / Hasil Usaha',
  DITAGIH_PIHAK_LAIN: 'Ditagih Kreditur Lain',
  LAINNYA: 'Lainnya',
};

// ─── Component ────────────────────────────────────────

export default function DebiturVisitScreen() {
  const route = useRoute<RouteProp<{ params: VisitScreenParams }, 'params'>>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { debiturCif, accountNumber, debiturName } = route.params;

  // GPS State
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Form State
  const [visitStatus, setVisitStatus] = useState<VisitStatus | null>(null);
  const [reasonCategory, setReasonCategory] = useState<string | null>(null);
  const [reasonDetail, setReasonDetail] = useState('');
  const [fieldNotes, setFieldNotes] = useState('');
  const [hasPTP, setHasPTP] = useState(false);
  const [ptpTargetDate, setPtpTargetDate] = useState<Date>(new Date());
  const [ptpNominal, setPtpNominal] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-ambil GPS saat screen dibuka
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setGpsError('Izin lokasi diperlukan untuk mencatat kunjungan');
          setGpsLoading(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setCoords({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? 0,
        });
      } catch (e) {
        setGpsError('Gagal mengambil lokasi GPS');
      } finally {
        setGpsLoading(false);
      }
    })();
  }, []);

  // Ambil foto via kamera atau galeri
  const handlePickPhoto = useCallback(async (source: 'camera' | 'gallery') => {
    if (photos.length >= 4) {
      Alert.alert('Batas Foto', 'Maksimal 4 foto per kunjungan');
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    };

    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Kamera', 'Diperlukan izin kamera untuk mengambil foto bukti');
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const picked: PickedPhoto = {
        uri: asset.uri,
        type: asset.mimeType ?? 'image/jpeg',
        name: `visit_${Date.now()}.jpg`,
      };
      setPhotos((prev) => [...prev, picked]);
    }
  }, [photos.length]);

  const handleRemovePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit
  const handleSubmit = async () => {
    if (!coords) { Alert.alert('GPS Belum Siap', 'Tunggu hingga GPS berhasil diambil'); return; }
    if (!visitStatus) { Alert.alert('Validasi', 'Pilih status pertemuan terlebih dahulu'); return; }
    if (hasPTP && !ptpNominal) { Alert.alert('Validasi', 'Masukkan nominal janji bayar'); return; }
    if (photos.length === 0) { Alert.alert('Foto Bukti', 'Tambahkan minimal 1 foto bukti kunjungan'); return; }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('debiturCif', debiturCif);
      formData.append('accountNumber', accountNumber);
      formData.append('latitude', String(coords.latitude));
      formData.append('longitude', String(coords.longitude));
      formData.append('gpsAccuracy', String(coords.accuracy));
      formData.append('visitStatus', visitStatus);
      if (reasonCategory) formData.append('reasonCategory', reasonCategory);
      if (reasonDetail) formData.append('reasonDetail', reasonDetail);
      if (fieldNotes) formData.append('fieldNotes', fieldNotes);
      formData.append('hasPTP', String(hasPTP));
      if (hasPTP) {
        formData.append('ptpTargetDate', ptpTargetDate.toISOString().split('T')[0]);
        formData.append('ptpNominal', ptpNominal.replace(/\D/g, ''));
      }
      photos.forEach((photo, i) => {
        formData.append(`photo_${i}`, {
          uri: photo.uri,
          type: photo.type,
          name: photo.name,
        } as any);
      });

      await visitService.submitVisit(formData);

      queryClient.invalidateQueries({ queryKey: ['debitur-controller', accountNumber] });
      Alert.alert('Berhasil', 'Kunjungan berhasil dicatat', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Gagal', (err as Error).message ?? 'Terjadi kesalahan saat menyimpan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Debitur Header */}
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>{debiturName}</Text>
        <Text style={styles.headerSub}>{accountNumber}</Text>
      </View>

      {/* GPS Status */}
      <View style={[styles.gpsCard, gpsError ? styles.gpsError : coords ? styles.gpsOk : styles.gpsLoading]}>
        {gpsLoading ? (
          <ActivityIndicator size="small" color="#6366f1" />
        ) : null}
        <View style={{ flex: 1, marginLeft: 8 }}>
          {gpsError ? (
            <Text style={styles.gpsErrorText}>{gpsError}</Text>
          ) : coords ? (
            <>
              <Text style={styles.gpsOkText}>📍 Lokasi Terdeteksi</Text>
              <Text style={styles.gpsCoordsText}>
                {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
                {coords.accuracy < 50 ? ' (Akurasi Tinggi)' : ` (±${Math.round(coords.accuracy)}m)`}
              </Text>
            </>
          ) : (
            <Text style={styles.gpsLoadingText}>Mengambil lokasi GPS...</Text>
          )}
        </View>
      </View>

      {/* Status Pertemuan */}
      <Section title="Status Pertemuan *">
        {VISIT_STATUS_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.radioOption, visitStatus === opt.value && styles.radioSelected]}
            onPress={() => setVisitStatus(opt.value)}
          >
            <View style={[styles.radioCircle, visitStatus === opt.value && styles.radioCircleSelected]} />
            <Text style={[styles.radioLabel, visitStatus === opt.value && styles.radioLabelSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Section>

      {/* Alasan Menunggak */}
      {visitStatus && visitStatus !== 'MET_DEBTOR' && (
        <Section title="Alasan Menunggak">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {REASON_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, reasonCategory === cat && styles.chipSelected]}
                  onPress={() => setReasonCategory(reasonCategory === cat ? null : cat)}
                >
                  <Text style={[styles.chipText, reasonCategory === cat && styles.chipTextSelected]}>
                    {REASON_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TextInput
            style={styles.textArea}
            placeholder="Detail alasan menunggak (opsional)..."
            value={reasonDetail}
            onChangeText={setReasonDetail}
            multiline
            numberOfLines={3}
          />
        </Section>
      )}

      {/* Catatan Lapangan */}
      <Section title="Catatan Lapangan">
        <TextInput
          style={styles.textArea}
          placeholder="Catatan kondisi debitur, situasi lapangan, dll..."
          value={fieldNotes}
          onChangeText={setFieldNotes}
          multiline
          numberOfLines={3}
        />
      </Section>

      {/* PTP Toggle */}
      <Section title="Janji Bayar (PTP)">
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Debitur Berkomitmen Janji Bayar</Text>
            <Text style={styles.switchSub}>Aktifkan jika debitur menyetujui jadwal pembayaran</Text>
          </View>
          <Switch value={hasPTP} onValueChange={setHasPTP} trackColor={{ true: '#6366f1' }} />
        </View>

        {hasPTP && (
          <View style={styles.ptpContainer}>
            {/* Target Tanggal */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Target Tanggal Bayar *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  📅 {ptpTargetDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={ptpTargetDate}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(_, date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) setPtpTargetDate(date);
                  }}
                />
              )}
            </View>

            {/* Nominal */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nominal Komitmen (Rp) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: 500000"
                value={ptpNominal}
                onChangeText={(t) => setPtpNominal(t.replace(/\D/g, ''))}
                keyboardType="numeric"
              />
              {ptpNominal ? (
                <Text style={styles.nominalPreview}>
                  {Number(ptpNominal).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </Section>

      {/* Foto Bukti */}
      <Section title={`Foto Bukti Kunjungan (${photos.length}/4) *`}>
        <View style={styles.photoButtonRow}>
          <TouchableOpacity style={[styles.photoButton, { flex: 1 }]} onPress={() => handlePickPhoto('camera')}>
            <Text style={styles.photoButtonText}>📷 Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.photoButton, { flex: 1 }]} onPress={() => handlePickPhoto('gallery')}>
            <Text style={styles.photoButtonText}>🖼️ Galeri</Text>
          </TouchableOpacity>
        </View>

        {photos.length > 0 && (
          <View style={styles.photoGrid}>
            {photos.map((photo, idx) => (
              <View key={idx} style={styles.photoWrapper}>
                <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                <TouchableOpacity style={styles.photoRemove} onPress={() => handleRemovePhoto(idx)}>
                  <Text style={styles.photoRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </Section>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, (isSubmitting || !coords || !visitStatus) && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting || !coords || !visitStatus}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>💾 Simpan Kunjungan</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Section Wrapper ──────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },

  headerCard: {
    backgroundColor: '#6366f1', borderRadius: 12, padding: 16, marginBottom: 12,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#c7d2fe', fontSize: 12, marginTop: 2, fontFamily: 'monospace' },

  gpsCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10,
    padding: 12, marginBottom: 16, borderWidth: 1,
  },
  gpsOk: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  gpsError: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  gpsLoading: { backgroundColor: '#eff6ff', borderColor: '#93c5fd' },
  gpsOkText: { fontSize: 13, fontWeight: '600', color: '#166534' },
  gpsErrorText: { fontSize: 13, color: '#dc2626' },
  gpsLoadingText: { fontSize: 13, color: '#1d4ed8' },
  gpsCoordsText: { fontSize: 11, color: '#15803d', fontFamily: 'monospace', marginTop: 2 },

  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 10 },

  radioOption: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 6,
  },
  radioSelected: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  radioCircle: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    borderColor: '#94a3b8', marginRight: 10,
  },
  radioCircleSelected: { borderColor: '#6366f1', backgroundColor: '#6366f1' },
  radioLabel: { fontSize: 14, color: '#334155' },
  radioLabelSelected: { color: '#4338ca', fontWeight: '600' },

  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  chipSelected: { borderColor: '#6366f1', backgroundColor: '#6366f1' },
  chipText: { fontSize: 12, color: '#64748b' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },

  textArea: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12,
    fontSize: 14, color: '#1e293b', textAlignVertical: 'top', minHeight: 80,
  },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8,
    padding: 12, fontSize: 14, color: '#1e293b',
  },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  switchSub: { fontSize: 12, color: '#64748b', marginTop: 2 },

  ptpContainer: { marginTop: 12, gap: 12 },
  formGroup: { gap: 6 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
  dateButton: {
    borderWidth: 1, borderColor: '#6366f1', borderRadius: 8, padding: 12, backgroundColor: '#eef2ff',
  },
  dateButtonText: { fontSize: 14, color: '#4338ca', fontWeight: '500' },
  nominalPreview: { fontSize: 12, color: '#16a34a', marginTop: 4, fontWeight: '600' },

  photoButtonRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  photoButton: {
    borderWidth: 1.5, borderColor: '#6366f1', borderRadius: 8, borderStyle: 'dashed',
    padding: 12, alignItems: 'center',
  },
  photoButtonText: { fontSize: 14, color: '#6366f1', fontWeight: '600' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrapper: { position: 'relative' },
  photoThumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#e2e8f0' },
  photoRemove: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#ef4444', borderRadius: 10, width: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  submitButton: {
    backgroundColor: '#6366f1', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  submitDisabled: { backgroundColor: '#a5b4fc' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
