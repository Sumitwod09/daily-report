import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, Modal, FlatList,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import { getDb, getFirmId } from '../../src/db/database';
import { TxQ, PartyQ, FirmQ } from '../../src/db/queries';
import { calculateFine, calculateGoldValue, GOLD_PURITIES } from '../../src/utils/gold';
import { today, now, formatDateDisplay } from '../../src/utils/format';
import { buildTransactionSlipHtml } from '../../src/utils/pdf';
import type { Transaction, PaymentMode, OnlineSubtype, GoldType, TransactionType, Party, Firm } from '../../src/types';

type Params = { type?: TransactionType; transactionId?: string };

export default function AddTransaction() {
  const insets = useSafeAreaInsets();
  const { type: paramType, transactionId } = useLocalSearchParams<Params>();
  const isEdit = !!transactionId;

  const txType: TransactionType = paramType === 'issue' ? 'issue' : 'receipt';

  // Form state
  const [date, setDate] = useState(today());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [partyName, setPartyName] = useState('');
  const [partyId, setPartyId] = useState<string | null>(null);
  const [partySuggestions, setPartySuggestions] = useState<Party[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [onlineSubtype, setOnlineSubtype] = useState<OnlineSubtype>('upi');
  const [goldType, setGoldType] = useState<GoldType>('pure');
  const [purity, setPurity] = useState<number>(91.6);
  const [customPurity, setCustomPurity] = useState('');
  const [weight, setWeight] = useState('');
  const [wastage, setWastage] = useState('0.000');
  const [pricePerGram, setPricePerGram] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPurityPicker, setShowPurityPicker] = useState(false);

  const db = getDb();

  useEffect(() => {
    if (isEdit && transactionId) {
      const tx = db.getFirstSync<Transaction>(
        'SELECT t.*, p.name AS party_name FROM transactions t JOIN parties p ON p.id=t.party_id WHERE t.id=?',
        transactionId
      );
      if (tx) {
        setDate(tx.date);
        setPartyName(tx.party_name ?? '');
        setPartyId(tx.party_id);
        setPaymentMode(tx.payment_mode);
        if (tx.online_subtype) setOnlineSubtype(tx.online_subtype);
        if (tx.gold_type) setGoldType(tx.gold_type);
        if (tx.gold_purity) setPurity(tx.gold_purity);
        if (tx.gold_weight_grams) setWeight(tx.gold_weight_grams.toString());
        if (tx.gold_wastage_percent != null) setWastage(tx.gold_wastage_percent.toString());
        if (tx.gold_price_per_gram) setPricePerGram(tx.gold_price_per_gram.toString());
        if (tx.payment_mode !== 'gold') setAmount(tx.amount.toString());
        if (tx.notes) setNotes(tx.notes);
      }
    }
  }, []);

  // Party search
  function onPartyChange(text: string) {
    setPartyName(text);
    setPartyId(null);
    if (text.length > 0) {
      const firmId = getFirmId();
      if (!firmId) return;
      const results = db.getAllSync<Party>(PartyQ.search, firmId, `%${text}%`);
      setPartySuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }

  function selectParty(p: Party) {
    setPartyName(p.name);
    setPartyId(p.id);
    setShowSuggestions(false);
  }

  // Calculated values
  const w = parseFloat(weight) || 0;
  const wu = parseFloat(wastage) || 0;
  const p = purity;
  const ppg = parseFloat(pricePerGram) || 0;
  const fine = calculateFine(w, p, wu);
  const goldValue = calculateGoldValue(w, ppg);

  function validate() {
    const e: Record<string, string> = {};
    if (!partyName.trim()) e.party = 'Party name is required';
    if (paymentMode === 'gold') {
      if (w <= 0) e.weight = 'Weight must be greater than 0';
    } else {
      if ((parseFloat(amount) || 0) <= 0) e.amount = 'Amount must be greater than 0';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function resolvePartyId(): Promise<string> {
    if (partyId) return partyId;
    const firmId = getFirmId()!;
    const id = uuidv4();
    db.runSync(PartyQ.insert, id, firmId, partyName.trim(), null, now(), now());
    return id;
  }

  async function saveTx(): Promise<Transaction> {
    const firmId = getFirmId()!;
    const pid = await resolvePartyId();
    const finalAmount = paymentMode === 'gold' ? goldValue : parseFloat(amount) || 0;

    if (isEdit && transactionId) {
      db.runSync(
        TxQ.update,
        pid, date, txType, paymentMode,
        paymentMode === 'online' ? onlineSubtype : null,
        paymentMode === 'gold' ? goldType : null,
        paymentMode === 'gold' ? p : null,
        paymentMode === 'gold' ? w : null,
        paymentMode === 'gold' ? wu : null,
        paymentMode === 'gold' ? fine : null,
        paymentMode === 'gold' && ppg > 0 ? ppg : null,
        paymentMode === 'gold' ? goldValue : null,
        finalAmount,
        notes.trim() || null,
        now(),
        transactionId,
      );
      return db.getFirstSync<Transaction>('SELECT * FROM transactions WHERE id=?', transactionId)!;
    } else {
      const id = uuidv4();
      db.runSync(
        TxQ.insert,
        id, firmId, pid, date, txType, paymentMode,
        paymentMode === 'online' ? onlineSubtype : null,
        paymentMode === 'gold' ? goldType : null,
        paymentMode === 'gold' ? p : null,
        paymentMode === 'gold' ? w : null,
        paymentMode === 'gold' ? wu : 0,
        paymentMode === 'gold' ? fine : null,
        paymentMode === 'gold' && ppg > 0 ? ppg : null,
        paymentMode === 'gold' ? goldValue : null,
        finalAmount,
        notes.trim() || null,
        now(), now(),
      );
      return db.getFirstSync<Transaction>('SELECT * FROM transactions WHERE id=?', id)!;
    }
  }

  async function handleSave() {
    if (!validate()) return;
    try {
      await saveTx();
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Could not save transaction.');
    }
  }

  async function handleSaveAndShare() {
    if (!validate()) return;
    try {
      const tx = await saveTx();
      const firm = db.getFirstSync<Firm>(FirmQ.get)!;
      const html = buildTransactionSlipHtml({ ...tx, party_name: partyName }, firm.name);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Receipt' });
      await FileSystem.deleteAsync(uri, { idempotent: true });
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Could not generate PDF.');
    }
  }

  const title = isEdit ? 'Edit Transaction' : txType === 'receipt' ? 'New Receipt' : 'New Issue';
  const badgeColor = txType === 'receipt' ? '#DCFCE7' : '#FEE2E2';
  const badgeText = txType === 'receipt' ? 'RECEIPT' : 'ISSUE';
  const badgeTextColor = txType === 'receipt' ? '#16A34A' : '#DC2626';

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFF' }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
          <Ionicons name="close" size={22} color="#4A5568" />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={[styles.typeBadge, { backgroundColor: badgeColor }]}>
          <Text style={[styles.typeBadgeText, { color: badgeTextColor }]}>{badgeText}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.formBody}
          keyboardShouldPersistTaps="handled"
        >
          {/* Date */}
          <FormSection label="Date">
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={16} color="#4A5568" />
              <Text style={styles.dateBtnText}>{formatDateDisplay(date)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(date)}
                mode="date"
                display="default"
                onChange={(_, d) => {
                  setShowDatePicker(false);
                  if (d) setDate(d.toISOString().split('T')[0]);
                }}
              />
            )}
          </FormSection>

          {/* Party */}
          <FormSection label="Party *" error={errors.party}>
            <TextInput
              style={[styles.input, errors.party ? styles.inputError : null]}
              placeholder="Party name"
              placeholderTextColor="#A0AEC0"
              value={partyName}
              onChangeText={onPartyChange}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {showSuggestions && (
              <View style={styles.suggestions}>
                {partySuggestions.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.suggestion}
                    onPress={() => selectParty(p)}
                  >
                    <Text style={styles.suggestionText}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </FormSection>

          {/* Payment Mode */}
          <FormSection label="Payment Mode">
            <View style={styles.pillRow}>
              {(['cash', 'online', 'gold'] as PaymentMode[]).map((m) => (
                <Pill
                  key={m}
                  label={m.charAt(0).toUpperCase() + m.slice(1)}
                  selected={paymentMode === m}
                  onPress={() => setPaymentMode(m)}
                />
              ))}
            </View>
          </FormSection>

          {/* Online sub-type */}
          {paymentMode === 'online' && (
            <FormSection label="Online Type">
              <View style={styles.pillRow}>
                {(['upi', 'netbanking', 'card'] as OnlineSubtype[]).map((s) => (
                  <Pill
                    key={s}
                    label={s.toUpperCase()}
                    selected={onlineSubtype === s}
                    onPress={() => setOnlineSubtype(s)}
                  />
                ))}
              </View>
            </FormSection>
          )}

          {/* Gold fields */}
          {paymentMode === 'gold' && (
            <>
              <FormSection label="Gold Type">
                <View style={styles.pillRow}>
                  <Pill label="Pure" selected={goldType === 'pure'} onPress={() => setGoldType('pure')} />
                  <Pill label="Ornaments" selected={goldType === 'ornament'} onPress={() => setGoldType('ornament')} />
                </View>
              </FormSection>

              <FormSection label="Purity">
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowPurityPicker(true)}
                >
                  <Text style={{ color: '#1E2A3A', fontSize: 15 }}>
                    {GOLD_PURITIES.find(p => p.value === purity)?.label ?? `${purity}%`}
                  </Text>
                </TouchableOpacity>
                <Modal visible={showPurityPicker} transparent animationType="slide">
                  <TouchableOpacity
                    style={styles.modalOverlay}
                    onPress={() => setShowPurityPicker(false)}
                  />
                  <View style={styles.pickerSheet}>
                    <Text style={styles.pickerTitle}>Select Purity</Text>
                    {GOLD_PURITIES.map((g) => (
                      <TouchableOpacity
                        key={g.value}
                        style={styles.pickerItem}
                        onPress={() => { setPurity(g.value); setShowPurityPicker(false); }}
                      >
                        <Text style={[
                          styles.pickerItemText,
                          g.value === purity ? { color: '#1A56DB', fontWeight: '700' } : null,
                        ]}>
                          {g.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TextInput
                      style={[styles.input, { marginHorizontal: 16, marginTop: 8 }]}
                      placeholder="Custom purity (e.g. 95.5)"
                      placeholderTextColor="#A0AEC0"
                      keyboardType="decimal-pad"
                      value={customPurity}
                      onChangeText={setCustomPurity}
                      onSubmitEditing={() => {
                        const v = parseFloat(customPurity);
                        if (v > 0 && v <= 100) { setPurity(v); setShowPurityPicker(false); }
                      }}
                    />
                  </View>
                </Modal>
              </FormSection>

              <View style={styles.twoCol}>
                <FormSection label="Weight (g)" error={errors.weight} style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.input, errors.weight ? styles.inputError : null]}
                    placeholder="0.000"
                    placeholderTextColor="#A0AEC0"
                    keyboardType="decimal-pad"
                    value={weight}
                    onChangeText={setWeight}
                  />
                </FormSection>
                <FormSection label="Wastage %" style={{ flex: 1 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="0.000"
                    placeholderTextColor="#A0AEC0"
                    keyboardType="decimal-pad"
                    value={wastage}
                    onChangeText={setWastage}
                  />
                </FormSection>
              </View>

              <FormSection label="Fine (g)">
                <View style={styles.readOnly}>
                  <Text style={styles.readOnlyValue}>{fine.toFixed(3)}g</Text>
                </View>
              </FormSection>

              <View style={styles.twoCol}>
                <FormSection label="Price / gram (₹)" style={{ flex: 1 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor="#A0AEC0"
                    keyboardType="decimal-pad"
                    value={pricePerGram}
                    onChangeText={setPricePerGram}
                  />
                </FormSection>
                <FormSection label="Gold Value (₹)" style={{ flex: 1 }}>
                  <View style={styles.readOnly}>
                    <Text style={styles.readOnlyValue}>₹{goldValue.toFixed(2)}</Text>
                  </View>
                </FormSection>
              </View>
            </>
          )}

          {/* Amount */}
          {paymentMode !== 'gold' && (
            <FormSection label="Amount (₹) *" error={errors.amount}>
              <TextInput
                style={[styles.input, errors.amount ? styles.inputError : null]}
                placeholder="0.00"
                placeholderTextColor="#A0AEC0"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </FormSection>
          )}

          {/* Notes */}
          <FormSection label="Notes (optional)">
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
              placeholder="Add a note..."
              placeholderTextColor="#A0AEC0"
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
              returnKeyType="done"
            />
          </FormSection>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Bottom CTAs */}
        <View style={[styles.bottomRow, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={styles.btnOutline} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.btnOutlineText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnFilled} onPress={handleSaveAndShare} activeOpacity={0.85}>
            <Ionicons name="share-outline" size={16} color="#fff" />
            <Text style={styles.btnFilledText}>Save & Share</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function FormSection({
  label, children, error, style,
}: { label: string; children: React.ReactNode; error?: string; style?: any }) {
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function Pill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.pill, selected ? styles.pillActive : styles.pillInactive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.pillText, selected ? styles.pillTextActive : styles.pillTextInactive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 70 },
  cancelText: { fontSize: 15, color: '#4A5568', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1E2A3A' },
  typeBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },
  formBody: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#4A5568', marginBottom: 6 },
  input: {
    height: 48, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#D1D9E6', borderRadius: 10,
    paddingHorizontal: 14, fontSize: 15, color: '#1E2A3A',
    justifyContent: 'center',
  },
  inputError: { borderColor: '#E53E3E' },
  errorText: { fontSize: 12, color: '#E53E3E', marginTop: 4 },
  dateBtn: {
    height: 48, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#D1D9E6',
    borderRadius: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  dateBtnText: { fontSize: 15, color: '#1E2A3A', fontWeight: '500' },
  suggestions: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D9E6',
    borderRadius: 10, marginTop: 4, maxHeight: 160,
  },
  suggestion: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  suggestionText: { fontSize: 15, color: '#1E2A3A' },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5 },
  pillActive: { backgroundColor: '#1A56DB', borderColor: '#1A56DB' },
  pillInactive: { backgroundColor: '#fff', borderColor: '#D1D9E6' },
  pillText: { fontSize: 14, fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  pillTextInactive: { color: '#4A5568' },
  readOnly: {
    height: 48, backgroundColor: '#F5F7FA', borderRadius: 10,
    paddingHorizontal: 14, justifyContent: 'center',
  },
  readOnlyValue: { fontSize: 16, fontWeight: '700', color: '#22C55E' },
  twoCol: { flexDirection: 'row', gap: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingBottom: 40,
  },
  pickerTitle: {
    fontSize: 16, fontWeight: '700', color: '#1E2A3A',
    textAlign: 'center', marginBottom: 12,
  },
  pickerItem: { paddingHorizontal: 24, paddingVertical: 14 },
  pickerItemText: { fontSize: 15, color: '#4A5568' },
  bottomRow: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  btnOutline: {
    flex: 1, height: 52, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#1A56DB',
    alignItems: 'center', justifyContent: 'center',
  },
  btnOutlineText: { color: '#1A56DB', fontSize: 15, fontWeight: '700' },
  btnFilled: {
    flex: 1, height: 52, borderRadius: 10,
    backgroundColor: '#1A56DB',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnFilledText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
