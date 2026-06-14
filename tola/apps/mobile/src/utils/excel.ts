import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Transaction } from '../types';

export async function exportToExcel(txs: Transaction[], filename: string = 'tola-export'): Promise<void> {
  const rows = txs.map(t => ({
    Date: t.date,
    Party: t.party_name ?? '',
    Type: t.type,
    Mode: t.payment_mode,
    'Online Type': t.online_subtype ?? '',
    'Gold Type': t.gold_type ?? '',
    'Purity (%)': t.gold_purity ?? '',
    'Weight (g)': t.gold_weight_grams ?? '',
    'Wastage (%)': t.gold_wastage_percent ?? '',
    'Fine (g)': t.gold_fine_grams ?? '',
    'Price/g (₹)': t.gold_price_per_gram ?? '',
    'Gold Value (₹)': t.gold_total_value ?? '',
    'Amount (₹)': t.amount,
    Notes: t.notes ?? '',
  }));

  // Totals summary row
  const receiptTotal = txs.filter(t => t.type === 'receipt').reduce((s, t) => s + t.amount, 0);
  const issueTotal = txs.filter(t => t.type === 'issue').reduce((s, t) => s + t.amount, 0);
  rows.push({} as any);
  rows.push({
    Date: 'TOTALS',
    Party: '',
    Type: '',
    Mode: '',
    'Online Type': '',
    'Gold Type': '',
    'Purity (%)': '',
    'Weight (g)': '',
    'Wastage (%)': '',
    'Fine (g)': '',
    'Price/g (₹)': '',
    'Gold Value (₹)': '',
    'Amount (₹)': `Receipt: ${receiptTotal} | Issue: ${issueTotal} | Net: ${receiptTotal - issueTotal}`,
    Notes: '',
  } as any);

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

  // Column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
    { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 30 },
  ];

  const binary = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  const uri = `${FileSystem.cacheDirectory}${filename.replace(/[^a-z0-9-]/gi, '_')}.xlsx`;
  await FileSystem.writeAsStringAsync(uri, binary, { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Export to Excel',
  });
  await FileSystem.deleteAsync(uri, { idempotent: true });
}
