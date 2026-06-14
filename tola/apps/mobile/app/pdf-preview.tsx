import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function PdfPreviewScreen() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const insets = useSafeAreaInsets();
  const uriRef = useRef(uri);
  const [webViewError, setWebViewError] = useState(false);

  useEffect(() => {
    return () => {
      FileSystem.deleteAsync(uriRef.current, { idempotent: true });
    };
  }, []);

  async function handleShare() {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  }

  async function handleSave() {
    const dest = FileSystem.documentDirectory + 'tola-report.pdf';
    await FileSystem.copyAsync({ from: uri, to: dest });
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#1A56DB" />
          <Text style={styles.headerBtnText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PDF Preview</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color="#1A56DB" />
          <Text style={styles.headerBtnText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* PDF Viewer */}
      {!webViewError ? (
        <WebView
          source={{ uri }}
          style={{ flex: 1 }}
          originWhitelist={['file://*', 'http://*', 'https://*', '*']}
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          javaScriptEnabled={false}
          onError={() => setWebViewError(true)}
        />
      ) : (
        <View style={styles.fallback}>
          <Ionicons name="document-outline" size={64} color="#D1D9E6" />
          <Text style={styles.fallbackTitle}>Cannot preview PDF</Text>
          <Text style={styles.fallbackSub}>
            Tap Save or Share to open in your PDF app
          </Text>
        </View>
      )}

      {/* Bottom Actions */}
      <View style={[styles.bottomRow, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.btnOutline} onPress={handleSave}>
          <Ionicons name="download-outline" size={18} color="#1A56DB" />
          <Text style={styles.btnOutlineText}>Save to Files</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnFilled} onPress={handleShare}>
          <Ionicons name="share-outline" size={18} color="#fff" />
          <Text style={styles.btnFilledText}>Share PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 70 },
  headerBtnText: { color: '#1A56DB', fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1E2A3A' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  fallbackTitle: { fontSize: 17, fontWeight: '700', color: '#1E2A3A' },
  fallbackSub: { fontSize: 14, color: '#718096', textAlign: 'center' },
  bottomRow: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  btnOutline: {
    flex: 1, height: 50, borderRadius: 10, borderWidth: 1.5, borderColor: '#1A56DB',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnOutlineText: { color: '#1A56DB', fontSize: 15, fontWeight: '600' },
  btnFilled: {
    flex: 1, height: 50, borderRadius: 10, backgroundColor: '#1A56DB',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnFilledText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
