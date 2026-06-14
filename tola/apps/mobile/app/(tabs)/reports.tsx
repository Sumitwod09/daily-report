import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput, Modal, FlatList,
} from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getDb, getFirmId } from '../../src/db/database';
import { TxQ, PartyQ, FirmQ } from '../../src/db/queries';
import {
  formatINR, formatGrams, formatDateDisplay, formatDateShort,
  today, addDays, firstDayOfMonth, lastDayOfMonth,
} from '../../src/utils/format';
import { buildDateReportHtml, buildPartyReportHtml } from '../../src/utils/pdf';
import { exportToExcel } from '../../src/utils/excel';
import type { Transaction, Party, Firm } from '../../src/types';

type Tab = 'date' | 'party';

export default function Reports() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('date');

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFF' }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={styles.tabPills}>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'date' ? styles.tabPillActive : null]}
            onPress={() => setActiveTab('date')}
          >
            <Text style={[styles.tabPillText, activeTab === 'date' ? styles.tabPillTextActive : null]}>By Date</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'party' ? styles.tabPillActive : null]}
            onPress={() => setActiveTab('party')}
          >
            <Text style={[styles.tabPillText, activeTab === 'party' ? styles.tabPillTextActive : null]}>By Party</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'date'
        ? <DateReport insets={insets} />
        : <PartyReport insets={insets} />
      }
    </View>
  );
}

// ── DATE REPORT ───────────────────────────────────────────────────────────────

function DateReport({ insets }: { insets: any }) {
  const [date, setDate] = useState(today());
  const [showPicker, setShowPicker] = useState(false);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [totals, setTotals] = useState({ cash_receipt: 0, cash_issue: 0, gold_receipt_fine: 0, gold_issue_fine: 0 });
  const [busy, setBusy] = useState(false);

  function load(d: string) {
    const firmId = getFirmId();
    if (!firmId) return;
    const db = getDb();
    const rows = db.getAllSync<Transaction>(TxQ.getByDate, firmId, d);
    setTxs(rows);
    const t = db.getFirstSync<any>(TxQ.getDateTotals, firmId, d);
    if (t) setTotals(t);
  }

  useFocusEffect(useCallback(() => { load(date); }, [date]));

  const cashTxs = txs.filter(t => t.payment_mode !== 'gold');
  const goldTxs = txs.filter(t => t.payment_mode === 'gold');
  const netCash = totals.cash_receipt - totals.cash_issue;
  const netGold = totals.gold_receipt_fine - totals.gold_issue_fine;
  const hasGold = goldTxs.length > 0;

  async function handlePreview() {
    setBusy(true);
    try {
      const db = getDb();
      const firm = db.getFirstSync<Firm>(FirmQ.get)!;
      const html = buildDateReportHtml(date, txs, totals, firm.name);
      const { uri } = await Print.printToFileAsync({ html });
      router.push({ pathname: '/pdf-preview', params: { uri } });
    } catch { } finally { setBusy(false); }
  }

  async function handleShare() {
    setBusy(true);
    try {
      const db = getDb();
      const firm = db.getFirstSync<Firm>(FirmQ.get)!;
      const html = buildDateReportHtml(date, txs, totals, firm.name);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch { } finally { setBusy(false); }
  }

  async function handleExcel() {
    setBusy(true);
    try { await exportToExcel(txs, `report-${date}`); }
    catch { } finally { setBusy(false); }
  }

  return (
    <>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
        {/* Date Navigator */}
        <View style={styles.dateNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setDate(addDays(date, -1))}>
            <Ionicons name="chevron-back" size={20} color="#1A56DB" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowPicker(true)}>
            <Text style={styles.dateNavLabel}>{formatDateDisplay(date)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setDate(addDays(date, 1))}>
            <Ionicons name="chevron-forward" size={20} color="#1A56DB" />
          </TouchableOpacity>
        </View>
        {showPicker && (
          <DateTimePicker value={new Date(date)} mode="date" display="default"
            onChange={(_, d) => { setShowPicker(false); if (d) setDate(d.toISOString().split('T')[0]); }}
          />
        )}

        {/* Cash Summary */}
        <View style={styles.summaryRow}>
          <SummaryBox label="CASH IN" value={formatINR(totals.cash_receipt)} color="#22C55E" />
          <SummaryBox label="CASH OUT" value={formatINR(totals.cash_issue)} color="#EF4444" />
          <SummaryBox label="NET CASH" value={formatINR(Math.abs(netCash))} color={netCash >= 0 ? '#1A56DB' : '#EF4444'} />
        </View>

        {/* Gold Summary */}
        {hasGold && (
          <View style={styles.summaryRow}>
            <SummaryBox label="GOLD IN" value={formatGrams(totals.gold_receipt_fine)} color="#22C55E" />
            <SummaryBox label="GOLD OUT" value={formatGrams(totals.gold_issue_fine)} color="#EF4444" />
            <SummaryBox label="NET GOLD" value={formatGrams(Math.abs(netGold))} color={netGold >= 0 ? '#D97706' : '#EF4444'} />
          </View>
        )}

        {/* Cash & Online Table */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Cash & Online Transactions</Text>
          </View>
          {cashTxs.length === 0 ? (
            <Text style={styles.emptyText}>No cash/online transactions on this date.</Text>
          ) : (
            <TxTable txs={cashTxs} showGoldCols={false} />
          )}
        </View>

        {/* Gold Table */}
        <View style={[styles.section, { borderLeftColor: '#D97706' }]}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionAccent, { backgroundColor: '#D97706' }]} />
            <Text style={styles.sectionTitle}>Gold Transactions</Text>
          </View>
          {goldTxs.length === 0 ? (
            <Text style={styles.emptyText}>No gold transactions on this date.</Text>
          ) : (
            <TxTable txs={goldTxs} showGoldCols={true} />
          )}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <ActionBar onPreview={handlePreview} onShare={handleShare} onExcel={handleExcel} busy={busy} insets={insets} />
    </>
  );
}

// ── PARTY REPORT ──────────────────────────────────────────────────────────────

function PartyReport({ insets }: { insets: any }) {
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [partySearch, setPartySearch] = useState('');
  const [partySuggestions, setPartySuggestions] = useState<Party[]>([]);
  const [receipts, setReceipts] = useState<Transaction[]>([]);
  const [issues, setIssues] = useState<Transaction[]>([]);
  const [totals, setTotals] = useState({ receipt: 0, issue: 0, fineReceipt: 0, fineIssue: 0 });
  const [busy, setBusy] = useState(false);

  function searchParties(text: string) {
    setPartySearch(text);
    if (!text) { setPartySuggestions([]); return; }
    const firmId = getFirmId();
    if (!firmId) return;
    const db = getDb();
    const results = db.getAllSync<Party>(PartyQ.search, firmId, `%${text}%`);
    setPartySuggestions(results.slice(0, 5));
  }

  function selectParty(p: Party) {
    setSelectedParty(p);
    setPartySearch(p.name);
    setPartySuggestions([]);
    loadParty(p.id);
  }

  function loadParty(partyId: string) {
    const firmId = getFirmId();
    if (!firmId) return;
    const db = getDb();
    const txs = db.getAllSync<Transaction>(TxQ.getByParty, firmId, partyId);
    setReceipts(txs.filter(t => t.type === 'receipt'));
    setIssues(txs.filter(t => t.type === 'issue'));
    const r = txs.filter(t => t.type === 'receipt').reduce((s, t) => s + t.amount, 0);
    const i = txs.filter(t => t.type === 'issue').reduce((s, t) => s + t.amount, 0);
    const fr = txs.filter(t => t.type === 'receipt' && t.payment_mode === 'gold').reduce((s, t) => s + (t.gold_fine_grams ?? 0), 0);
    const fi = txs.filter(t => t.type === 'issue' && t.payment_mode === 'gold').reduce((s, t) => s + (t.gold_fine_grams ?? 0), 0);
    setTotals({ receipt: r, issue: i, fineReceipt: fr, fineIssue: fi });
  }

  const net = totals.receipt - totals.issue;
  const allTxs = [...receipts, ...issues];

  async function handlePreview() {
    if (!selectedParty) return;
    setBusy(true);
    try {
      const db = getDb();
      const firm = db.getFirstSync<Firm>(FirmQ.get)!;
      const html = buildPartyReportHtml(selectedParty.name, receipts, issues, totals, firm.name);
      const { uri } = await Print.printToFileAsync({ html });
      router.push({ pathname: '/pdf-preview', params: { uri } });
    } catch { } finally { setBusy(false); }
  }

  async function handleShare() {
    if (!selectedParty) return;
    setBusy(true);
    try {
      const db = getDb();
      const firm = db.getFirstSync<Firm>(FirmQ.get)!;
      const html = buildPartyReportHtml(selectedParty.name, receipts, issues, totals, firm.name);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch { } finally { setBusy(false); }
  }

  async function handleExcel() {
    if (!selectedParty) return;
    setBusy(true);
    try { await exportToExcel(allTxs, `party-${selectedParty.name}`); }
    catch { } finally { setBusy(false); }
  }

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80, gap: 14 }}>
        {/* Party Selector */}
        <View>
          <Text style={styles.label}>Select Party</Text>
          <View style={styles.partyInputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Search party..."
              placeholderTextColor="#A0AEC0"
              value={partySearch}
              onChangeText={searchParties}
            />
            {selectedParty && (
              <TouchableOpacity onPress={() => { setSelectedParty(null); setPartySearch(''); setReceipts([]); setIssues([]); setTotals({ receipt: 0, issue: 0, fineReceipt: 0, fineIssue: 0 }); }}>
                <View style={styles.clearBtn}><Text style={styles.clearText}>✕ Clear</Text></View>
              </TouchableOpacity>
            )}
          </View>
          {partySuggestions.map(p => (
            <TouchableOpacity key={p.id} style={styles.suggestion} onPress={() => selectParty(p)}>
              <Text style={styles.suggestionText}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedParty && (
          <>
            {/* Summary */}
            <View style={styles.summaryRow}>
              <SummaryBox label="RECEIPT" value={formatINR(totals.receipt)} color="#22C55E" />
              <SummaryBox label="ISSUE" value={formatINR(totals.issue)} color="#EF4444" />
              <SummaryBox label="NET" value={formatINR(Math.abs(net))} color={net >= 0 ? '#1A56DB' : '#EF4444'} />
            </View>

            {/* Two column ledger */}
            <View>
              <View style={styles.twoColHeader}>
                <View style={[styles.colHeader, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.colHeaderText, { color: '#16A34A' }]}>RECEIPT</Text>
                </View>
                <View style={[styles.colHeader, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.colHeaderText, { color: '#DC2626' }]}>ISSUE</Text>
                </View>
              </View>
              {Array.from({ length: Math.max(receipts.length, issues.length) }).map((_, i) => (
                <View key={i} style={[styles.twoColRow, i % 2 === 0 ? { backgroundColor: '#F8FAFF' } : null]}>
                  <MiniLedgerCell tx={receipts[i]} />
                  <View style={{ width: 1, backgroundColor: '#E2E8F0' }} />
                  <MiniLedgerCell tx={issues[i]} />
                </View>
              ))}
              {Math.max(receipts.length, issues.length) === 0 && (
                <Text style={[styles.emptyText, { padding: 16 }]}>No transactions found</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <ActionBar
        onPreview={handlePreview}
        onShare={handleShare}
        onExcel={handleExcel}
        busy={busy}
        insets={insets}
        disabled={!selectedParty}
      />
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SummaryBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

function TxTable({ txs, showGoldCols }: { txs: Transaction[]; showGoldCols: boolean }) {
  return (
    <View style={styles.table}>
      {/* Header */}
      <View style={[styles.tableRow, styles.tableHeader]}>
        <Text style={[styles.th, { width: 40 }]}>Date</Text>
        <Text style={[styles.th, { flex: 1 }]}>Party</Text>
        {showGoldCols && <Text style={[styles.th, { width: 46 }]}>Wt</Text>}
        {showGoldCols && <Text style={[styles.th, { width: 42 }]}>Fine</Text>}
        {!showGoldCols && <Text style={[styles.th, { width: 46 }]}>Mode</Text>}
        <Text style={[styles.th, { width: 40 }]}>Type</Text>
        <Text style={[styles.th, { width: 60, textAlign: 'right' }]}>Amt</Text>
      </View>
      {txs.map((tx, i) => {
        const isR = tx.type === 'receipt';
        return (
          <View key={tx.id} style={[styles.tableRow, i % 2 === 0 ? styles.tableRowEven : null, { borderLeftColor: isR ? '#22C55E' : '#EF4444', borderLeftWidth: 2 }]}>
            <Text style={[styles.td, { width: 40 }]}>{formatDateShort(tx.date)}</Text>
            <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>{tx.party_name}</Text>
            {showGoldCols && <Text style={[styles.td, { width: 46 }]}>{tx.gold_weight_grams?.toFixed(2) ?? '—'}</Text>}
            {showGoldCols && <Text style={[styles.td, { width: 42 }]}>{tx.gold_fine_grams?.toFixed(2) ?? '—'}</Text>}
            {!showGoldCols && <Text style={[styles.td, { width: 46 }]}>{tx.payment_mode}</Text>}
            <Text style={[styles.td, { width: 40 }, isR ? { color: '#16A34A' } : { color: '#DC2626' }]}>{isR ? 'Rec' : 'Iss'}</Text>
            <Text style={[styles.td, { width: 60, textAlign: 'right', fontWeight: '700' }]}>{tx.amount >= 1000 ? `₹${(tx.amount / 1000).toFixed(1)}K` : `₹${tx.amount.toFixed(0)}`}</Text>
          </View>
        );
      })}
    </View>
  );
}

function MiniLedgerCell({ tx }: { tx?: Transaction }) {
  if (!tx) return <View style={{ flex: 1, height: 32 }} />;
  return (
    <View style={styles.miniCell}>
      <Text style={styles.miniDate}>{formatDateShort(tx.date)}</Text>
      <Text style={styles.miniMode}>{tx.payment_mode === 'gold' ? `${tx.gold_fine_grams?.toFixed(2)}g` : tx.payment_mode.charAt(0).toUpperCase() + tx.payment_mode.slice(1)}</Text>
      <Text style={styles.miniAmt}>{tx.amount >= 1000 ? `₹${(tx.amount / 1000).toFixed(1)}K` : `₹${tx.amount}`}</Text>
    </View>
  );
}

function ActionBar({ onPreview, onShare, onExcel, busy, insets, disabled = false }: {
  onPreview: () => void; onShare: () => void; onExcel: () => void;
  busy: boolean; insets: any; disabled?: boolean;
}) {
  return (
    <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
      <TouchableOpacity style={[styles.actionBtn, disabled ? styles.actionBtnDisabled : null]} onPress={onPreview} disabled={busy || disabled}>
        {busy ? <ActivityIndicator size="small" color="#1A56DB" /> : <Ionicons name="eye-outline" size={16} color={disabled ? '#94A3B8' : '#1A56DB'} />}
        <Text style={[styles.actionBtnText, disabled ? { color: '#94A3B8' } : { color: '#1A56DB' }]}>Preview</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionBtnFilled, disabled ? styles.actionBtnDisabled : null]} onPress={onShare} disabled={busy || disabled}>
        <Ionicons name="share-outline" size={16} color={disabled ? '#94A3B8' : '#fff'} />
        <Text style={[styles.actionBtnFilledText, disabled ? { color: '#94A3B8' } : null]}>Share PDF</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionBtn, disabled ? styles.actionBtnDisabled : null]} onPress={onExcel} disabled={busy || disabled}>
        <Ionicons name="grid-outline" size={16} color={disabled ? '#94A3B8' : '#1A56DB'} />
        <Text style={[styles.actionBtnText, disabled ? { color: '#94A3B8' } : { color: '#1A56DB' }]}>Excel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1E2A3A' },
  tabPills: { flexDirection: 'row', gap: 8 },
  tabPill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#D1D9E6', backgroundColor: '#fff' },
  tabPillActive: { backgroundColor: '#1A56DB', borderColor: '#1A56DB' },
  tabPillText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  tabPillTextActive: { color: '#fff' },
  dateNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  navBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  dateNavLabel: { fontSize: 16, fontWeight: '700', color: '#1E2A3A' },
  summaryRow: { flexDirection: 'row', gap: 8, padding: 12 },
  summaryBox: {
    flex: 1, minHeight: 80, backgroundColor: '#fff', borderRadius: 10, padding: 10,
    alignItems: 'center', justifyContent: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  summaryLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },
  summaryValue: { fontSize: 14, fontWeight: '800' },
  section: { marginHorizontal: 12, backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 8, marginBottom: 4 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionAccent: { width: 3, height: 16, backgroundColor: '#1A56DB', borderRadius: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1E2A3A' },
  emptyText: { fontSize: 13, color: '#A0AEC0', paddingVertical: 8 },
  table: { borderRadius: 8, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 6 },
  tableHeader: { backgroundColor: '#F1F5F9' },
  tableRowEven: { backgroundColor: '#F8FAFF' },
  th: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  td: { fontSize: 11, color: '#1E2A3A' },
  label: { fontSize: 13, fontWeight: '600', color: '#4A5568', marginBottom: 6 },
  input: { height: 44, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#D1D9E6', borderRadius: 10, paddingHorizontal: 12, fontSize: 14, color: '#1E2A3A' },
  partyInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  clearBtn: { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  clearText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  suggestion: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#fff' },
  suggestionText: { fontSize: 14, color: '#1E2A3A' },
  twoColHeader: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', marginBottom: 2 },
  colHeader: { flex: 1, paddingVertical: 7, alignItems: 'center' },
  colHeaderText: { fontSize: 11, fontWeight: '800' },
  twoColRow: { flexDirection: 'row', height: 32 },
  miniCell: { flex: 1, flexDirection: 'row', paddingHorizontal: 6, alignItems: 'center', gap: 4 },
  miniDate: { fontSize: 11, color: '#4A5568', width: 34 },
  miniMode: { fontSize: 11, color: '#94A3B8', flex: 1 },
  miniAmt: { fontSize: 11, fontWeight: '700', color: '#1E2A3A', textAlign: 'right' },
  actionBar: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  actionBtn: {
    flex: 1, height: 46, borderRadius: 10, borderWidth: 1.5, borderColor: '#1A56DB',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  actionBtnFilled: {
    flex: 1.5, height: 46, borderRadius: 10, backgroundColor: '#1A56DB',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  actionBtnDisabled: { borderColor: '#D1D9E6', backgroundColor: '#F1F5F9' },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  actionBtnFilledText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
