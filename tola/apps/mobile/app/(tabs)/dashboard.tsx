import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDb, getFirmId } from '../../src/db/database';
import { TxQ, FirmQ } from '../../src/db/queries';
import { formatINR, formatGrams, formatDateFull, today } from '../../src/utils/format';
import type { Transaction, DashboardTotals, Firm } from '../../src/types';

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const [firm, setFirm] = useState<Firm | null>(null);
  const [totals, setTotals] = useState<DashboardTotals>({
    total_receipt: 0, total_issue: 0, fine_receipt: 0, fine_issue: 0,
  });
  const [modeTotals, setModeTotals] = useState({ cash_total: 0, online_total: 0, gold_fine_total: 0 });
  const [todayTxs, setTodayTxs] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  function load() {
    const db = getDb();
    const f = db.getFirstSync<Firm>(FirmQ.get);
    setFirm(f ?? null);
    if (!f) return;

    const t = db.getFirstSync<DashboardTotals>(TxQ.getDashboardTotals, f.id);
    if (t) setTotals(t);

    const m = db.getFirstSync<any>(TxQ.getModeTotals, f.id);
    if (m) setModeTotals(m);

    const txs = db.getAllSync<Transaction>(TxQ.getByDate, f.id, today());
    setTodayTxs(txs.slice(0, 5));
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  function onRefresh() {
    setRefreshing(true);
    load();
    setRefreshing(false);
  }

  const net = totals.total_receipt - totals.total_issue;
  const netFine = totals.fine_receipt - totals.fine_issue;
  const hasGold = totals.fine_receipt > 0 || totals.fine_issue > 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFF' }}>
      {/* Fixed Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.firmName}>{firm?.name ?? 'TOLA'}</Text>
          <Text style={styles.dateText}>{formatDateFull(today())}</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/(modals)/settings')}
        >
          <Ionicons name="settings-outline" size={22} color="#4A5568" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Summary Cards */}
        <View style={styles.cards}>
          <SummaryCard
            icon="arrow-down-circle"
            iconColor="#22C55E"
            label="TOTAL RECEIPT"
            value={formatINR(totals.total_receipt)}
            valueColor="#22C55E"
          />
          <SummaryCard
            icon="arrow-up-circle"
            iconColor="#EF4444"
            label="TOTAL ISSUE"
            value={formatINR(totals.total_issue)}
            valueColor="#EF4444"
          />
          <SummaryCard
            icon="scale-outline"
            iconColor={net >= 0 ? '#1A56DB' : '#EF4444'}
            label="NET BALANCE"
            value={net === 0 ? '✓ Balanced' : formatINR(Math.abs(net))}
            valueColor={net >= 0 ? '#1A56DB' : '#EF4444'}
            prefix={net < 0 ? '−' : undefined}
          />
        </View>

        {/* Gold Sub-totals */}
        {hasGold && (
          <View style={styles.goldBar}>
            <Ionicons name="ellipse" size={10} color="#D97706" />
            <Text style={styles.goldText}>
              Gold In: {formatGrams(totals.fine_receipt)}
            </Text>
            <Text style={styles.goldDivider}>|</Text>
            <Text style={styles.goldText}>
              Gold Out: {formatGrams(totals.fine_issue)}
            </Text>
            <Text style={styles.goldDivider}>|</Text>
            <Text style={[styles.goldText, { fontWeight: '700' }]}>
              Net: {formatGrams(netFine)}
            </Text>
          </View>
        )}

        {/* Mode Breakdown */}
        <View style={styles.modeRow}>
          <ModeChip label="Cash" value={formatINR(modeTotals.cash_total)} />
          <ModeChip label="Online" value={formatINR(modeTotals.online_total)} />
          <ModeChip label="Gold" value={formatGrams(modeTotals.gold_fine_total)} />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.receiptBtn]}
            onPress={() => router.push({ pathname: '/(modals)/add-transaction', params: { type: 'receipt' } })}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-down-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>RECEIPT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.issueBtn]}
            onPress={() => router.push({ pathname: '/(modals)/add-transaction', params: { type: 'issue' } })}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-up-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>ISSUE</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Transactions</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/ledger')}>
            <Text style={styles.seeAll}>See All →</Text>
          </TouchableOpacity>
        </View>

        {todayTxs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions today</Text>
          </View>
        ) : (
          todayTxs.map((tx) => (
            <TxRow key={tx.id} tx={tx} />
          ))
        )}

        {/* Quick links */}
        <View style={styles.quickLinks}>
          <QuickLink
            icon="person-circle-outline"
            label="Karigar"
            onPress={() => router.push('/(modals)/karigar')}
          />
          <QuickLink
            icon="layers-outline"
            label="Stock"
            onPress={() => router.push('/(modals)/stock')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function SummaryCard({ icon, iconColor, label, value, valueColor, prefix }: {
  icon: any; iconColor: string; label: string; value: string;
  valueColor: string; prefix?: string;
}) {
  return (
    <View style={styles.card}>
      <Ionicons name={icon} size={18} color={iconColor} style={{ marginBottom: 4 }} />
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {prefix}{value}
      </Text>
    </View>
  );
}

function ModeChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.modeChip}>
      <Text style={styles.modeChipLabel}>{label}</Text>
      <Text style={styles.modeChipValue}>{value}</Text>
    </View>
  );
}

function QuickLink({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickLink} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={22} color="#1A56DB" />
      <Text style={styles.quickLinkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function TxRow({ tx }: { tx: Transaction }) {
  const isReceipt = tx.type === 'receipt';
  return (
    <View style={[styles.txRow, { borderLeftColor: isReceipt ? '#22C55E' : '#EF4444' }]}>
      <View style={styles.txLeft}>
        <Text style={styles.txParty}>{tx.party_name}</Text>
        <Text style={styles.txMeta}>
          {tx.payment_mode === 'gold'
            ? `Gold · ${tx.gold_fine_grams?.toFixed(3)}g`
            : tx.payment_mode.charAt(0).toUpperCase() + tx.payment_mode.slice(1)}
        </Text>
      </View>
      <View style={styles.txRight}>
        <Text style={styles.txAmount}>{formatINR(tx.amount)}</Text>
        <View style={[styles.badge, { backgroundColor: isReceipt ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={[styles.badgeText, { color: isReceipt ? '#16A34A' : '#DC2626' }]}>
            {isReceipt ? 'Receipt' : 'Issue'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  firmName: { fontSize: 18, fontWeight: '800', color: '#1E2A3A' },
  dateText: { fontSize: 13, color: '#718096', marginTop: 2 },
  settingsBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: 16, gap: 14 },
  cards: { flexDirection: 'row', gap: 10 },
  card: {
    flex: 1, minHeight: 88,
    backgroundColor: '#fff',
    borderRadius: 12, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  cardLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 4 },
  cardValue: { fontSize: 14, fontWeight: '800' },
  goldBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  goldText: { fontSize: 13, color: '#92400E' },
  goldDivider: { color: '#FCD34D', fontSize: 14 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeChip: {
    flex: 1, backgroundColor: '#fff',
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  modeChipLabel: { fontSize: 11, color: '#718096', fontWeight: '600', marginBottom: 2 },
  modeChipValue: { fontSize: 12, color: '#1E2A3A', fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, height: 56, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  receiptBtn: { backgroundColor: '#22C55E' },
  issueBtn: { backgroundColor: '#EF4444' },
  actionBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E2A3A' },
  seeAll: { fontSize: 13, color: '#1A56DB', fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#fff', borderRadius: 12 },
  emptyText: { fontSize: 14, color: '#A0AEC0' },
  txRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    borderLeftWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  txLeft: { flex: 1, gap: 2 },
  txParty: { fontSize: 15, fontWeight: '700', color: '#1E2A3A' },
  txMeta: { fontSize: 12, color: '#94A3B8' },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 15, fontWeight: '700', color: '#1E2A3A' },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  quickLinks: { flexDirection: 'row', gap: 12, marginTop: 4 },
  quickLink: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  quickLinkLabel: { fontSize: 13, fontWeight: '600', color: '#1E2A3A' },
});
