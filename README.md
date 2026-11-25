# ITNSA Live Scoring & Marking System

Aplikasi sistem penilaian otomatis dan live scoring untuk lomba / ujian IT Network Systems Administration (ITNSA / LKS / WorldSkills).

Dibangun menggunakan **SvelteKit 2**, **Svelte 5 Runes**, **Tailwind CSS v4**, dan **SQLite** (`node:sqlite` bawaan tanpa dependensi pihak ketiga).

---

## 🎯 Fitur Utama

1. **Sistem Login & Proteksi Administrator**
   - **Wizard Setup Pertama Kali (`/setup`)**: Saat pertama kali install (database belum ada user), web otomatis mengarahkan ke halaman buat akun administrator pertama.
   - **Proteksi Akses Penuh**:
     - Pengunjung umum, juri tamu, dan peserta dapat melihat **Katalog Simulasi (`/`)**, **Live Scoreboard (`/scoreboard`)**, **Lembar Penilaian (`/sheet`)**, dan **Dokumentasi API (`/script-docs`)**.
     - Hanya **Administrator** yang dapat masuk ke **Kelola Modul (`/simulations`)**, menambah/menghapus modul, membuat rubrik, dan mengatur jadwal/timer simulasi.
     - Endpoint penilaian otomatis (`POST /api/mark`) tetap terbuka untuk ditembak script marking peserta.
   - Keamanan hashing password menggunakan native `scrypt` dan `timingSafeEqual`.

2. **Format Lembar Penilaian Standar ITNSA**
   - Header modul dan judul (`MODUL 2 · BOBOT 70%`, `Client-Server Environment`).
   - Skor besar di pojok kanan atas (`28,00 / 70`).
   - Baris rangkuman otomatis aspek sesuai, aspek lengkap, dan aspek belum ada nilai.
   - Tampilan grid 2 kolom seksi A s.d. L dengan pill status Lengkap (hijau), Belum ada (merah), dan skor perolehan.
   - Ikon status (✓ / ✗ / ?).
   - Klik pada baris aspek untuk membuka bukti output log command script marking peserta.
   - Kolom tanda tangan Juri 1 dan Juri 2 siap cetak/ekspor PDF (`@media print`).

3. **Penjadwalan Simulasi & Timer Dua Mode**
   - Timer hanya tersedia di mode simulasi peserta. Administrator tidak memiliki halaman atau panel kontrol timer.
   - Administrator mengatur **mode timer** dan durasi di pengaturan simulasi:
     - **Fleksibel**: peserta memulai, menjeda, dan melanjutkan timer sendiri dari halaman Timer.
     - **Diatur Panitia**: peserta hanya melihat countdown (read-only). Panitia menekan **Mulai Sesi** di pengaturan simulasi untuk menjalankan timer seluruh peserta, dan **Jeda Sesi** untuk menghentikannya sementara.
   - **Timer Peserta Dihitung Otomatis**: Saat script peserta pertama kali menembak `POST /api/mark`, server mencatat `first_submitted_at` dan menghitung tenggat waktu. Tembakan berikutnya memperbarui nilai sekaligus menghitung sisa waktu pengerjaan.
   - Pada mode fleksibel, timer peserta harus sudah dimulai sebelum `POST /api/mark` diterima. Pada mode panitia, endpoint hanya menerima pengiriman saat sesi aktif.

4. **Identifikasi Peserta via Environment Variable (`PARTICIPANT_ID`)**
   - Peserta hanya perlu mengatur variabel lingkungan di VM / runner mereka:
     ```bash
     export PARTICIPANT_ID="peserta-01"
     ./scripts/marking_sample.sh
     ```

---

## 🚀 Menjalankan Aplikasi

```bash
# Jalankan development server
bun run dev
# atau: npm run dev

# Buka di browser: http://localhost:5173
```

Saat pertama kali dibuka, web akan otomatis mengarahkan Anda ke halaman **`/setup`** untuk membuat Username dan Password Administrator pertama Anda. Setelah selesai dibuat, halaman setup akan terkunci dan sistem beralih ke login standar di **`/login`**.

### Docker

```bash
cp .env.example .env
docker compose up -d --build
```

Akses `http://localhost:3000`. Database disimpan di volume Docker `itnsa-data` dan dibuat otomatis saat pertama kali dijalankan.

Panduan deployment lengkap (VPS, GHCR, CI/CD, backup, dan reset database) ada di [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## 📡 Endpoint Penilaian Otomatis (`POST /api/mark`)

Contoh pengiriman dari script Bash:
```bash
export PARTICIPANT_ID="peserta-01"
./scripts/marking_sample.sh
```

Contoh pengiriman dari script Python:
```bash
export PARTICIPANT_ID="peserta-02"
python3 scripts/marking_sample.py
```
