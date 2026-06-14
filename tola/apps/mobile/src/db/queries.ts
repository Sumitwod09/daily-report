// ── FIRM ─────────────────────────────────────────────────────────────────────

export const FirmQ = {
  insert: `
    INSERT INTO firms (id, name, gstin, address, city, phone, currency, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'INR', ?)
  `,
  get: `SELECT * FROM firms LIMIT 1`,
  update: `
    UPDATE firms SET name=?, gstin=?, address=?, city=?, phone=?
    WHERE id=?
  `,
};

// ── PARTIES ───────────────────────────────────────────────────────────────────

export const PartyQ = {
  insert: `
    INSERT INTO parties (id, firm_id, name, phone, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  getAll: `
    SELECT * FROM parties
    WHERE firm_id=? AND deleted_at IS NULL
    ORDER BY name ASC
  `,
  search: `
    SELECT * FROM parties
    WHERE firm_id=? AND deleted_at IS NULL
      AND name LIKE ?
    ORDER BY name ASC
  `,
  softDelete: `
    UPDATE parties SET deleted_at=?, updated_at=? WHERE id=?
  `,
  rename: `
    UPDATE parties SET name=?, updated_at=? WHERE id=?
  `,
};

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────

export const TxQ = {
  insert: `
    INSERT INTO transactions (
      id, firm_id, party_id, date, type, payment_mode,
      online_subtype, gold_type, gold_purity, gold_weight_grams,
      gold_wastage_percent, gold_fine_grams, gold_price_per_gram,
      gold_total_value, amount, notes, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `,

  update: `
    UPDATE transactions SET
      party_id=?, date=?, type=?, payment_mode=?,
      online_subtype=?, gold_type=?, gold_purity=?,
      gold_weight_grams=?, gold_wastage_percent=?,
      gold_fine_grams=?, gold_price_per_gram=?,
      gold_total_value=?, amount=?, notes=?, updated_at=?
    WHERE id=?
  `,

  softDelete: `
    UPDATE transactions
    SET deleted_at=?, updated_at=?
    WHERE id=?
  `,

  getAll: `
    SELECT t.*, p.name AS party_name
    FROM transactions t
    JOIN parties p ON p.id = t.party_id
    WHERE t.firm_id=? AND t.deleted_at IS NULL
    ORDER BY t.date DESC, t.created_at DESC
  `,

  getByDate: `
    SELECT t.*, p.name AS party_name
    FROM transactions t
    JOIN parties p ON p.id = t.party_id
    WHERE t.firm_id=? AND t.date=? AND t.deleted_at IS NULL
    ORDER BY t.created_at DESC
  `,

  getByParty: `
    SELECT t.*, p.name AS party_name
    FROM transactions t
    JOIN parties p ON p.id = t.party_id
    WHERE t.firm_id=? AND t.party_id=? AND t.deleted_at IS NULL
    ORDER BY t.date DESC, t.created_at DESC
  `,

  getByPartyAndDateRange: `
    SELECT t.*, p.name AS party_name
    FROM transactions t
    JOIN parties p ON p.id = t.party_id
    WHERE t.firm_id=? AND t.party_id=?
      AND t.date BETWEEN ? AND ?
      AND t.deleted_at IS NULL
    ORDER BY t.date DESC
  `,

  getByDateRange: `
    SELECT t.*, p.name AS party_name
    FROM transactions t
    JOIN parties p ON p.id = t.party_id
    WHERE t.firm_id=?
      AND t.date BETWEEN ? AND ?
      AND t.deleted_at IS NULL
    ORDER BY t.date DESC, t.created_at DESC
  `,

  getDashboardTotals: `
    SELECT
      COALESCE(SUM(CASE WHEN type='receipt' THEN amount ELSE 0 END), 0) AS total_receipt,
      COALESCE(SUM(CASE WHEN type='issue'   THEN amount ELSE 0 END), 0) AS total_issue,
      COALESCE(SUM(CASE WHEN type='receipt' AND payment_mode='gold'
                        THEN gold_fine_grams ELSE 0 END), 0) AS fine_receipt,
      COALESCE(SUM(CASE WHEN type='issue'   AND payment_mode='gold'
                        THEN gold_fine_grams ELSE 0 END), 0) AS fine_issue
    FROM transactions
    WHERE firm_id=? AND deleted_at IS NULL
  `,

  getCalendarDots: `
    SELECT
      date,
      SUM(CASE WHEN type='receipt' THEN 1 ELSE 0 END) AS receipt_count,
      SUM(CASE WHEN type='issue'   THEN 1 ELSE 0 END) AS issue_count
    FROM transactions
    WHERE firm_id=? AND deleted_at IS NULL
      AND date BETWEEN ? AND ?
    GROUP BY date
  `,

  getTodayTotals: `
    SELECT
      COALESCE(SUM(CASE WHEN type='receipt' THEN amount ELSE 0 END), 0) AS receipt,
      COALESCE(SUM(CASE WHEN type='issue'   THEN amount ELSE 0 END), 0) AS issue
    FROM transactions
    WHERE firm_id=? AND date=? AND deleted_at IS NULL
  `,

  getDateTotals: `
    SELECT
      COALESCE(SUM(CASE WHEN type='receipt' AND payment_mode != 'gold' THEN amount ELSE 0 END), 0) AS cash_receipt,
      COALESCE(SUM(CASE WHEN type='issue'   AND payment_mode != 'gold' THEN amount ELSE 0 END), 0) AS cash_issue,
      COALESCE(SUM(CASE WHEN type='receipt' AND payment_mode='gold' THEN gold_fine_grams ELSE 0 END), 0) AS gold_receipt_fine,
      COALESCE(SUM(CASE WHEN type='issue'   AND payment_mode='gold' THEN gold_fine_grams ELSE 0 END), 0) AS gold_issue_fine
    FROM transactions
    WHERE firm_id=? AND date=? AND deleted_at IS NULL
  `,

  getPartyTotals: `
    SELECT
      COALESCE(SUM(CASE WHEN type='receipt' THEN amount ELSE 0 END), 0) AS total_receipt,
      COALESCE(SUM(CASE WHEN type='issue'   THEN amount ELSE 0 END), 0) AS total_issue,
      COALESCE(SUM(CASE WHEN type='receipt' AND payment_mode='gold' THEN gold_fine_grams ELSE 0 END), 0) AS fine_receipt,
      COALESCE(SUM(CASE WHEN type='issue'   AND payment_mode='gold' THEN gold_fine_grams ELSE 0 END), 0) AS fine_issue
    FROM transactions
    WHERE firm_id=? AND party_id=? AND deleted_at IS NULL
  `,

  getPartyTotalsDateRange: `
    SELECT
      COALESCE(SUM(CASE WHEN type='receipt' THEN amount ELSE 0 END), 0) AS total_receipt,
      COALESCE(SUM(CASE WHEN type='issue'   THEN amount ELSE 0 END), 0) AS total_issue,
      COALESCE(SUM(CASE WHEN type='receipt' AND payment_mode='gold' THEN gold_fine_grams ELSE 0 END), 0) AS fine_receipt,
      COALESCE(SUM(CASE WHEN type='issue'   AND payment_mode='gold' THEN gold_fine_grams ELSE 0 END), 0) AS fine_issue
    FROM transactions
    WHERE firm_id=? AND party_id=? AND date BETWEEN ? AND ? AND deleted_at IS NULL
  `,

  getModeTotals: `
    SELECT
      COALESCE(SUM(CASE WHEN payment_mode='cash' THEN amount ELSE 0 END), 0) AS cash_total,
      COALESCE(SUM(CASE WHEN payment_mode='online' THEN amount ELSE 0 END), 0) AS online_total,
      COALESCE(SUM(CASE WHEN payment_mode='gold' THEN gold_fine_grams ELSE 0 END), 0) AS gold_fine_total
    FROM transactions
    WHERE firm_id=? AND deleted_at IS NULL
  `,
};

// ── KARIGAR ───────────────────────────────────────────────────────────────────

export const KarigarQ = {
  insert: `
    INSERT INTO karigar_jobs (
      id, firm_id, karigar_party_id, gold_given_weight,
      gold_given_purity, gold_given_fine, status, opened_at, notes
    ) VALUES (?,?,?,?,?,?,?,?,?)
  `,
  close: `
    UPDATE karigar_jobs
    SET gold_returned_weight=?, gold_returned_fine=?,
        wastage_grams=?, status='closed', closed_at=?
    WHERE id=?
  `,
  getAll: `
    SELECT k.*, p.name AS karigar_name
    FROM karigar_jobs k
    JOIN parties p ON p.id = k.karigar_party_id
    WHERE k.firm_id=?
    ORDER BY k.opened_at DESC
  `,
  getOpen: `
    SELECT k.*, p.name AS karigar_name
    FROM karigar_jobs k
    JOIN parties p ON p.id = k.karigar_party_id
    WHERE k.firm_id=? AND k.status='open'
    ORDER BY k.opened_at DESC
  `,
};

// ── STOCK ─────────────────────────────────────────────────────────────────────

export const StockQ = {
  getByPurity: `
    SELECT
      gold_purity,
      SUM(CASE WHEN type='receipt' THEN gold_fine_grams ELSE 0 END) AS stock_in,
      SUM(CASE WHEN type='issue'   THEN gold_fine_grams ELSE 0 END) AS stock_out
    FROM transactions
    WHERE firm_id=? AND payment_mode='gold' AND deleted_at IS NULL
    GROUP BY gold_purity
    ORDER BY gold_purity DESC
  `,
};
