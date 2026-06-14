import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useState, useCallback } from 'react';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getDb, getFirmId } from '../../src/db/database';
import { TxQ } from '../../src/db/queries';
import { formatINR, formatDateShort, formatGrams } from '../../src/utils/format';
import { buildPartyReportHtml } from '../../src/utils/pdf';
import type { Transaction, Firm } from '../../src/types';
import { FirmQ } from '../../src/db/queries';

export default function PartyLedger() {
  const insets = useSafeAreaInsets();
  const { partyId, partyName } = useLocalSearchParams<{ partyId: string; partyName: string }>();
  const [receipts, setReceipts] = useState<Transaction[]>([]);
  const [issues, setIssues] = useState<Transaction[]>([]);
  const [totals, setTotals] = useState({ receipt: 0, issue: 0, fineReceipt: 0, fineIssue: 0 });
  const [sharing, setSharing] = useState(false);

  function load() {
    const firmId = getFirmId();
    if (!firmId || !partyId) return;
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

  useFocusEffect(useCallback(() => { load(); }, []));

  const net = totals.receipt - totals.issue;

  async function handleSharePdf() {
    setSharing(true);
    try {
      const db = getDb();
      const firm = db.getFirstSync<Firm>(FirmQ.get)!;
      const html = buildPartyReportHtml(partyName, receipts, issues, totals, firm.name);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Party Ledger' });
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (e) {
      // silent
    } finally {
      setSharing(false);
    }
  }

  const maxRows = Math.max(receipts.length, issues.length);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFF' }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#1A56DB" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{partyName}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleSharePdf} disabled={sharing}>
          {sharing
            ? <ActivityIndicator size="small" color="#1A56DB" />
            : <>
                <Ionicons name="share-outline" size={16} color="#1A56DB" />
                <Text style={styles.shareBtnText}>PDF</Text>
              </>
          }
        </TouchableOpacity>
      </View>

      {/* Net Outstanding */}
      <View style={[styles.netBar, { borderLeftColor: net >= 0 ? '#22C55E' : '#EF4444' }]}>
        <View>
          <Text style={styles.netLabel}>Net Outstanding</Text>
          <Text style={[styles.netValue, { color: net >= 0 ? '#22C55E' : '#EF4444' }]}>
            {net >= 0 ? '↓ ' : '↑ '}{formatINR(Math.abs(net))}
          </Text>
        </View>
        <View style={styles.netSub}>
          <Text style={styles.netSubText}>Receipt: <Text style={{ color: '#22C55E', fontWeight: '700' }}>{formatINR(totals.receipt)}</Text></Text>
          <Text style={styles.netSubText}>Issue: <Text style={{ color: '#EF4444', fontWeight: '700' }}>{formatINR(totals.issue)}</Text></Text>
        </View>
      </View>

      {/* Two-column Ledger */}
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* Column headers */}
        <View style={styles.columnsHeader}>
          <View style={[styles.colHeader, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.colHeaderText, { color: '#16A34A' }]}>RECEIPT</Text>
          </View>
          <View style={[styles.colHeader, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.colHeaderText, { color: '#DC2626' }]}>ISSUE</Text>
          </View>
        </View>

        {/* Sub-headers */}
        <View style={styles.subHeader}>
          <ColSubHeader />
          <View style={styles.colDivider} />
          <ColSubHeader />
        </View>

        {/* Rows */}
        {maxRows === 0 ? (
          <View style={styles.emptyColumns}>
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        ) : (
          Array.from({ length: maxRows }).map((_, i) => (
            <View key={i} style={[styles.ledgerRow, i % 2 === 0 ? styles.ledgerRowEven : null]}>
              <LedgerCell tx={receipts[i]} />
              <View style={styles.colDivider} />
              <LedgerCell tx={issues[i]} />
            </View>
          ))
        )}

        {/* Totals row */}
        <View style={styles.totalsRow}>
          <View style={styles.totalCell}>
            <Text style={styles.totalText}>Fine: {formatGrams(totals.fineReceipt)}</Text>
            <Text style={[styles.totalAmt, { color: '#16A34A' }]}>{formatINR(totals.receipt)}</Text>
          </View>
          <View style={styles.colDivider} />
          <View style={styles.totalCell}>
            <Text style={styles.totalText}>Fine: {formatGrams(totals.fineIssue)}</Text>
            <Text style={[styles.totalAmt, { color: '#DC2626' }]}>{formatINR(totals.issue)}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ColSubHeader() {
  return (
    <View style={styles.colSubHeader}>
      <Text style={[styles.subHeaderText, { width: 38 }]}>Date</Text>
      <Text style={[styles.subHeaderText, { width: 45 }]}>Mode</Text>
      <Text style={[styles.subHeaderText, { width: 52 }]}>Fine</Text>
      <Text style={[styles.subHeaderText, { flex: 1, textAlign: 'right' }]}>Amt</Text>
    </View>
  );
}

function LedgerCell({ tx }: { tx?: Transaction }) {
  if (!tx) return <View style={styles.colSubHeader} />;
  return (
    <View style={styles.colSubHeader}>
      <Text style={[styles.cellText, { width: 38 }]}>{formatDateShort(tx.date)}</Text>
      <Text style={[styles.cellText, { width: 45 }]} numberOfLines={1}>
        {tx.payment_mode === 'online' ? (tx.online_subtype?.toUpperCase() ?? 'ONL') : tx.payment_mode.charAt(0).toUpperCase() + tx.payment_mode.slice(1)}
      </Text>
      <Text style={[styles.cellText, { width: 52 }]} numberOfLines={1}>
        {tx.payment_mode === 'gold' ? (tx.gold_fine_grams?.toFixed(2) ?? '—') : '—'}
      </Text>
      <Text style={[styles.cellText, { flex: 1, textAlign: 'right' }]} numberOfLines={1}>
        {tx.amount >= 1000 ? `₹${(tx.amount / 1000).toFixed(1)}K` : `₹${tx.amount.toFixed(0)}`}
      </Text>
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1E2A3A', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 60, justifyContent: 'flex-end' },
  shareBtnText: { color: '#1A56DB', fontSize: 14, fontWeight: '600' },
  netBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 12,
    borderRadius: 12, padding: 16, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  netLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 2 },
  netValue: { fontSize: 20, fontWeight: '800' },
  netSub: { alignItems: 'flex-end', gap: 4 },
  netSubText: { fontSize: 13, color: '#4A5568' },
  columnsHeader: { flexDirection: 'row' },
  colHeader: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  colHeaderText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  subHeader: { flexDirection: 'row', backgroundColor: '#F8FAFF', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  colSubHeader: { flex: 1, flexDirection: 'row', paddingHorizontal: 8, alignItems: 'center' },
  subHeaderText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  colDivider: { width: 1, backgroundColor: '#E2E8F0' },
  ledgerRow: { flexDirection: 'row', paddingVertical: 8 },
  ledgerRowEven: { backgroundColor: '#F8FAFF' },
  cellText: { fontSize: 12, color: '#1E2A3A' },
  emptyColumns: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#A0AEC0' },
  totalsRow: {
    flexDirection: 'row', borderTopWidth: 2, borderTopColor: '#E2E8F0',
    paddingVertical: 10, backgroundColor: '#fff',
  },
  totalCell: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, alignItems: 'center' },
  totalText: { fontSize: 12, color: '#4A5568' },
  totalAmt: { fontSize: 14, fontWeight: '800' },
});
