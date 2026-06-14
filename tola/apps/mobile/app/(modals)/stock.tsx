import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDb, getFirmId } from '../../src/db/database';
import { StockQ } from '../../src/db/queries';
import { formatGrams } from '../../src/utils/format';
import type { StockRow } from '../../src/types';

export default function Stock() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<StockRow[]>([]);

  function load() {
    const firmId = getFirmId();
    if (!firmId) return;
    const db = getDb();
    const data = db.getAllSync<StockRow>(StockQ.getByPurity, firmId);
    setRows(data);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  const totals = rows.reduce(
    (acc, r) => ({
      in: acc.in + r.stock_in,
      out: acc.out + r.stock_out,
    }),
    { in: 0, out: 0 }
  );

  function purityLabel(p: number): string {
    if (p >= 99) return '24K';
    if (p >= 91) return '22K';
    if (p >= 83) return '20K';
    if (p >= 75) return '18K';
    if (p >= 58) return '14K';
    return `${p}%`;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFF' }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#1A56DB" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gold Stock Register</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}>
        {rows.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="layers-outline" size={56} color="#D1D9E6" />
            <Text style={styles.emptyTitle}>No gold transactions yet</Text>
            <Text style={styles.emptySubtitle}>Gold stock is auto-calculated from your transactions</Text>
          </View>
        ) : (
          <View style={styles.table}>
            {/* Table Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.th, { flex: 1.2 }]}>Purity</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Stock IN</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Stock OUT</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Net Stock</Text>
            </View>

            {/* Data Rows */}
            {rows.map((row, i) => {
              const net = row.stock_in - row.stock_out;
              return (
                <View key={i} style={[styles.tableRow, i % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}>
                  <View style={{ flex: 1.2 }}>
                    <Text style={styles.purityLabel}>{purityLabel(row.gold_purity)}</Text>
                    <Text style={styles.purityPct}>{row.gold_purity}%</Text>
                  </View>
                  <Text style={[styles.td, { flex: 1, textAlign: 'center', color: '#22C55E' }]}>
                    {formatGrams(row.stock_in)}
                  </Text>
                  <Text style={[styles.td, { flex: 1, textAlign: 'center', color: '#EF4444' }]}>
                    {formatGrams(row.stock_out)}
                  </Text>
                  <Text style={[styles.td, { flex: 1, textAlign: 'right', fontWeight: '700', color: net >= 0 ? '#1A56DB' : '#EF4444' }]}>
                    {formatGrams(net)}
                  </Text>
                </View>
              );
            })}

            {/* Totals Row */}
            <View style={styles.totalsRow}>
              <Text style={[styles.totalsLabel, { flex: 1.2 }]}>TOTAL</Text>
              <Text style={[styles.totalsValue, { flex: 1, textAlign: 'center', color: '#22C55E' }]}>
                {formatGrams(totals.in)}
              </Text>
              <Text style={[styles.totalsValue, { flex: 1, textAlign: 'center', color: '#EF4444' }]}>
                {formatGrams(totals.out)}
              </Text>
              <Text style={[styles.totalsValue, { flex: 1, textAlign: 'right', color: totals.in - totals.out >= 0 ? '#1A56DB' : '#EF4444' }]}>
                {formatGrams(totals.in - totals.out)}
              </Text>
            </View>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={16} color="#3B82F6" />
          <Text style={styles.infoText}>
            Stock is calculated using fine gold (after wastage deduction) from all your gold transactions.
          </Text>
        </View>
      </ScrollView>
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
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#4A5568' },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
  table: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  tableHeader: { backgroundColor: '#1A56DB' },
  tableRowEven: { backgroundColor: '#F8FAFF' },
  tableRowOdd: { backgroundColor: '#fff' },
  th: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  td: { fontSize: 13, color: '#1E2A3A' },
  purityLabel: { fontSize: 14, fontWeight: '700', color: '#1E2A3A' },
  purityPct: { fontSize: 11, color: '#94A3B8' },
  totalsRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14,
    backgroundColor: '#EFF6FF', borderTopWidth: 2, borderTopColor: '#1A56DB',
  },
  totalsLabel: { fontSize: 12, fontWeight: '800', color: '#1E2A3A', letterSpacing: 0.5 },
  totalsValue: { fontSize: 13, fontWeight: '800' },
  infoCard: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#EFF6FF', borderRadius: 10, padding: 14, marginTop: 16,
  },
  infoText: { fontSize: 13, color: '#3B82F6', flex: 1, lineHeight: 18 },
});
