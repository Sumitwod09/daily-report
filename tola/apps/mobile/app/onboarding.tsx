import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../src/db/database';
import { FirmQ } from '../src/db/queries';
import { now } from '../src/utils/format';

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const [firmName, setFirmName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!firmName.trim()) e.firmName = 'Business name is required';
    if (!city.trim()) e.city = 'City is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    try {
      const db = getDb();
      const id = uuidv4();
      db.runSync(
        FirmQ.insert,
        id,
        firmName.trim(),
        gstin.trim() || null,
        null,
        city.trim(),
        phone.trim() || null,
        now(),
      );
      router.replace('/(tabs)/dashboard');
    } catch (e) {
      Alert.alert('Error', 'Could not save. Please try again.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8FAFF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>T</Text>
          </View>
          <Text style={styles.logoName}>TOLA</Text>
        </View>

        <Text style={styles.heading}>Welcome to TOLA</Text>
        <Text style={styles.sub}>Set up your business to get started</Text>

        <View style={styles.form}>
          <Field
            label="Business Name *"
            placeholder="e.g. Ananda Jewellers"
            value={firmName}
            onChangeText={setFirmName}
            error={errors.firmName}
          />
          <Field
            label="Owner Name *"
            placeholder="Your name"
            value={ownerName}
            onChangeText={setOwnerName}
            error={errors.ownerName}
          />
          <Field
            label="City *"
            placeholder="e.g. Mumbai"
            value={city}
            onChangeText={setCity}
            error={errors.city}
          />
          <Field
            label="Phone (optional)"
            placeholder="+91 98765 43210"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Field
            label="GSTIN (optional)"
            placeholder="29ABCDE1234F1Z5"
            value={gstin}
            onChangeText={setGstin}
            autoCapitalize="characters"
          />
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={styles.btnText}>Get Started</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, placeholder, value, onChangeText, error, keyboardType, autoCapitalize,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholder={placeholder}
        placeholderTextColor="#A0AEC0"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'words'}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1A56DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  logoName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A56DB',
    letterSpacing: 4,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E2A3A',
    marginBottom: 6,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  fieldWrap: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#D1D9E6',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1E2A3A',
  },
  inputError: {
    borderColor: '#E53E3E',
  },
  errorText: {
    fontSize: 12,
    color: '#E53E3E',
    marginTop: 4,
  },
  btn: {
    width: '100%',
    height: 54,
    backgroundColor: '#1A56DB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
