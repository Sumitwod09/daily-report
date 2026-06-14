import type { Transaction } from '../types';

function formatINRRaw(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtDateShort(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1E2A3A; }
  .brand-blue { color: #1A56DB; }
  .green { color: #22C55E; }
  .red { color: #EF4444; }
  .gold { color: #D97706; }
`;

// ── TRANSACTION SLIP ──────────────────────────────────────────────────────────

export function buildTransactionSlipHtml(tx: Transaction, firmName: string): string {
  const isReceipt = tx.type === 'receipt';
  const isGold = tx.payment_mode === 'gold';
  const accentColor = isReceipt ? '#22C55E' : '#EF4444';
  const typeLabel = isReceipt ? 'RECEIPT' : 'ISSUE';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
${CSS}
body { background: #f8f9fa; padding: 0; }
.slip { max-width: 420px; margin: 20px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
.slip-header { background: ${accentColor}; color: #fff; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
.firm-name { font-size: 18px; font-weight: 800; }
.type-badge { background: rgba(255,255,255,0.25); border-radius: 20px; padding: 4px 14px; font-size: 13px; font-weight: 700; }
.slip-body { padding: 20px 24px; }
.party-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1.5px dashed #E2E8F0; }
.party-name { font-size: 20px; font-weight: 800; }
.date-text { font-size: 13px; color: #94A3B8; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.detail-item {}
.detail-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #94A3B8; font-weight: 600; margin-bottom: 2px; }
.detail-value { font-size: 14px; font-weight: 600; color: #1E2A3A; }
.amount-box { background: ${isReceipt ? '#DCFCE7' : '#FEE2E2'}; border-radius: 12px; padding: 16px 20px; text-align: center; margin-bottom: 16px; }
.amount-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${accentColor}; font-weight: 700; margin-bottom: 4px; }
.amount-value { font-size: 28px; font-weight: 900; color: ${accentColor}; }
.notes-row { font-size: 13px; color: #4A5568; padding: 12px 0; border-top: 1px solid #F1F5F9; }
.footer { background: #F8FAFF; padding: 12px 24px; text-align: center; font-size: 11px; color: #94A3B8; }
.gold-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 13px; }
.gold-table th { background: #FEF3C7; color: #92400E; font-size: 10px; padding: 6px 8px; text-align: left; }
.gold-table td { padding: 7px 8px; border-bottom: 1px solid #F1F5F9; }
</style>
</head>
<body>
<div class="slip">
  <div class="slip-header">
    <div class="firm-name">${esc(firmName)}</div>
    <div class="type-badge">${typeLabel}</div>
  </div>
  <div class="slip-body">
    <div class="party-row">
      <div>
        <div style="font-size:11px;color:#94A3B8;margin-bottom:2px">PARTY</div>
        <div class="party-name">${esc(tx.party_name ?? 'Unknown')}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:#94A3B8;margin-bottom:2px">DATE</div>
        <div style="font-size:14px;font-weight:600">${fmtDate(tx.date)}</div>
      </div>
    </div>

    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-label">Payment Mode</div>
        <div class="detail-value">${tx.payment_mode.charAt(0).toUpperCase() + tx.payment_mode.slice(1)}${tx.online_subtype ? ' · ' + tx.online_subtype.toUpperCase() : ''}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Transaction ID</div>
        <div class="detail-value" style="font-size:11px;word-break:break-all">${tx.id.slice(0, 8)}…</div>
      </div>
    </div>

    ${isGold ? `
    <table class="gold-table">
      <tr>
        <th>Weight</th><th>Purity</th><th>Wastage</th><th>Fine</th>
        ${tx.gold_price_per_gram ? '<th>Price/g</th>' : ''}
      </tr>
      <tr>
        <td>${tx.gold_weight_grams?.toFixed(3) ?? '—'}g</td>
        <td>${tx.gold_purity ?? '—'}%</td>
        <td>${tx.gold_wastage_percent?.toFixed(3) ?? '0'}%</td>
        <td style="font-weight:700;color:#D97706">${tx.gold_fine_grams?.toFixed(3) ?? '—'}g</td>
        ${tx.gold_price_per_gram ? `<td>${formatINRRaw(tx.gold_price_per_gram)}</td>` : ''}
      </tr>
    </table>
    ` : ''}

    <div class="amount-box">
      <div class="amount-label">${isReceipt ? 'Amount Received' : 'Amount Issued'}</div>
      <div class="amount-value">${formatINRRaw(tx.amount)}</div>
    </div>

    ${tx.notes ? `<div class="notes-row">📝 ${esc(tx.notes)}</div>` : ''}
  </div>
  <div class="footer">
    Generated by TOLA · ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
  </div>
</div>
</body>
</html>`;
}

// ── DATE REPORT ───────────────────────────────────────────────────────────────

export function buildDateReportHtml(
  date: string,
  txs: Transaction[],
  totals: { cash_receipt: number; cash_issue: number; gold_receipt_fine: number; gold_issue_fine: number },
  firmName: string
): string {
  const cashTxs = txs.filter(t => t.payment_mode !== 'gold');
  const goldTxs = txs.filter(t => t.payment_mode === 'gold');

  const cashRows = cashTxs.map(t => `
    <tr style="border-left:3px solid ${t.type === 'receipt' ? '#22C55E' : '#EF4444'}">
      <td>${fmtDateShort(t.date)}</td>
      <td>${esc(t.party_name ?? '')}</td>
      <td>${t.payment_mode}</td>
      <td style="color:${t.type === 'receipt' ? '#22C55E' : '#EF4444'}">${t.type === 'receipt' ? 'Rec' : 'Iss'}</td>
      <td style="text-align:right;font-weight:700">${formatINRRaw(t.amount)}</td>
    </tr>
  `).join('');

  const goldRows = goldTxs.map(t => `
    <tr style="border-left:3px solid ${t.type === 'receipt' ? '#22C55E' : '#EF4444'}">
      <td>${fmtDateShort(t.date)}</td>
      <td>${esc(t.party_name ?? '')}</td>
      <td>${t.gold_weight_grams?.toFixed(3) ?? '—'}g</td>
      <td>${t.gold_purity ?? '—'}%</td>
      <td style="font-weight:700;color:#D97706">${t.gold_fine_grams?.toFixed(3) ?? '—'}g</td>
      <td style="color:${t.type === 'receipt' ? '#22C55E' : '#EF4444'}">${t.type === 'receipt' ? 'Rec' : 'Iss'}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/>
<style>
${CSS}
body { padding: 24px; background:#f8f9fa; }
.report { max-width:720px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
.rpt-header { background:#1A56DB; color:#fff; padding:20px 28px; display:flex; justify-content:space-between; align-items:center; }
.rpt-firm { font-size:20px; font-weight:800; }
.rpt-date { font-size:14px; opacity:0.85; }
.summary { display:flex; gap:16px; padding:20px 28px; background:#F8FAFF; }
.summary-box { flex:1; background:#fff; border-radius:10px; padding:14px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
.sum-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#94A3B8; margin-bottom:4px; }
.sum-val { font-size:18px; font-weight:800; }
.section { padding:0 28px 20px; }
.section-title { font-size:14px; font-weight:700; color:#1E2A3A; padding:16px 0 8px; border-bottom:2px solid #F1F5F9; display:flex; align-items:center; gap:8px; }
.section-accent { width:4px; height:16px; background:#1A56DB; border-radius:2px; }
.gold-accent { background:#D97706; }
table { width:100%; border-collapse:collapse; font-size:12px; }
th { background:#F1F5F9; color:#94A3B8; font-size:10px; padding:7px 8px; text-align:left; font-weight:700; }
td { padding:8px 8px; border-bottom:1px solid #F8FAFF; color:#1E2A3A; }
.footer { background:#F8FAFF; padding:12px 28px; text-align:center; font-size:11px; color:#94A3B8; border-top:1px solid #E2E8F0; }
</style>
</head>
<body>
<div class="report">
  <div class="rpt-header">
    <div class="rpt-firm">${esc(firmName)}</div>
    <div class="rpt-date">Daily Report — ${fmtDate(date)}</div>
  </div>

  <div class="summary">
    <div class="summary-box">
      <div class="sum-label">Cash In</div>
      <div class="sum-val" style="color:#22C55E">${formatINRRaw(totals.cash_receipt)}</div>
    </div>
    <div class="summary-box">
      <div class="sum-label">Cash Out</div>
      <div class="sum-val" style="color:#EF4444">${formatINRRaw(totals.cash_issue)}</div>
    </div>
    <div class="summary-box">
      <div class="sum-label">Net Cash</div>
      <div class="sum-val" style="color:${totals.cash_receipt - totals.cash_issue >= 0 ? '#1A56DB' : '#EF4444'}">${formatINRRaw(Math.abs(totals.cash_receipt - totals.cash_issue))}</div>
    </div>
    ${goldTxs.length > 0 ? `
    <div class="summary-box">
      <div class="sum-label">Gold Net</div>
      <div class="sum-val" style="color:#D97706">${(totals.gold_receipt_fine - totals.gold_issue_fine).toFixed(3)}g</div>
    </div>` : ''}
  </div>

  <div class="section">
    <div class="section-title"><div class="section-accent"></div>Cash & Online Transactions</div>
    ${cashTxs.length === 0 ? '<p style="font-size:13px;color:#A0AEC0;padding:12px 0">No cash/online transactions.</p>' : `
    <table>
      <tr><th>Date</th><th>Party</th><th>Mode</th><th>Type</th><th style="text-align:right">Amount</th></tr>
      ${cashRows}
    </table>`}
  </div>

  ${goldTxs.length > 0 ? `
  <div class="section">
    <div class="section-title"><div class="section-accent gold-accent"></div>Gold Transactions</div>
    <table>
      <tr><th>Date</th><th>Party</th><th>Weight</th><th>Purity</th><th>Fine</th><th>Type</th></tr>
      ${goldRows}
    </table>
  </div>` : ''}

  <div class="footer">Generated by TOLA · ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
</div>
</body>
</html>`;
}

// ── PARTY REPORT ──────────────────────────────────────────────────────────────

export function buildPartyReportHtml(
  partyName: string,
  receipts: Transaction[],
  issues: Transaction[],
  totals: { receipt: number; issue: number; fineReceipt: number; fineIssue: number },
  firmName: string
): string {
  const net = totals.receipt - totals.issue;
  const maxRows = Math.max(receipts.length, issues.length);

  function cell(tx?: Transaction): string {
    if (!tx) return '<td></td><td></td><td></td><td></td>';
    return `<td>${fmtDateShort(tx.date)}</td>
      <td>${tx.payment_mode === 'gold' ? 'Gold' : tx.payment_mode}</td>
      <td>${tx.payment_mode === 'gold' ? (tx.gold_fine_grams?.toFixed(2) ?? '—') : '—'}</td>
      <td style="text-align:right;font-weight:700">${tx.amount >= 1000 ? `₹${(tx.amount / 1000).toFixed(1)}K` : `₹${tx.amount.toFixed(0)}`}</td>`;
  }

  const rows = Array.from({ length: maxRows }).map((_, i) => `
    <tr style="background:${i % 2 === 0 ? '#F8FAFF' : '#fff'}">
      ${cell(receipts[i])}
      <td style="background:#E2E8F0;width:1px;padding:0"></td>
      ${cell(issues[i])}
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/>
<style>
${CSS}
body { padding: 24px; background:#f8f9fa; }
.report { max-width:760px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
.rpt-header { background:#1A56DB; color:#fff; padding:20px 28px; display:flex; justify-content:space-between; align-items:center; }
.rpt-firm { font-size:18px; font-weight:800; }
.rpt-party { font-size:14px; opacity:0.85; }
.net-bar { padding:14px 28px; display:flex; justify-content:space-between; align-items:center; background:${net >= 0 ? '#DCFCE7' : '#FEE2E2'}; }
.net-label { font-size:11px; color:#4A5568; font-weight:600; }
.net-value { font-size:22px; font-weight:800; color:${net >= 0 ? '#22C55E' : '#EF4444'}; }
.net-sub { font-size:13px; color:#4A5568; }
.col-headers { display:flex; }
.col-hdr { flex:1; padding:8px 12px; font-size:12px; font-weight:800; text-align:center; }
table { width:100%; border-collapse:collapse; font-size:12px; }
th { padding:6px 8px; text-align:left; font-size:10px; font-weight:700; color:#94A3B8; background:#F8FAFF; }
td { padding:7px 8px; }
.totals-row { background:#F1F5F9; font-weight:700; }
.footer { background:#F8FAFF; padding:12px 28px; text-align:center; font-size:11px; color:#94A3B8; border-top:1px solid #E2E8F0; }
</style>
</head>
<body>
<div class="report">
  <div class="rpt-header">
    <div class="rpt-firm">${esc(firmName)}</div>
    <div class="rpt-party">Party Ledger — ${esc(partyName)}</div>
  </div>

  <div class="net-bar">
    <div>
      <div class="net-label">NET OUTSTANDING</div>
      <div class="net-value">${net >= 0 ? '↓ ' : '↑ '}${formatINRRaw(Math.abs(net))}</div>
    </div>
    <div class="net-sub">
      Receipt: <strong style="color:#22C55E">${formatINRRaw(totals.receipt)}</strong>
      &nbsp;&nbsp;Issue: <strong style="color:#EF4444">${formatINRRaw(totals.issue)}</strong>
    </div>
  </div>

  <div class="col-headers">
    <div class="col-hdr" style="background:#DCFCE7;color:#16A34A">RECEIPT</div>
    <div class="col-hdr" style="background:#FEE2E2;color:#DC2626">ISSUE</div>
  </div>

  <table>
    <tr>
      <th>Date</th><th>Mode</th><th>Fine</th><th style="text-align:right">Amt</th>
      <th style="width:1px;background:#E2E8F0"></th>
      <th>Date</th><th>Mode</th><th>Fine</th><th style="text-align:right">Amt</th>
    </tr>
    ${rows}
    <tr class="totals-row">
      <td colspan="2">Fine: ${totals.fineReceipt.toFixed(3)}g</td>
      <td colspan="2" style="text-align:right;color:#22C55E">${formatINRRaw(totals.receipt)}</td>
      <td style="background:#E2E8F0"></td>
      <td colspan="2">Fine: ${totals.fineIssue.toFixed(3)}g</td>
      <td colspan="2" style="text-align:right;color:#EF4444">${formatINRRaw(totals.issue)}</td>
    </tr>
  </table>

  <div class="footer">Generated by TOLA · ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
</div>
</body>
</html>`;
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
