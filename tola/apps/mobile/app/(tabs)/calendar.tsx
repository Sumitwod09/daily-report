import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDb, getFirmId } from '../../src/db/database';
import { TxQ } from '../../src/db/queries';
import {
  today, firstDayOfMonth, lastDayOfMonth, prevMonth, nextMonth,
  formatINR, formatDateDisplay,
} from '../../src/utils/format';
import type { Transaction, CalendarDot } from '../../src/types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Calendar() {
  const insets = useSafeAreaInsets();
  const todayStr = today();
  const [monthStart, setMonthStart] = useState(firstDayOfMonth(todayStr));
  const [dotMap, setDotMap] = useState<Record<string, CalendarDot>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayTxs, setDayTxs] = useState<Transaction[]>([]);
  const [dayTotals, setDayTotals] = useState({ receipt: 0, issue: 0 });
  const [showDayPanel, setShowDayPanel] = useState(false);

  function loadMonth(ms: string) {
    const firmId = getFirmId();
    if (!firmId) return;
    const db = getDb();
    const from = firstDayOfMonth(ms);
    const to = lastDayOfMonth(ms);
    const dots = db.getAllSync<CalendarDot>(TxQ.getCalendarDots, firmId, from, to);
    const map: Record<string, CalendarDot> = {};
    dots.forEach(d => { map[d.date] = d; });
    setDotMap(map);
  }

  useFocusEffect(useCallback(() => { loadMonth(monthStart); }, [monthStart]));

  function selectDate(dateStr: string) {
    const firmId = getFirmId();
    if (!firmId) return;
    const db = getDb();
    const txs = db.getAllSync<Transaction>(TxQ.getByDate, firmId, dateStr);
    setDayTxs(txs);
    const r = txs.filter(t => t.type === 'receipt').reduce((s, t) => s + t.amount, 0);
    const i = txs.filter(t => t.type === 'issue').reduce((s, t) => s + t.amount, 0);
    setDayTotals({ receipt: r, issue: i });
    setSelectedDate(dateStr);
    setShowDayPanel(true);
  }

  // Build calendar grid
  const monthDate = new Date(monthStart);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  // Monday = 0, shift Sunday to 6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    cells.push(`${year}-${mm}-${dd}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = firstDay.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFF' }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setMonthStart(prevMonth(monthStart))}>
          <Ionicons name="chevron-back" size={22} color="#1A56DB" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity style={styles.navBtn} onPress={() => setMonthStart(nextMonth(monthStart))}>
          <Ionicons name="chevron-forward" size={22} color="#1A56DB" />
        </TouchableOpacity>
      </View>

      {/* Weekday Labels */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map(d => (
          <View key={d} style={styles.weekCell}>
            <Text style={styles.weekLabel}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
        <View style={styles.grid}>
          {cells.map((dateStr, i) => {
            if (!dateStr) return <View key={i} style={styles.cell} />;
            const dot = dotMap[dateStr];
            const isToday = dateStr === todayStr;
            const d = parseInt(dateStr.split('-')[2]);
            return (
              <TouchableOpacity
                key={dateStr}
                style={styles.cell}
                onPress={() => selectDate(dateStr)}
                activeOpacity={0.7}
              >
                <View style={[styles.dayCircle, isToday ? styles.todayCircle : null]}>
                  <Text style={[styles.dayNum, isToday ? styles.todayNum : null]}>{d}</Text>
                </View>
                <View style={styles.dots}>
                  {dot && dot.receipt_count > 0 && <View style={styles.dotGreen} />}
                  {dot && dot.issue_count > 0 && <View style={styles.dotRed} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={styles.dotGreen} />
            <Text style={styles.legendText}>Receipt</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.dotRed} />
            <Text style={styles.legendText}>Issue</Text>
          </View>
        </View>
      </ScrollView>

      {/* Day Detail Panel */}
      <Modal
        visible={showDayPanel}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDayPanel(false)}
      >
        <TouchableOpacity
          style={styles.panelOverlay}
          onPress={() => setShowDayPanel(false)}
        />
        <View style={[styles.dayPanel, { paddingBottom: insets.bottom + 20 }]}>
          {/* Panel Header */}
          <View style={styles.panelHeader}>
            <Text style={styles.panelDate}>{selectedDate ? formatDateDisplay(selectedDate) : ''}</Text>
            <TouchableOpacity onPress={() => setShowDayPanel(false)}>
              <Ionicons name="close" size={22} color="#4A5568" />
            </TouchableOpacity>
          </View>

          {/* Day Totals */}
          <View style={styles.dayTotals}>
            <View style={styles.dayTotalItem}>
              <Text style={styles.dayTotalLabel}>Receipt</Text>
              <Text style={[styles.dayTotalValue, { color: '#22C55E' }]}>{formatINR(dayTotals.receipt)}</Text>
            </View>
            <View style={styles.dayTotalDivider} />
            <View style={styles.dayTotalItem}>
              <Text style={styles.dayTotalLabel}>Issue</Text>
              <Text style={[styles.dayTotalValue, { color: '#EF4444' }]}>{formatINR(dayTotals.issue)}</Text>
            </View>
          </View>

          {/* Day Transactions */}
          <ScrollView style={{ maxHeight: 300 }}>
            {dayTxs.length === 0 ? (
              <View style={styles.panelEmpty}>
                <Text style={styles.panelEmptyText}>No transactions on this day.</Text>
              </View>
            ) : (
              dayTxs.map(tx => {
                const isR = tx.type === 'receipt';
                return (
                  <View key={tx.id} style={[styles.panelRow, { borderLeftColor: isR ? '#22C55E' : '#EF4444' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.panelParty}>{tx.party_name}</Text>
                      <Text style={styles.panelMeta}>
                        {tx.payment_mode === 'gold'
                          ? `Gold · ${tx.gold_fine_grams?.toFixed(3)}g`
                          : tx.payment_mode}
                        {tx.notes ? ` · ${tx.notes}` : ''}
                      </Text>
                    </View>
                    <View style={styles.panelRight}>
                      <Text style={styles.panelAmt}>{formatINR(tx.amount)}</Text>
                      <View style={[styles.badge, { backgroundColor: isR ? '#DCFCE7' : '#FEE2E2' }]}>
                        <Text style={[styles.badgeText, { color: isR ? '#16A34A' : '#DC2626' }]}>
                          {isR ? 'Receipt' : 'Issue'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  navBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 17, fontWeight: '700', color: '#1E2A3A' },
  weekRow: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  weekCell: { flex: 1, alignItems: 'center' },
  weekLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 56, alignItems: 'center', paddingTop: 6 },
  dayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  todayCircle: { backgroundColor: '#1A56DB' },
  dayNum: { fontSize: 14, color: '#1E2A3A', fontWeight: '500' },
  todayNum: { color: '#fff', fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 3, marginTop: 2 },
  dotGreen: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  dotRed: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  panelOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  dayPanel: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  panelDate: { fontSize: 16, fontWeight: '700', color: '#1E2A3A' },
  dayTotals: { flexDirection: 'row', padding: 16, gap: 4 },
  dayTotalItem: { flex: 1, alignItems: 'center' },
  dayTotalLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 2 },
  dayTotalValue: { fontSize: 16, fontWeight: '800' },
  dayTotalDivider: { width: 1, backgroundColor: '#E2E8F0' },
  panelEmpty: { padding: 24, alignItems: 'center' },
  panelEmptyText: { fontSize: 14, color: '#A0AEC0' },
  panelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderLeftWidth: 3, marginBottom: 1, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F8FAFF' },
  panelParty: { fontSize: 14, fontWeight: '700', color: '#1E2A3A' },
  panelMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  panelRight: { alignItems: 'flex-end', gap: 4 },
  panelAmt: { fontSize: 14, fontWeight: '700', color: '#1E2A3A' },
  badge: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },
});
