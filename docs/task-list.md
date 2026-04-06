# Task List Proyek

Tugas di bawah ini dirancang dengan prinsip **Layered Architecture** dan praktik terbaik pengembangan Node.js. Berikut adalah daftar tugas berurutan beserta _Acceptance Criteria_ (AC) atau kriteria penyelesaiannya:

### SPRINT 1: Perencanaan, Desain, & Fondasi Proyek

**Fokus Utama:** Mendefinisikan batasan sistem dan aturan bisnis yang tidak tertulis, serta menyiapkan kerangka kode dasar.

**✅ Task 1: Mendokumentasikan Aturan Bisnis & Asumsi (Business Rules Document)**

- **Deskripsi:** Buat satu dokumen (misal: `ARCHITECTURE.md` atau `README.md`) yang menjabarkan logika kehadiran (kapan dihitung _late_, _on-time_, apakah ada toleransi waktu, dan bagaimana penanganan absen yang lupa _check-out_). Jabarkan juga strategi _idempotency_ untuk mencegah duplikasi absensi.
- **Acceptance Criteria (AC):**
  - Dokumen memuat aturan eksplisit mengenai logika _check-in/check-out_.
  - Dokumen memuat logika penentuan absen (hari kerja vs libur, persetujuan cuti).
  - Dokumen memuat penjelasan strategi _idempotency_ (misalnya menggunakan _unique constraints_ pada database atau validasi di _Service Layer_).

**✅ Task 2: Merancang Skema Database & Strategi Indexing MongoDB**

- **Deskripsi:** Rancang skema MongoDB (menggunakan Mongoose) untuk Karyawan, Kehadiran, dan Cuti. Definisikan field wajib. Rancang _Index_ pada _field_ yang sering dikueri (seperti ID Karyawan, tanggal absensi, status _approval_) untuk menghindari _full collection scan_.
- **Acceptance Criteria (AC):**
  - Terdapat diagram skema atau file definisi model awal.
  - Daftar _index_ database terdokumentasi dan terjustifikasi (misal: _compound index_ untuk `employeeId` dan `date`).

**✅ Task 3: Inisialisasi Proyek (Layered Architecture Scaffold)**

- **Deskripsi:** Buat repositori (_monorepo_ atau _multi-repo_) untuk ketiga layanan (Company A Service, Company B Service, Attendance Service). Terapkan **Layered Architecture** dengan memisahkan kode ke dalam _Routes_ (rute), _Controllers_ (orkestrasi tipis), _Services_ (logika bisnis), dan _Repositories/Operations_ (akses database).
- **Acceptance Criteria (AC):**
  - Tiga _service_ Express.js independen berhasil dijalankan (_runnable_) di _port_ yang berbeda.
  - Terdapat fail `.env.example` untuk manajemen konfigurasi tanpa mem-_hardcode_ kredensial.
  - _Controllers_ hanya menerima _request_ dan memanggil _Service_ (tetap tipis/ _thin controllers_).

### SPRINT 2: Core Services & Manajemen Akses

**Fokus Utama:** Membangun _source of truth_ data karyawan yang terisolasi dan sistem keamanan dasar.

**✅ Task 4: Implementasi Autentikasi & Role-Based Access Control (RBAC)**

- **Deskripsi:** Implementasikan middleware autentikasi, sangat direkomendasikan menggunakan JWT untuk arsitektur terdistribusi/mikroservis. Buat pemisahan _role_ (Karyawan, Approver/Admin, dan Service-to-Service).
- **Acceptance Criteria (AC):**
  - _Endpoint_ yang dilindungi mengembalikan error `401 Unauthorized` jika token tidak ada/salah.
  - Aksi spesifik (seperti menyetujui cuti) mengembalikan error `403 Forbidden` jika diakses oleh _role_ karyawan biasa.

**✅ Task 5: Implementasi CRUD Company A & Company B Service**

- **Deskripsi:** Buat API untuk operasi Create, Update, Retrieve, List, dan Deactivate data karyawan di masing-masing layanan. Terapkan isolasi ketat di mana data Perusahaan A tidak bisa diakses dari rute Perusahaan B.
- **Acceptance Criteria (AC):**
  - Semua 5 endpoint CRUD karyawan berfungsi untuk Company A dan Company B.
  - Payload masukan divalidasi dengan baik dan _error response_ terstruktur.
  - Pengecekan keamanan (_Insecure Direct Object Reference_ / IDOR) diterapkan.

### SPRINT 3: Attendance Service & Komunikasi Lintas-Layanan

**Fokus Utama:** Membangun logika kehadiran dan memvalidasi identitas karyawan dari layanan terpisah.

**✅ Task 6: Komunikasi Lintas Layanan (Service-to-Service Validation)**

- **Deskripsi:** Terapkan logika di _Attendance Service_ untuk mengambil/memvalidasi data karyawan melalui API _Company Service_ yang relevan menggunakan HTTP request (misalnya `fetch` atau `axios`). _Attendance Service_ **tidak boleh** menyimpan data karyawan ini sebagai sumber utama.
- **Acceptance Criteria (AC):**
  - _Attendance Service_ memiliki fungsi validasi yang berhasil memanggil Company A atau B secara aman (berbasis identitas karyawan/token).
  - Penanganan kesalahan (seperti API _Company Service_ _down_ atau karyawan tidak ditemukan/tidak aktif) tertangani dengan log yang jelas.

**✅ Task 7: Implementasi Modul Kehadiran (Check-In & Check-Out)**

- **Deskripsi:** Buat endpoint untuk _check-in_ dan _check-out_ dengan logika pencegahan _double-submit_ (_idempotency_). Kalkulasi status kehadiran (misal: "Tepat Waktu", "Terlambat") berdasarkan aturan bisnis di Task 1.
- **Acceptance Criteria (AC):**
  - API mengembalikan kode HTTP `2xx` jika sukses dan merekam `serverTimestamp` (konversi ke timezone karyawan untuk penentuan tanggal).
  - Status (`on-time`/`late`) dihitung berdasarkan `startTime` dan `toleranceMinutes` dari data master karyawan (ALG-001).
  - Snapshot `timezone` dan `workSchedule` disimpan dalam dokumen `attendance`.
  - Jika pengguna melakukan _check-in_ dua kali di hari yang sama, API akan menolak dan mengembalikan status penanganan error (_duplicate check/idempotency_).

**✅ Task 8: Implementasi Modul Cuti & Izin (Leave & Permission)**

- **Deskripsi:** Buat endpoint untuk mengajukan cuti dan izin beserta status persetujuannya (`pending`, `approved`, `rejected`). Implementasikan validasi _overlapping_ (tanggal yang tumpang tindih), duplikasi, dan validasi _role_ (hanya admin/approver yang bisa mengubah status).
- **Acceptance Criteria (AC):**
  - Karyawan dapat mengajukan _leave_/_permission_.
  - Pengajuan yang memiliki tanggal tumpang tindih dengan pengajuan yang sudah ada ditolak.
  - Approver dapat mengubah status pengajuan.

### SPRINT 4: Pelaporan, Kinerja, & Penyelesaian Akhir

**Fokus Utama:** Pelaporan yang efisien, pengujian performa wajib, dan kelengkapan dokumentasi penyerahan.

**✅ Task 9: Pembuatan API Pelaporan Rentang Tanggal (Date-Range Reporting)**

- **Deskripsi:** Buat API di _Attendance Service_ untuk menghasilkan rekap (total `absent`, `late`, `on-time`, serta statistik cuti/izin) per karyawan dalam rentang tanggal tertentu. Gunakan **MongoDB Aggregation Pipeline** (ALG-002) yang optimal dan manfaatkan _index_ ESR yang dirancang di Task 2.
- **Acceptance Criteria (AC):**
  - API mengembalikan data agregasi yang akurat mencakup status kehadiran dan pengajuan.
  - Latensi query < 3 detik untuk rentang 1 bulan (REQ-POC-02).
  - Query database hanya memindai dokumen dalam rentang tanggal yang diminta (terverifikasi via observasi log atau `explain()` di MongoDB).

**✅ Task 10: Mandatory Load Testing (Pengujian Beban)**

- **Deskripsi:** Lakukan _load test_ pada satu endpoint kritis (misal: _Submit Attendance_ atau _Reporting_) menggunakan alat seperti K6 atau Artillery. Analisis _bottleneck_ (hambatan) dan catat hasilnya.
- **Acceptance Criteria (AC):**
  - Skrip _load test_ dilampirkan dalam repositori.
  - Ringkasan hasil (konkurensi, metrik latensi, hambatan yang diamati, dan analisis pengoptimalan) telah didokumentasikan.

**✅ Task 11: Finalisasi Dokumentasi (Deliverables Verification)**

- **Deskripsi:** Lengkapi semua dokumentasi final sebelum dikirimkan. Rapikan instruksi instalasi dan pastikan _API documentation_ mencatat format rute, _request_, dan respons (termasuk _error_).
- **Acceptance Criteria (AC):**
  - Terdapat file instalasi _Setup Instructions_ yang jelas (cara _running_, konfigurasi `.env`, dan proses _seed data_ awal jika ada).
  - Dokumentasi _API_, Arsitektur, Aturan Bisnis, dan _Load Test_ tersedia dan lengkap.
  - Seluruh _source code_ dipublikasikan di **Public GitHub Repository** dan siap diserahkan kepada tim rekrutmen.

Dengan disiplin memecah proyek ini ke dalam 11 _tasks_ dengan target yang bisa diverifikasi, Anda telah berpikir sebagai seorang insinyur berkaliber produksi (_production-grade engineer_).

---

## Status Completed: All Tasks Done ✅
