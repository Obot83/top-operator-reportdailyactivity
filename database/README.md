# Setup Database MySQL Lokal

## Prasyarat
- MySQL 8.0+ terinstall di lokal
- Node.js 18+ dan npm/pnpm

---

## Cara 1 — Langsung pakai SQL (paling cepat)

```bash
# Login ke MySQL
mysql -u root -p

# Atau satu baris langsung eksekusi file
mysql -u root -p < database/init.sql
```

Selesai. Database `top_operator` sudah siap dengan tabel dan data contoh.

---

## Cara 2 — Pakai Prisma Migrate (untuk development)

### 1. Buat user MySQL khusus (opsional, direkomendasikan)

```sql
CREATE USER 'top_user'@'localhost' IDENTIFIED BY 'StrongPass123!';
GRANT ALL PRIVILEGES ON top_operator.* TO 'top_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Konfigurasi .env

```bash
cp .env.example .env
# Edit DATABASE_URL di .env:
# DATABASE_URL="mysql://root:password@localhost:3306/top_operator"
```

### 3. Install dependencies dan jalankan migrate

```bash
cd apps/backoffice
npm install

# Generate Prisma client
npx prisma generate

# Buat dan jalankan migration
npx prisma migrate dev --name init

# (Opsional) Seed data awal
npx prisma db seed
```

### 4. Cek hasil di Prisma Studio

```bash
npx prisma studio
# Buka http://localhost:5555
```

---

## Cara 3 — Docker (jika tidak ingin install MySQL)

```bash
# Buat file docker-compose.yml di root project
docker run --name top-mysql \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=top_operator \
  -p 3306:3306 \
  -d mysql:8.0

# Tunggu ~10 detik lalu import SQL
docker exec -i top-mysql mysql -uroot -ppassword top_operator < database/init.sql
```

---

## Struktur Database

| Tabel                | Keterangan                                  |
|----------------------|---------------------------------------------|
| `branches`           | Data cabang                                 |
| `users`              | User (Admin, AO, Collector, Branch Manager) |
| `debiturs`           | Profil nasabah (CIF, NIK, alamat)           |
| `loan_accounts`      | Rekening kredit (plafon, baki debet, DPD)   |
| `angsuran_ledgers`   | Ledger pembayaran angsuran                  |
| `ao_activities`      | Log aktivitas harian AO                     |
| `collection_tasks`   | Daftar Tagihan Harian (DTH) per kolektor    |
| `debitur_visit_logs` | Rekam jejak kunjungan lapangan              |
| `ptp_trackings`      | Janji bayar (Promise to Pay)                |
| `surat_peringatans`  | Surat Peringatan SP1/SP2/SP3                |

---

## Login Default (Data Seed)

| Email                      | Password   | Role      |
|----------------------------|------------|-----------|
| admin@topoperator.id       | Admin@123  | ADMIN     |
| budi.ao@topoperator.id     | Admin@123  | AO        |
| siti.col@topoperator.id    | Admin@123  | COLLECTOR |

> **Ganti password segera setelah login pertama!**

---

## Perbedaan dari Versi PostgreSQL

| Fitur              | PostgreSQL              | MySQL (ini)                      |
|--------------------|-------------------------|----------------------------------|
| Array field        | `String[]` native       | `TEXT` + JSON string manual      |
| `photoUrls`        | `photoUrls String[]`    | `photo_urls_json TEXT` (JSON)    |
| UUID               | `uuid` type             | `VARCHAR(30)` + cuid()           |
| Case sensitivity   | Case sensitive default  | Case insensitive default         |
| Full-text search   | tsvector                | `FULLTEXT INDEX` (jika diperlukan)|
