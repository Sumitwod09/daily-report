export type PaymentMode    = 'cash' | 'online' | 'gold';
export type OnlineSubtype  = 'upi' | 'netbanking' | 'card';
export type GoldType       = 'pure' | 'ornament';
export type TransactionType = 'receipt' | 'issue';
export type KarigarStatus  = 'open' | 'closed';

export interface Transaction {
  id: string;
  firm_id: string;
  party_id: string;
  party_name?: string;
  date: string;
  type: TransactionType;
  payment_mode: PaymentMode;
  online_subtype?: OnlineSubtype;
  gold_type?: GoldType;
  gold_purity?: number;
  gold_weight_grams?: number;
  gold_wastage_percent?: number;
  gold_fine_grams?: number;
  gold_price_per_gram?: number;
  gold_total_value?: number;
  amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Party {
  id: string;
  firm_id: string;
  name: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Firm {
  id: string;
  name: string;
  gstin?: string;
  address?: string;
  city?: string;
  phone?: string;
  currency: string;
  created_at: string;
}

export interface KarigarJob {
  id: string;
  firm_id: string;
  karigar_party_id: string;
  karigar_name?: string;
  gold_given_weight: number;
  gold_given_purity: number;
  gold_given_fine: number;
  gold_returned_weight?: number;
  gold_returned_fine?: number;
  wastage_grams?: number;
  status: KarigarStatus;
  opened_at: string;
  closed_at?: string;
  notes?: string;
}

export interface ReportRow {
  date: string;
  party: string;
  mode: string;
  calc: string;
  amount: string;
}

export interface ReportTotals {
  receiptAmount: number;
  issueAmount: number;
  netAmount: number;
  receiptFine: number;
  issueFine: number;
  netFine: number;
}

export interface DashboardTotals {
  total_receipt: number;
  total_issue: number;
  fine_receipt: number;
  fine_issue: number;
}

export interface CalendarDot {
  date: string;
  receipt_count: number;
  issue_count: number;
}

export interface StockRow {
  gold_purity: number;
  stock_in: number;
  stock_out: number;
}
