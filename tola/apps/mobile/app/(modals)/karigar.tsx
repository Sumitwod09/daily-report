import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal,
} from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { v4 as uuidv4 } from 'uuid';
import { getDb, getFirmId } from '../../src/db/database';
import { KarigarQ, PartyQ } from '../../src/db/queries';
import { calculateFine, GOLD_PURITIES } from '../../src/utils/gold';
import { today, now, formatDateDisplay, formatGrams } from '../../src/utils/format';
import type { KarigarJob, Party } from '../../src/types';

export default function Karigar() {
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<KarigarJob[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCloseModal, setShowCloseModal] = useState<KarigarJob | null>(null);

  function load() {
    const firmId = getFirmId();
    if (!firmId) return;
    const db = getDb();
    const rows = db.getAllSync<KarigarJob>(KarigarQ.getAll, firmId);
    setJobs(rows);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFF' }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#1A56DB" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Karigar Accounts</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: insets.bottom + 20 }}>
        {jobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="person-circle-outline" size={56} color="#D1D9E6" />
            <Text style={styles.emptyTitle}>No karigar jobs yet</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowForm(true)}>
              <Text style={styles.emptyAddText}>Open New Job</Text>
            </TouchableOpacity>
          </View>
        ) : (
          jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              expanded={expandedId === job.id}
              onToggle={() => setExpandedId(expandedId === job.id ? null : job.id)}
              onClose={() => setShowCloseModal(job)}
            />
          ))
        )}
      </ScrollView>

      {/* Open Job Modal */}
      {showForm && (
        <OpenJobModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      {/* Close Job Modal */}
      {showCloseModal && (
        <CloseJobModal
          job={showCloseModal}
          onClose={() => setShowCloseModal(null)}
          onSaved={() => { setShowCloseModal(null); load(); }}
        />
      )}
    </View>
  );
}

function JobCard({ job, expanded, onToggle, onClose }: {
  job: KarigarJob; expanded: boolean; onToggle: () => void; onClose: () => void;
}) {
  const isOpen = job.status === 'open';
  return (
    <TouchableOpacity
      style={[styles.jobCard, { borderLeftColor: isOpen ? '#D97706' : '#22C55E' }]}
      onPress={onToggle} activeOpacity={0.8}
    >
      <View style={styles.jobCardHeader}>
        <View>
          <Text style={styles.jobKarigar}>{(job as any).karigar_name}</Text>
          <Text style={styles.jobMeta}>Opened: {formatDateDisplay(job.opened_at)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isOpen ? '#FEF3C7' : '#DCFCE7' }]}>
          <Text style={[styles.statusText, { color: isOpen ? '#D97706' : '#16A34A' }]}>
            {isOpen ? 'OPEN' : 'CLOSED'}
          </Text>
        </View>
      </View>
      <View style={styles.jobStats}>
        <Stat label="Given" value={`${formatGrams(job.gold_given_weight)} @ ${job.gold_given_purity}%`} />
        <Stat label="Fine Given" value={formatGrams(job.gold_given_fine)} />
        {!isOpen && job.gold_returned_fine != null && (
          <Stat label="Fine Returned" value={formatGrams(job.gold_returned_fine)} />
        )}
        {!isOpen && job.wastage_grams != null && (
          <Stat label="Wastage" value={formatGrams(job.wastage_grams)} />
        )}
      </View>
      {expanded && isOpen && (
        <View style={styles.jobActions}>
          <TouchableOpacity style={styles.closeJobBtn} onPress={onClose}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#22C55E" />
            <Text style={styles.closeJobText}>Close This Job</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function OpenJobModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const insets = useSafeAreaInsets();
  const [karigarName, setKarigarName] = useState('');
  const [karigarId, setKarigarId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Party[]>([]);
  const [weight, setWeight] = useState('');
  const [purity, setPurity] = useState(91.6);
  const [openDate, setOpenDate] = useState(today());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');

  const db = getDb();
  const fine = calculateFine(parseFloat(weight) || 0, purity, 0);

  function searchKarigar(text: string) {
    setKarigarName(text);
    setKarigarId(null);
    const firmId = getFirmId();
    if (!firmId || !text) { setSuggestions([]); return; }
    const results = db.getAllSync<Party>(PartyQ.search, firmId, `%${text}%`);
    setSuggestions(results);
  }

  function handleSave() {
    const firmId = getFirmId();
    if (!firmId) return;
    if (!karigarName.trim()) { Alert.alert('Error', 'Karigar name required'); return; }
    const w = parseFloat(weight);
    if (!w) { Alert.alert('Error', 'Gold weight required'); return; }

    let kId = karigarId;
    if (!kId) {
      kId = uuidv4();
      db.runSync(PartyQ.insert, kId, firmId, karigarName.trim(), null, now(), now());
    }

    const jobId = uuidv4();
    db.runSync(
      KarigarQ.insert,
      jobId, firmId, kId, w, purity, fine, 'open', openDate, notes.trim() || null,
    );
    onSaved();
  }

  return (
    <Modal visible animationType="slide" transparent>
      <TouchableOpacity style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Open New Job</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color="#4A5568" /></TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Field label="Karigar Name *">
            <TextInput style={styles.input} placeholder="Search karigar..." placeholderTextColor="#A0AEC0" value={karigarName} onChangeText={searchKarigar} />
            {suggestions.map(s => (
              <TouchableOpacity key={s.id} style={styles.suggestion} onPress={() => { setKarigarName(s.name); setKarigarId(s.id); setSuggestions([]); }}>
                <Text style={styles.suggestionText}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </Field>
          <Field label="Gold Weight (g) *">
            <TextInput style={styles.input} placeholder="0.000" placeholderTextColor="#A0AEC0" keyboardType="decimal-pad" value={weight} onChangeText={setWeight} />
          </Field>
          <Field label="Purity">
            <View style={styles.pillRow}>
              {GOLD_PURITIES.slice(0, 3).map(p => (
                <TouchableOpacity key={p.value} style={[styles.pill, purity === p.value ? styles.pillActive : styles.pillInactive]} onPress={() => setPurity(p.value)}>
                  <Text style={[styles.pillText, purity === p.value ? { color: '#fff' } : { color: '#4A5568' }]}>{p.label.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>
          <Field label="Fine (calculated)">
            <View style={styles.readOnly}>
              <Text style={styles.readOnlyValue}>{fine.toFixed(3)}g</Text>
            </View>
          </Field>
          <Field label="Date Opened">
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: '#1E2A3A', fontSize: 15 }}>{formatDateDisplay(openDate)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker value={new Date(openDate)} mode="date" display="default"
                onChange={(_, d) => { setShowDatePicker(false); if (d) setOpenDate(d.toISOString().split('T')[0]); }}
              />
            )}
          </Field>
          <Field label="Notes">
            <TextInput style={[styles.input, { height: 72, textAlignVertical: 'top', paddingTop: 8 }]} placeholder="Optional notes" placeholderTextColor="#A0AEC0" multiline value={notes} onChangeText={setNotes} />
          </Field>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Open Job</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

function CloseJobModal({ job, onClose, onSaved }: { job: KarigarJob; onClose: () => void; onSaved: () => void }) {
  const insets = useSafeAreaInsets();
  const [returnWeight, setReturnWeight] = useState('');
  const [closeDate, setCloseDate] = useState(today());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const db = getDb();

  const rw = parseFloat(returnWeight) || 0;
  const returnedFine = calculateFine(rw, job.gold_given_purity, 0);
  const wastage = parseFloat((job.gold_given_fine - returnedFine).toFixed(3));

  function handleClose() {
    if (!rw) { Alert.alert('Error', 'Return weight required'); return; }
    db.runSync(KarigarQ.close, rw, returnedFine, wastage, closeDate, job.id);
    onSaved();
  }

  return (
    <Modal visible animationType="slide" transparent>
      <TouchableOpacity style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Close Job</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color="#4A5568" /></TouchableOpacity>
        </View>
        <View style={styles.closeJobInfo}>
          <Text style={styles.closeInfoRow}>Fine Given: <Text style={{ fontWeight: '700' }}>{formatGrams(job.gold_given_fine)}</Text></Text>
        </View>
        <Field label="Gold Returned (g) *">
          <TextInput style={styles.input} placeholder="0.000" placeholderTextColor="#A0AEC0" keyboardType="decimal-pad" value={returnWeight} onChangeText={setReturnWeight} />
        </Field>
        <Field label="Returned Fine">
          <View style={styles.readOnly}><Text style={styles.readOnlyValue}>{returnedFine.toFixed(3)}g</Text></View>
        </Field>
        <Field label="Wastage">
          <View style={styles.readOnly}><Text style={[styles.readOnlyValue, { color: '#EF4444' }]}>{wastage.toFixed(3)}g</Text></View>
        </Field>
        <Field label="Date Closed">
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: '#1E2A3A', fontSize: 15 }}>{formatDateDisplay(closeDate)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker value={new Date(closeDate)} mode="date" display="default"
              onChange={(_, d) => { setShowDatePicker(false); if (d) setCloseDate(d.toISOString().split('T')[0]); }}
            />
          )}
        </Field>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#22C55E' }]} onPress={handleClose}>
          <Text style={styles.saveBtnText}>Close Job</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 60 },
  backText: { color: '#1A56DB', fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1E2A3A', flex: 1, textAlign: 'center' },
  addBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#1A56DB', alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#4A5568' },
  emptyAddBtn: { backgroundColor: '#1A56DB', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  emptyAddText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  jobCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    gap: 10,
  },
  jobCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  jobKarigar: { fontSize: 15, fontWeight: '700', color: '#1E2A3A' },
  jobMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  jobStats: { flexDirection: 'row', gap: 20 },
  statLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  statValue: { fontSize: 13, color: '#1E2A3A', fontWeight: '600' },
  jobActions: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  closeJobBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  closeJobText: { color: '#22C55E', fontSize: 13, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#1E2A3A' },
  label: { fontSize: 13, fontWeight: '600', color: '#4A5568', marginBottom: 6 },
  input: {
    height: 48, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#D1D9E6',
    borderRadius: 10, paddingHorizontal: 14, fontSize: 15, color: '#1E2A3A',
    justifyContent: 'center',
  },
  suggestion: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#fff' },
  suggestionText: { fontSize: 14, color: '#1E2A3A' },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  pillActive: { backgroundColor: '#1A56DB', borderColor: '#1A56DB' },
  pillInactive: { backgroundColor: '#fff', borderColor: '#D1D9E6' },
  pillText: { fontSize: 13, fontWeight: '600' },
  readOnly: { height: 48, backgroundColor: '#F5F7FA', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  readOnlyValue: { fontSize: 16, fontWeight: '700', color: '#22C55E' },
  saveBtn: { backgroundColor: '#1A56DB', borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  closeJobInfo: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 16 },
  closeInfoRow: { fontSize: 14, color: '#92400E' },
});
