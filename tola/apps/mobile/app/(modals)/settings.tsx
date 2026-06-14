import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal,
} from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDb, getFirmId } from '../../src/db/database';
import { FirmQ, PartyQ } from '../../src/db/queries';
import { now } from '../../src/utils/format';
import type { Firm, Party } from '../../src/types';

export default function Settings() {
  const insets = useSafeAreaInsets();
  const [firm, setFirm] = useState<Firm | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [editModal, setEditModal] = useState<{ field: keyof Firm; label: string; value: string } | null>(null);
  const [showParties, setShowParties] = useState(false);
  const [renameModal, setRenameModal] = useState<Party | null>(null);

  function load() {
    const db = getDb();
    const f = db.getFirstSync<Firm>(FirmQ.get);
    setFirm(f ?? null);
    const firmId = getFirmId();
    if (firmId) {
      const ps = db.getAllSync<Party>(PartyQ.getAll, firmId);
      setParties(ps);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  function handleEditField(field: keyof Firm, label: string) {
    if (!firm) return;
    setEditModal({ field, label, value: (firm[field] as string) ?? '' });
  }

  function saveField(field: keyof Firm, value: string) {
    if (!firm) return;
    const db = getDb();
    db.runSync(
      FirmQ.update,
      field === 'name' ? value : firm.name,
      field === 'gstin' ? value : firm.gstin ?? null,
      field === 'address' ? value : firm.address ?? null,
      field === 'city' ? value : firm.city ?? null,
      field === 'phone' ? value : firm.phone ?? null,
      firm.id,
    );
    setEditModal(null);
    load();
  }

  async function handleExportDb() {
    try {
      const dbPath = `${FileSystem.documentDirectory}SQLite/tola.db`;
      const info = await FileSystem.getInfoAsync(dbPath);
      if (!info.exists) {
        Alert.alert('Error', 'Database file not found');
        return;
      }
      await Sharing.shareAsync(dbPath, {
        mimeType: 'application/octet-stream',
        dialogTitle: 'Export TOLA Database',
      });
    } catch (e) {
      Alert.alert('Error', 'Could not export database');
    }
  }

  function handleDeleteParty(party: Party) {
    Alert.alert(
      'Delete Party',
      `Delete "${party.name}"? Their transactions will remain.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => {
            const db = getDb();
            db.runSync(PartyQ.softDelete, now(), now(), party.id);
            load();
          },
        },
      ]
    );
  }

  function handleRenameParty(party: Party, newName: string) {
    const db = getDb();
    db.runSync(PartyQ.rename, newName.trim(), now(), party.id);
    setRenameModal(null);
    load();
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFF' }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#1A56DB" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* Business Section */}
        <SectionHeader label="Business" />
        <SettingsGroup>
          <SettingsRow
            label="Firm Name"
            value={firm?.name ?? '—'}
            onPress={() => handleEditField('name', 'Firm Name')}
          />
          <SettingsRow
            label="GSTIN"
            value={firm?.gstin ?? 'Not set'}
            onPress={() => handleEditField('gstin', 'GSTIN')}
          />
          <SettingsRow
            label="City"
            value={firm?.city ?? 'Not set'}
            onPress={() => handleEditField('city', 'City')}
          />
          <SettingsRow
            label="Phone"
            value={firm?.phone ?? 'Not set'}
            onPress={() => handleEditField('phone', 'Phone')}
            last
          />
        </SettingsGroup>

        {/* Party Management */}
        <SectionHeader label="Party Management" />
        <SettingsGroup>
          <TouchableOpacity
            style={[styles.row, styles.rowLast]}
            onPress={() => setShowParties(!showParties)}
          >
            <Text style={styles.rowLabel}>Manage Parties</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{parties.length} parties</Text>
              <Ionicons name={showParties ? 'chevron-up' : 'chevron-down'} size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
          {showParties && (
            <View style={styles.partiesList}>
              {parties.length === 0 ? (
                <Text style={styles.emptyText}>No parties found</Text>
              ) : (
                parties.map(p => (
                  <View key={p.id} style={styles.partyRow}>
                    <Text style={styles.partyName}>{p.name}</Text>
                    <View style={styles.partyActions}>
                      <TouchableOpacity onPress={() => setRenameModal(p)} style={styles.partyActionBtn}>
                        <Ionicons name="pencil-outline" size={14} color="#1A56DB" />
                        <Text style={styles.partyActionText}>Rename</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteParty(p)} style={[styles.partyActionBtn, { backgroundColor: '#FEF2F2' }]}>
                        <Ionicons name="trash-outline" size={14} color="#DC2626" />
                        <Text style={[styles.partyActionText, { color: '#DC2626' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </SettingsGroup>

        {/* Data Section */}
        <SectionHeader label="Data" />
        <SettingsGroup>
          <TouchableOpacity style={styles.row} onPress={handleExportDb}>
            <Text style={styles.rowLabel}>Export All Data</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValueBlue}>Export .db →</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.row, styles.rowLast]}
            onPress={() => Alert.alert('Import Data', 'Restore from a .db file? This will replace all current data.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Restore', style: 'destructive', onPress: () => { /* TODO: file picker */ } },
            ])}
          >
            <Text style={styles.rowLabel}>Import Data</Text>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValueBlue, { color: '#EF4444' }]}>Restore .db →</Text>
            </View>
          </TouchableOpacity>
        </SettingsGroup>

        {/* App Info */}
        <SectionHeader label="App" />
        <SettingsGroup>
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
        </SettingsGroup>
      </ScrollView>

      {/* Edit Field Modal */}
      {editModal && (
        <EditFieldModal
          label={editModal.label}
          initialValue={editModal.value}
          onSave={(v) => saveField(editModal.field, v)}
          onClose={() => setEditModal(null)}
        />
      )}

      {/* Rename Party Modal */}
      {renameModal && (
        <EditFieldModal
          label="Rename Party"
          initialValue={renameModal.name}
          onSave={(v) => handleRenameParty(renameModal, v)}
          onClose={() => setRenameModal(null)}
        />
      )}
    </View>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <Text style={styles.sectionHeader}>{label.toUpperCase()}</Text>
  );
}

function SettingsGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

function SettingsRow({ label, value, onPress, last = false }: {
  label: string; value: string; onPress: () => void; last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, last ? styles.rowLast : null]}
      onPress={onPress}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
}

function EditFieldModal({ label, initialValue, onSave, onClose }: {
  label: string; initialValue: string; onSave: (v: string) => void; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(initialValue);
  return (
    <Modal visible animationType="slide" transparent>
      <TouchableOpacity style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{label}</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color="#4A5568" /></TouchableOpacity>
        </View>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          autoFocus
          placeholder={label}
          placeholderTextColor="#A0AEC0"
        />
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => { if (value.trim()) onSave(value.trim()); }}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>
    </Modal>
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
  sectionHeader: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6,
  },
  group: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 15, color: '#1E2A3A' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'flex-end' },
  rowValue: { fontSize: 14, color: '#94A3B8', maxWidth: 160 },
  rowValueBlue: { fontSize: 14, color: '#1A56DB', fontWeight: '600' },
  partiesList: { paddingHorizontal: 16, paddingBottom: 8, backgroundColor: '#F8FAFF' },
  partyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  partyName: { fontSize: 14, color: '#1E2A3A', flex: 1 },
  partyActions: { flexDirection: 'row', gap: 6 },
  partyActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  partyActionText: { fontSize: 12, color: '#1A56DB', fontWeight: '600' },
  emptyText: { fontSize: 13, color: '#A0AEC0', paddingVertical: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#1E2A3A' },
  input: { height: 48, backgroundColor: '#F8FAFF', borderWidth: 1.5, borderColor: '#D1D9E6', borderRadius: 10, paddingHorizontal: 14, fontSize: 15, color: '#1E2A3A', marginBottom: 16 },
  saveBtn: { backgroundColor: '#1A56DB', borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
