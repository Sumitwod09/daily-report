export const CREATE_TABLES = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS firms (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    gstin       TEXT,
    address     TEXT,
    city        TEXT,
    phone       TEXT,
    currency    TEXT NOT NULL DEFAULT 'INR',
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS parties (
    id          TEXT PRIMARY KEY,
    firm_id     TEXT NOT NULL REFERENCES firms(id),
    name        TEXT NOT NULL,
    phone       TEXT,
    address     TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id                    TEXT PRIMARY KEY,
    firm_id               TEXT NOT NULL REFERENCES firms(id),
    party_id              TEXT NOT NULL REFERENCES parties(id),
    date                  TEXT NOT NULL,
    type                  TEXT NOT NULL CHECK(type IN ('receipt','issue')),
    payment_mode          TEXT NOT NULL CHECK(payment_mode IN ('cash','online','gold')),
    online_subtype        TEXT CHECK(online_subtype IN ('upi','netbanking','card')),
    gold_type             TEXT CHECK(gold_type IN ('pure','ornament')),
    gold_purity           REAL,
    gold_weight_grams     REAL,
    gold_wastage_percent  REAL DEFAULT 0,
    gold_fine_grams       REAL,
    gold_price_per_gram   REAL,
    gold_total_value      REAL,
    amount                REAL NOT NULL DEFAULT 0,
    notes                 TEXT,
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL,
    deleted_at            TEXT
  );

  CREATE TABLE IF NOT EXISTS karigar_jobs (
    id                    TEXT PRIMARY KEY,
    firm_id               TEXT NOT NULL REFERENCES firms(id),
    karigar_party_id      TEXT NOT NULL REFERENCES parties(id),
    gold_given_weight     REAL NOT NULL,
    gold_given_purity     REAL NOT NULL,
    gold_given_fine       REAL NOT NULL,
    gold_returned_weight  REAL,
    gold_returned_fine    REAL,
    wastage_grams         REAL,
    status                TEXT NOT NULL DEFAULT 'open'
                            CHECK(status IN ('open','closed')),
    opened_at             TEXT NOT NULL,
    closed_at             TEXT,
    notes                 TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key         TEXT NOT NULL,
    firm_id     TEXT NOT NULL REFERENCES firms(id),
    value       TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    PRIMARY KEY (key, firm_id)
  );

  CREATE INDEX IF NOT EXISTS idx_tx_firm_date
    ON transactions(firm_id, date);

  CREATE INDEX IF NOT EXISTS idx_tx_firm_party
    ON transactions(firm_id, party_id);

  CREATE INDEX IF NOT EXISTS idx_tx_active
    ON transactions(firm_id, deleted_at)
    WHERE deleted_at IS NULL;

  CREATE INDEX IF NOT EXISTS idx_tx_gold
    ON transactions(firm_id, payment_mode)
    WHERE payment_mode = 'gold';

  CREATE INDEX IF NOT EXISTS idx_parties_firm
    ON parties(firm_id)
    WHERE deleted_at IS NULL;
`;
