-- ============================================================
-- TOP Operator - MySQL 8.0+ Setup Script
-- Jalankan: mysql -u root -p < init.sql
-- atau copy-paste ke MySQL Workbench / DBeaver / phpMyAdmin
-- ============================================================

CREATE DATABASE IF NOT EXISTS top_operator
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE top_operator;

-- ─────────────────────────────────────────────────────────────
-- 1. BRANCHES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id         VARCHAR(30)   NOT NULL,
  code       VARCHAR(10)   NOT NULL,
  nama       VARCHAR(100)  NOT NULL,
  alamat     TEXT,
  created_at DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_branches_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 2. USERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(30)   NOT NULL,
  branch_id  VARCHAR(30)   NOT NULL,
  nama       VARCHAR(100)  NOT NULL,
  email      VARCHAR(150)  NOT NULL,
  password   VARCHAR(255)  NOT NULL,
  role       ENUM('ADMIN','BRANCH_MANAGER','AO','COLLECTOR') NOT NULL DEFAULT 'COLLECTOR',
  is_active  TINYINT(1)    NOT NULL DEFAULT 1,
  created_at DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_branch (branch_id),
  CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 3. DEBITURS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debiturs (
  id                VARCHAR(30)  NOT NULL,
  cif               VARCHAR(30)  NOT NULL COMMENT 'Format: PU-KOTA-KEC/YY-MM/XXXXXX',
  nama              VARCHAR(150) NOT NULL,
  nik               VARCHAR(16)  NOT NULL,
  nomor_hp          VARCHAR(20),
  alamat_domisili   TEXT         NOT NULL,
  alamat_usaha      TEXT,
  default_latitude  DOUBLE,
  default_longitude DOUBLE,
  created_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_debiturs_cif (cif),
  UNIQUE KEY uq_debiturs_nik (nik),
  KEY idx_debiturs_cif (cif),
  KEY idx_debiturs_nik (nik)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 4. LOAN_ACCOUNTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_accounts (
  id                  VARCHAR(30)   NOT NULL,
  account_number      VARCHAR(25)   NOT NULL COMMENT 'Format: YYYYMMDD/KODECABANG/XXXX',
  debitur_id          VARCHAR(30)   NOT NULL,
  branch_id           VARCHAR(30)   NOT NULL,
  produk              VARCHAR(50)   NOT NULL DEFAULT 'LancarKu',
  plafon              DECIMAL(15,2) NOT NULL,
  baki_debet_pokok    DECIMAL(15,2) NOT NULL,
  saldo_titipan       DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  bunga_per_tahun     DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  tenor_minggu        INT           NOT NULL,
  tanggal_akad        DATE          NOT NULL,
  tanggal_jatuh_tempo DATE,
  dpd                 INT           NOT NULL DEFAULT 0,
  kolektibilitas      ENUM('LANCAR','DPK','KURANG_LANCAR','DIRAGUKAN','MACET') NOT NULL DEFAULT 'LANCAR',
  autodebit_enabled   TINYINT(1)    NOT NULL DEFAULT 0,
  is_write_off        TINYINT(1)    NOT NULL DEFAULT 0,
  is_active           TINYINT(1)    NOT NULL DEFAULT 1,
  created_at          DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_loan_account_number (account_number),
  KEY idx_loan_debitur (debitur_id),
  KEY idx_loan_branch (branch_id),
  KEY idx_loan_dpd_kol (dpd, kolektibilitas),
  KEY idx_loan_autodebit (autodebit_enabled, is_active),
  CONSTRAINT fk_loan_debitur FOREIGN KEY (debitur_id) REFERENCES debiturs (id),
  CONSTRAINT fk_loan_branch  FOREIGN KEY (branch_id)  REFERENCES branches (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 5. ANGSURAN_LEDGERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS angsuran_ledgers (
  id              VARCHAR(30)   NOT NULL,
  loan_account_id VARCHAR(30)   NOT NULL,
  tanggal_bayar   DATE          NOT NULL,
  jumlah_bayar    DECIMAL(15,2) NOT NULL,
  bayar_pokok     DECIMAL(15,2) NOT NULL,
  bayar_bunga     DECIMAL(15,2) NOT NULL,
  bayar_denda     DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  sumber_bayar    VARCHAR(20)   NOT NULL DEFAULT 'TUNAI' COMMENT 'TUNAI | TITIPAN | TRANSFER',
  keterangan      VARCHAR(255),
  created_at      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_ledger_account_tgl (loan_account_id, tanggal_bayar),
  CONSTRAINT fk_ledger_loan FOREIGN KEY (loan_account_id) REFERENCES loan_accounts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 6. AO_ACTIVITIES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ao_activities (
  id            VARCHAR(30)   NOT NULL,
  ao_id         VARCHAR(30)   NOT NULL,
  branch_id     VARCHAR(30)   NOT NULL,
  debitur_id    VARCHAR(30),
  activity_type ENUM('PROSPEK','SURVEY_AGUNAN','VERIFIKASI','BOOKING','REALISASI') NOT NULL,
  tanggal       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  nominal       DECIMAL(15,2),
  titipan_muka  DECIMAL(15,2),
  keterangan    TEXT,
  created_at    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_ao_user_tgl    (ao_id, tanggal),
  KEY idx_ao_branch_tgl  (branch_id, tanggal, activity_type),
  CONSTRAINT fk_ao_user   FOREIGN KEY (ao_id)     REFERENCES users (id),
  CONSTRAINT fk_ao_branch FOREIGN KEY (branch_id) REFERENCES branches (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 7. COLLECTION_TASKS (DTH)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collection_tasks (
  id               VARCHAR(30)   NOT NULL,
  loan_account_id  VARCHAR(30)   NOT NULL,
  collector_id     VARCHAR(30)   NOT NULL,
  periode_tagih    VARCHAR(10)   NOT NULL COMMENT 'ISO week: 2025-W01',
  tagihan_pokok    DECIMAL(15,2) NOT NULL,
  tagihan_bunga    DECIMAL(15,2) NOT NULL,
  tagihan_denda    DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  tagihan_titipan  DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  status_bayar     ENUM('BELUM_DIKUNJUNGI','SUDAH_DIKUNJUNGI','JANJI_BAYAR','SUDAH_BAYAR') NOT NULL DEFAULT 'BELUM_DIKUNJUNGI',
  created_at       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_task_account_periode (loan_account_id, periode_tagih),
  KEY idx_task_collector_periode (collector_id, periode_tagih),
  KEY idx_task_status (status_bayar),
  CONSTRAINT fk_task_loan      FOREIGN KEY (loan_account_id) REFERENCES loan_accounts (id),
  CONSTRAINT fk_task_collector FOREIGN KEY (collector_id)    REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 8. DEBITUR_VISIT_LOGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debitur_visit_logs (
  id               VARCHAR(30)  NOT NULL,
  loan_account_id  VARCHAR(30)  NOT NULL,
  collector_id     VARCHAR(30)  NOT NULL,
  visited_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  latitude         DOUBLE,
  longitude        DOUBLE,
  visit_status     ENUM('MET_DEBTOR','VACANT','REFUSED','PARTIAL_MET','PHONE_ONLY','OTHER') NOT NULL,
  alasan_kategori  VARCHAR(100),
  alasan_detail    TEXT,
  catatan_lapangan TEXT,
  -- Foto disimpan sebagai JSON array: ["https://...","https://..."]
  photo_urls_json  TEXT         COMMENT 'JSON array URL foto bukti kunjungan',
  created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_visit_account_tgl   (loan_account_id, visited_at),
  KEY idx_visit_collector_tgl (collector_id, visited_at),
  CONSTRAINT fk_visit_loan      FOREIGN KEY (loan_account_id) REFERENCES loan_accounts (id),
  CONSTRAINT fk_visit_collector FOREIGN KEY (collector_id)    REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 9. PTP_TRACKINGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ptp_trackings (
  id                VARCHAR(30)   NOT NULL,
  loan_account_id   VARCHAR(30)   NOT NULL,
  created_by_id     VARCHAR(30)   NOT NULL,
  target_tanggal    DATE          NOT NULL,
  nominal_komitmen  DECIMAL(15,2) NOT NULL,
  nominal_realisasi DECIMAL(15,2),
  status            ENUM('PENDING','HONORED','BROKEN') NOT NULL DEFAULT 'PENDING',
  keterangan        TEXT,
  created_at        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_ptp_account_status (loan_account_id, status),
  KEY idx_ptp_status_tgl     (status, target_tanggal),
  CONSTRAINT fk_ptp_loan    FOREIGN KEY (loan_account_id) REFERENCES loan_accounts (id),
  CONSTRAINT fk_ptp_creator FOREIGN KEY (created_by_id)   REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 10. SURAT_PERINGATANS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS surat_peringatans (
  id               VARCHAR(30)  NOT NULL,
  nomor_sp         VARCHAR(30)  NOT NULL COMMENT 'Format: SP1/YY/MM/BRANCH/XXXX',
  loan_account_id  VARCHAR(30)  NOT NULL,
  branch_id        VARCHAR(30)  NOT NULL,
  issued_by_id     VARCHAR(30)  NOT NULL,
  level            ENUM('SP1','SP2','SP3') NOT NULL,
  tanggal_terbit   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  keterangan       TEXT,
  created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_sp_nomor (nomor_sp),
  KEY idx_sp_account         (loan_account_id),
  KEY idx_sp_branch_tgl      (branch_id, tanggal_terbit),
  CONSTRAINT fk_sp_loan    FOREIGN KEY (loan_account_id) REFERENCES loan_accounts (id),
  CONSTRAINT fk_sp_branch  FOREIGN KEY (branch_id)       REFERENCES branches (id),
  CONSTRAINT fk_sp_issuer  FOREIGN KEY (issued_by_id)    REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED DATA (opsional — hapus jika tidak diperlukan)
-- ============================================================

-- Cabang contoh
INSERT IGNORE INTO branches (id, code, nama, alamat) VALUES
  ('branch_001', 'JKT01', 'Cabang Jakarta Pusat', 'Jl. Sudirman No. 1, Jakarta Pusat'),
  ('branch_002', 'BDG01', 'Cabang Bandung',        'Jl. Asia Afrika No. 8, Bandung');

-- User admin default (password: Admin@123 — ganti setelah login pertama)
-- Hash bcrypt untuk "Admin@123"
INSERT IGNORE INTO users (id, branch_id, nama, email, password, role) VALUES
  ('user_admin_001', 'branch_001', 'Administrator', 'admin@topoperator.id',
   '$2b$10$KIp3H2J8vL9MnQwXy4ZeOeNpT5sRuV7aGcFdBhWjEkYlAmSoQxDiU', 'ADMIN'),
  ('user_ao_001', 'branch_001', 'Budi Santoso (AO)', 'budi.ao@topoperator.id',
   '$2b$10$KIp3H2J8vL9MnQwXy4ZeOeNpT5sRuV7aGcFdBhWjEkYlAmSoQxDiU', 'AO'),
  ('user_col_001', 'branch_001', 'Siti Rahayu (Collector)', 'siti.col@topoperator.id',
   '$2b$10$KIp3H2J8vL9MnQwXy4ZeOeNpT5sRuV7aGcFdBhWjEkYlAmSoQxDiU', 'COLLECTOR');

-- Debitur contoh
INSERT IGNORE INTO debiturs (id, cif, nama, nik, nomor_hp, alamat_domisili, alamat_usaha) VALUES
  ('deb_001', 'PU-JKT-PST/25-10/000001', 'Ahmad Fauzi',      '3171012345670001',
   '081234567890', 'Jl. Kenanga No. 5, Jakarta Pusat', 'Pasar Senen Blok III Los A No. 12'),
  ('deb_002', 'PU-JKT-PST/25-10/000002', 'Dewi Lestari',     '3171012345670002',
   '082345678901', 'Jl. Mawar No. 3, Menteng',          'Toko Sembako Jl. Budi No. 7'),
  ('deb_003', 'PU-JKT-PST/25-10/000003', 'Hendra Kurniawan', '3171012345670003',
   '083456789012', 'Jl. Melati No. 12, Cempaka Putih',  'Workshop Las Jl. Industri No. 22');

-- Rekening kredit contoh
INSERT IGNORE INTO loan_accounts
  (id, account_number, debitur_id, branch_id, produk, plafon, baki_debet_pokok,
   saldo_titipan, bunga_per_tahun, tenor_minggu, tanggal_akad, dpd, kolektibilitas)
VALUES
  ('loan_001', '20250115/JKT01/0001', 'deb_001', 'branch_001',
   'LancarKu', 5000000.00, 3500000.00, 200000.00, 24.00, 24, '2025-01-15', 0,  'LANCAR'),
  ('loan_002', '20250201/JKT01/0002', 'deb_002', 'branch_001',
   'LancarKu', 3000000.00, 2800000.00,      0.00, 24.00, 20, '2025-02-01', 14, 'DPK'),
  ('loan_003', '20241201/JKT01/0003', 'deb_003', 'branch_001',
   'LancarKu', 7500000.00, 7000000.00,      0.00, 24.00, 36, '2024-12-01', 45, 'KURANG_LANCAR');

-- ============================================================
-- VERIFIKASI — jalankan setelah insert untuk memastikan sukses
-- ============================================================
-- SELECT table_name, table_rows
--   FROM information_schema.tables
--  WHERE table_schema = 'top_operator'
--  ORDER BY table_name;
