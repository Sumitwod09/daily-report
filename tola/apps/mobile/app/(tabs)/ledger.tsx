import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput,
} from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getDb, getFirmId } from '../../src/db/database';
import { TxQ, PartyQ } from '../../src/db/queries';
import { formatINR, formatDateDisplay, formatGrams, now } from '../../src/utils/format';
import type { Transaction, Party, PaymentMode, TransactionType } from '../../src/types';

type FilterState = {
  fromDate: string | null;
  toDate: string | null;
  partyId: string | null;
  partyName: string | null;
  mode: PaymentMode | null;
  type: TransactionType | null;
};

export default function Ledger() {
  const insets = useSafeAreaInsets();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState<FilterState>({
    fromDate: null, toDate: null,
    partyId: null, partyName: null,
    mode: null, type: null,
  });
  const [totals, setTotals] = useState({ receipt: 0, issue: 0 });

  function load(f: FilterState = filter) {
    const firmId = getFirmId();
    if (!firmId) return;
    const db = getDb();

    let rows: Transaction[];
    if (f.partyId && f.fromDate && f.toDate) {
      rows = db.getAllSync<Transaction>(TxQ.getByPartyAndDateRange, firmId, f.partyId, f.fromDate, f.toDate);
    } else if (f.partyId) {
      rows = db.getAllSync<Transaction>(TxQ.getByParty, firmId, f.partyId);
    } else if (f.fromDate && f.toDate) {
      rows = db.getAllSync<Transaction>(TxQ.getByDateRange, firmId, f.fromDate, f.toDate);
    } else {
      rows = db.getAllSync<Transaction>(TxQ.getAll, firmId);
    }

    if (f.mode) rows = rows.filter(t => t.payment_mode === f.mode);
    if (f.type) rows = rows.filter(t => t.type === f.type);

    setTxs(rows);
    const receipt = rows.filter(t => t.type === 'receipt').reduce((s, t) => s + t.amount, 0);
    const issue = rows.filter(t => t.type === 'issue').reduce((s, t) => s + t.amount, 0);
    setTotals({ receipt, issue });
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  function applyFilter(f: FilterState) {
    setFilter(f);
    setShowFilter(false);
    load(f);
  }

  function hasFilter() {
    return filter.fromDate || filter.toDate || filter.partyId || filter.mode || filter.type;
  }

  function deleteTransaction(id: string) {
    Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          const db = getDb();
          db.runSync(TxQ.softDelete, now(), now(), id);
          load();
        },
      },
    ]);
  }

  const net = totals.receipt - totals.issue;

  function renderItem({ item }: { item: Transaction }) {
    const isReceipt = item.type === 'receipt';
    const isExpanded = expanded === item.id;
    return (
      <TouchableOpacity
        style={[styles.txRow, { borderLeftColor: isReceipt ? '#22C55E' : '#EF4444' }]}
        onPress={() => setExpanded(isExpanded ? null : item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.txMain}>
          <View style={styles.txLeft}>
            <Text style={styles.txParty}>{item.party_name}</Text>
            <Text style={styles.txMeta}>
              {formatDateDisplay(item.date)} · {item.payment_mode === 'gold'
                ? `Gold ${item.gold_fine_grams?.toFixed(3)}g`
                : item.payment_mode}
            </Text>
          </View>
          <View style={styles.txRight}>
            <Text style={styles.txAmount}>{formatINR(item.amount)}</Text>
            <View style={[styles.badge, { backgroundColor: isReceipt ? '#DCFCE7' : '#FEE2E2' }]}>
              <Text style={[styles.badgeText, { color: isReceipt ? '#16A34A' : '#DC2626' }]}>
                {isReceipt ? 'Receipt' : 'Issue'}
              </Text>
            </View>
          </View>
        </View>
        {isExpanded && (
          <View style={styles.expandedRow}>
            {item.notes ? <Text style={styles.notes}>Notes: {item.notes}</Text> : null}
            {item.payment_mode === 'gold' && (
              <Text style={styles.notes}>
                {item.gold_weight_grams}g @ {item.gold_purity}% | Fine: {item.gold_fine_grams?.toFixed(3)}g
              </Text>
            )}
            <View style={styles.expandedActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => router.push({
                  pathname: '/(modals)/add-transaction',
                  params: { type: item.type, transactionId: item.id },
                })}
              >
                <Ionicons name="pencil-outline" size={14} color="#1A56DB" />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteTransaction(item.id)}
              >
                <Ionicons name="trash-outline" size={14} color="#DC2626" />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.viewBtn}
                onPress={() => router.push({
                  pathname: '/(modals)/party-ledger',
                  params: { partyId: item.party_id, partyName: item.party_name },
                })}
              >
                <Ionicons name="person-outline" size={14} color="#4A5568" />
                <Text style={styles.viewBtnText}>View Party</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFF' }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Ledger</Text>
        <TouchableOpacity
          style={[styles.filterIconBtn, hasFilter() ? styles.filterActive : null]}
          onPress={() => setShowFilter(true)}
        >
          <Ionicons name="funnel-outline" size={20} color={hasFilter() ? '#1A56DB' : '#4A5568'} />
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      {hasFilter() && (
        <View style={styles.filterChips}>
          {filter.partyName && (
            <FilterChip label={`Party: ${filter.partyName}`} onRemove={() => applyFilter({ ...filter, partyId: null, partyName: null })} />
          )}
          {filter.mode && (
            <FilterChip label={`Mode: ${filter.mode}`} onRemove={() => applyFilter({ ...filter, mode: null })} />
          )}
          {filter.type && (
            <FilterChip label={`Type: ${filter.type}`} onRemove={() => applyFilter({ ...filter, type: null })} />
          )}
          {filter.fromDate && (
            <FilterChip label={`${filter.fromDate} → ${filter.toDate}`} onRemove={() => applyFilter({ ...filter, fromDate: null, toDate: null })} />
          )}
        </View>
      )}

      {/* List */}
      {txs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={56} color="#D1D9E6" />
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <View style={styles.emptyBtns}>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push({ pathname: '/(modals)/add-transaction', params: { type: 'receipt' } })}
            >
              <Text style={styles.emptyBtnText}>Receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emptyBtn, styles.emptyBtnRed]}
              onPress={() => router.push({ pathname: '/(modals)/add-transaction', params: { type: 'issue' } })}
            >
              <Text style={[styles.emptyBtnText, { color: '#DC2626' }]}>Issue</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={txs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listBody,
            { paddingBottom: insets.bottom + 80 },
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {/* Tally Bar */}
      <View style={[styles.tallyBar, { paddingBottom: insets.bottom + 4 }]}>
        <TallyItem label="Receipt" value={formatINR(totals.receipt)} color="#22C55E" />
        <View style={styles.tallyDivider} />
        <TallyItem label="Issue" value={formatINR(totals.issue)} color="#EF4444" />
        <View style={styles.tallyDivider} />
        <TallyItem
          label="Net"
          value={net === 0 ? '✓ Balanced' : formatINR(Math.abs(net))}
          color={net >= 0 ? '#1A56DB' : '#EF4444'}
        />
      </View>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilter}
        current={filter}
        onApply={applyFilter}
        onClose={() => setShowFilter(false)}
      />
    </View>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
      <TouchableOpacity onPress={onRemove}><Text style={styles.chipX}>×</Text></TouchableOpacity>
    </View>
  );
}

function TallyItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.tallyItem}>
      <Text style={styles.tallyLabel}>{label}</Text>
      <Text style={[styles.tallyValue, { color }]}>{value}</Text>
    </View>
  );
}

function FilterModal({ visible, current, onApply, onClose }: {
  visible: boolean;
  current: FilterState;
  onApply: (f: FilterState) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [local, setLocal] = useState(current);
  const [partySearch, setPartySearch] = useState(current.partyName ?? '');
  const [partySuggestions, setPartySuggestions] = useState<Party[]>([]);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  function searchParties(text: string) {
    setPartySearch(text);
    if (text.length > 0) {
      const firmId = getFirmId();
      if (!firmId) return;
      const db = getDb();
      const results = db.getAllSync<Party>(PartyQ.search, firmId, `%${text}%`);
      setPartySuggestions(results);
    } else {
      setPartySuggestions([]);
      setLocal(l => ({ ...l, partyId: null, partyName: null }));
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.filterOverlay} />
      <View style={[styles.filterSheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Filters</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color="#4A5568" />
          </TouchableOpacity>
        </View>

        <Text style={styles.filterLabel}>Date Range</Text>
        <View style={styles.twoCol}>
          <TouchableOpacity style={styles.filterInput} onPress={() => setShowFromPicker(true)}>
            <Text style={{ color: local.fromDate ? '#1E2A3A' : '#A0AEC0' }}>
              {local.fromDate ?? 'From'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterInput} onPress={() => setShowToPicker(true)}>
            <Text style={{ color: local.toDate ? '#1E2A3A' : '#A0AEC0' }}>
              {local.toDate ?? 'To'}
            </Text>
          </TouchableOpacity>
        </View>
        {showFromPicker && (
          <DateTimePicker
            value={local.fromDate ? new Date(local.fromDate) : new Date()}
            mode="date" display="default"
            onChange={(_, d) => {
              setShowFromPicker(false);
              if (d) setLocal(l => ({ ...l, fromDate: d.toISOString().split('T')[0] }));
            }}
          />
        )}
        {showToPicker && (
          <DateTimePicker
            value={local.toDate ? new Date(local.toDate) : new Date()}
            mode="date" display="default"
            onChange={(_, d) => {
              setShowToPicker(false);
              if (d) setLocal(l => ({ ...l, toDate: d.toISOString().split('T')[0] }));
            }}
          />
        )}

        <Text style={styles.filterLabel}>Party</Text>
        <TextInput
          style={styles.filterInput}
          placeholder="Search party..."
          placeholderTextColor="#A0AEC0"
          value={partySearch}
          onChangeText={searchParties}
        />
        {partySuggestions.slice(0, 4).map(p => (
          <TouchableOpacity
            key={p.id}
            style={styles.suggestion}
            onPress={() => { setLocal(l => ({ ...l, partyId: p.id, partyName: p.name })); setPartySearch(p.name); setPartySuggestions([]); }}
          >
            <Text style={styles.suggestionText}>{p.name}</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.filterLabel}>Mode</Text>
        <View style={styles.pillRow}>
          {[null, 'cash', 'online', 'gold'].map((m) => (
            <TouchableOpacity
              key={m ?? 'all'}
              style={[styles.pill, local.mode === m ? styles.pillActive : styles.pillInactive]}
              onPress={() => setLocal(l => ({ ...l, mode: m as PaymentMode | null }))}
            >
              <Text style={[styles.pillText, local.mode === m ? { color: '#fff' } : { color: '#4A5568' }]}>
                {m ? m.charAt(0).toUpperCase() + m.slice(1) : 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.filterLabel}>Type</Text>
        <View style={styles.pillRow}>
          {[null, 'receipt', 'issue'].map((t) => (
            <TouchableOpacity
              key={t ?? 'all'}
              style={[styles.pill, local.type === t ? styles.pillActive : styles.pillInactive]}
              onPress={() => setLocal(l => ({ ...l, type: t as TransactionType | null }))}
            >
              <Text style={[styles.pillText, local.type === t ? { color: '#fff' } : { color: '#4A5568' }]}>
                {t ? t.charAt(0).toUpperCase() + t.slice(1) : 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterActions}>
          <TouchableOpacity
            style={styles.filterResetBtn}
            onPress={() => {
              const cleared: FilterState = { fromDate: null, toDate: null, partyId: null, partyName: null, mode: null, type: null };
              setLocal(cleared);
              setPartySearch('');
              onApply(cleared);
            }}
          >
            <Text style={styles.filterResetText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterApplyBtn} onPress={() => onApply(local)}>
            <Text style={styles.filterApplyText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1E2A3A' },
  filterIconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  filterActive: { backgroundColor: '#EFF6FF' },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, gap: 4 },
  chipText: { fontSize: 12, color: '#1A56DB', fontWeight: '600' },
  chipX: { fontSize: 16, color: '#1A56DB', lineHeight: 18 },
  listBody: { padding: 12 },
  txRow: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, borderLeftWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  txMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txLeft: { flex: 1, gap: 2 },
  txParty: { fontSize: 15, fontWeight: '700', color: '#1E2A3A' },
  txMeta: { fontSize: 12, color: '#94A3B8' },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 15, fontWeight: '700', color: '#1E2A3A' },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  expandedRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 8 },
  notes: { fontSize: 13, color: '#4A5568' },
  expandedActions: { flexDirection: 'row', gap: 10 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#EFF6FF', borderRadius: 8 },
  editBtnText: { fontSize: 13, color: '#1A56DB', fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#FEF2F2', borderRadius: 8 },
  deleteBtnText: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#F1F5F9', borderRadius: 8 },
  viewBtnText: { fontSize: 13, color: '#4A5568', fontWeight: '600' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1E2A3A' },
  emptyBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#DCFCE7', borderRadius: 10 },
  emptyBtnRed: { backgroundColor: '#FEE2E2' },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#16A34A' },
  tallyBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#D1D9E6',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 6,
    paddingTop: 10, paddingHorizontal: 8,
  },
  tallyItem: { flex: 1, alignItems: 'center', gap: 2 },
  tallyLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  tallyValue: { fontSize: 13, fontWeight: '800' },
  tallyDivider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 4 },
  // Filter modal
  filterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  filterSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 8 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  filterTitle: { fontSize: 17, fontWeight: '700', color: '#1E2A3A' },
  filterLabel: { fontSize: 13, fontWeight: '600', color: '#4A5568', marginTop: 8 },
  filterInput: {
    height: 44, backgroundColor: '#F8FAFF', borderWidth: 1.5, borderColor: '#D1D9E6',
    borderRadius: 10, paddingHorizontal: 12, fontSize: 14, color: '#1E2A3A',
    justifyContent: 'center', flex: 1,
  },
  twoCol: { flexDirection: 'row', gap: 8 },
  suggestion: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  suggestionText: { fontSize: 14, color: '#1E2A3A' },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  pillActive: { backgroundColor: '#1A56DB', borderColor: '#1A56DB' },
  pillInactive: { backgroundColor: '#fff', borderColor: '#D1D9E6' },
  pillText: { fontSize: 13, fontWeight: '600' },
  filterActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  filterResetBtn: { flex: 1, height: 48, borderRadius: 10, borderWidth: 1.5, borderColor: '#D1D9E6', alignItems: 'center', justifyContent: 'center' },
  filterResetText: { fontSize: 15, fontWeight: '600', color: '#4A5568' },
  filterApplyBtn: { flex: 2, height: 48, borderRadius: 10, backgroundColor: '#1A56DB', alignItems: 'center', justifyContent: 'center' },
  filterApplyText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
