# Task List Proyek
Tugas di bawah ini dirancang dengan prinsip **Layered Architecture** dan praktik terbaik pengembangan Node.js. Berikut adalah daftar tugas berurutan beserta *Acceptance Criteria* (AC) atau kriteria penyelesaiannya:

### SPRINT 1: Perencanaan, Desain, & Fondasi Proyek
**Fokus Utama:** Mendefinisikan batasan sistem dan aturan bisnis yang tidak tertulis, serta menyiapkan kerangka kode dasar.

**Task 1: Mendokumentasikan Aturan Bisnis & Asumsi (Business Rules Document)**
*   **Deskripsi:** Buat satu dokumen (misal: `ARCHITECTURE.md` atau `README.md`) yang menjabarkan logika kehadiran (kapan dihitung *late*, *on-time*, apakah ada toleransi waktu, dan bagaimana penanganan absen yang lupa *check-out*). Jabarkan juga strategi *idempotency* untuk mencegah duplikasi absensi.
*   **Acceptance Criteria (AC):**
    *   Dokumen memuat aturan eksplisit mengenai logika *check-in/check-out*.
    *   Dokumen memuat logika penentuan absen (hari kerja vs libur, persetujuan cuti).
    *   Dokumen memuat penjelasan strategi *idempotency* (misalnya menggunakan *unique constraints* pada database atau validasi di *Service Layer*).

**Task 2: Merancang Skema Database & Strategi Indexing MongoDB**
*   **Deskripsi:** Rancang skema MongoDB (menggunakan Mongoose) untuk Karyawan, Kehadiran, dan Cuti. Definisikan field wajib. Rancang *Index* pada *field* yang sering dikueri (seperti ID Karyawan, tanggal absensi, status *approval*) untuk menghindari *full collection scan*.
*   **Acceptance Criteria (AC):**
    *   Terdapat diagram skema atau file definisi model awal.
    *   Daftar *index* database terdokumentasi dan terjustifikasi (misal: *compound index* untuk `employeeId` dan `date`).

**Task 3: Inisialisasi Proyek (Layered Architecture Scaffold)**
*   **Deskripsi:** Buat repositori (*monorepo* atau *multi-repo*) untuk ketiga layanan (Company A Service, Company B Service, Attendance Service). Terapkan **Layered Architecture** dengan memisahkan kode ke dalam *Routes* (rute), *Controllers* (orkestrasi tipis), *Services* (logika bisnis), dan *Repositories/Operations* (akses database). 
*   **Acceptance Criteria (AC):**
    *   Tiga *service* Express.js independen berhasil dijalankan (*runnable*) di *port* yang berbeda.
    *   Terdapat fail `.env.example` untuk manajemen konfigurasi tanpa mem-*hardcode* kredensial.
    *   *Controllers* hanya menerima *request* dan memanggil *Service* (tetap tipis/ *thin controllers*).

### SPRINT 2: Core Services & Manajemen Akses
**Fokus Utama:** Membangun *source of truth* data karyawan yang terisolasi dan sistem keamanan dasar.

**Task 4: Implementasi Autentikasi & Role-Based Access Control (RBAC)**
*   **Deskripsi:** Implementasikan middleware autentikasi, sangat direkomendasikan menggunakan JWT untuk arsitektur terdistribusi/mikroservis. Buat pemisahan *role* (Karyawan, Approver/Admin, dan Service-to-Service).
*   **Acceptance Criteria (AC):**
    *   *Endpoint* yang dilindungi mengembalikan error `401 Unauthorized` jika token tidak ada/salah.
    *   Aksi spesifik (seperti menyetujui cuti) mengembalikan error `403 Forbidden` jika diakses oleh *role* karyawan biasa.

**Task 5: Implementasi CRUD Company A & Company B Service**
*   **Deskripsi:** Buat API untuk operasi Create, Update, Retrieve, List, dan Deactivate data karyawan di masing-masing layanan. Terapkan isolasi ketat di mana data Perusahaan A tidak bisa diakses dari rute Perusahaan B.
*   **Acceptance Criteria (AC):**
    *   Semua 5 endpoint CRUD karyawan berfungsi untuk Company A dan Company B.
    *   Payload masukan divalidasi dengan baik dan *error response* terstruktur.
    *   Pengecekan keamanan (*Insecure Direct Object Reference* / IDOR) diterapkan.

### SPRINT 3: Attendance Service & Komunikasi Lintas-Layanan
**Fokus Utama:** Membangun logika kehadiran dan memvalidasi identitas karyawan dari layanan terpisah.

**Task 6: Komunikasi Lintas Layanan (Service-to-Service Validation)**
*   **Deskripsi:** Terapkan logika di *Attendance Service* untuk mengambil/memvalidasi data karyawan melalui API *Company Service* yang relevan menggunakan HTTP request (misalnya `fetch` atau `axios`). *Attendance Service* **tidak boleh** menyimpan data karyawan ini sebagai sumber utama.
*   **Acceptance Criteria (AC):**
    *   *Attendance Service* memiliki fungsi validasi yang berhasil memanggil Company A atau B secara aman (berbasis identitas karyawan/token).
    *   Penanganan kesalahan (seperti API *Company Service* *down* atau karyawan tidak ditemukan/tidak aktif) tertangani dengan log yang jelas.

**Task 7: Implementasi Modul Kehadiran (Check-In & Check-Out)**
*   **Deskripsi:** Buat endpoint untuk *check-in* dan *check-out* dengan logika pencegahan *double-submit* (*idempotency*). Kalkulasi status kehadiran (misal: "Tepat Waktu", "Terlambat") berdasarkan aturan bisnis di Task 1.
*   **Acceptance Criteria (AC):**
    *   API mengembalikan kode HTTP `2xx` jika sukses dan merekam *timestamp*.
    *   Jika pengguna melakukan *check-in* dua kali di hari yang sama, API akan menolak dan mengembalikan status penanganan error (*duplicate check/idempotency*).

**Task 8: Implementasi Modul Cuti & Izin (Leave & Permission)**
*   **Deskripsi:** Buat endpoint untuk mengajukan cuti dan izin beserta status persetujuannya (Pending, Approved, Rejected). Implementasikan validasi *overlapping* (tanggal yang tumpang tindih), duplikasi, dan validasi *role* (hanya admin/approver yang bisa mengubah status).
*   **Acceptance Criteria (AC):**
    *   Karyawan dapat mengajukan *leave*/*permission*.
    *   Pengajuan yang memiliki tanggal tumpang tindih dengan pengajuan yang sudah ada ditolak.
    *   Approver dapat mengubah status pengajuan.

### SPRINT 4: Pelaporan, Kinerja, & Penyelesaian Akhir
**Fokus Utama:** Pelaporan yang efisien, pengujian performa wajib, dan kelengkapan dokumentasi penyerahan.

**Task 9: Pembuatan API Pelaporan Rentang Tanggal (Date-Range Reporting)**
*   **Deskripsi:** Buat API di *Attendance Service* untuk menghasilkan rekap (total absen, terlambat, izin, cuti, dll.) per karyawan dalam rentang tanggal tertentu. Gunakan query agregasi MongoDB yang optimal dan manfaatkan *index* yang dirancang di Task 2.
*   **Acceptance Criteria (AC):**
    *   API mengembalikan data agregasi yang akurat.
    *   Query database hanya memindai dokumen dalam rentang tanggal yang diminta (terverifikasi via observasi log atau `explain()` di MongoDB).

**Task 10: Mandatory Load Testing (Pengujian Beban)**
*   **Deskripsi:** Lakukan *load test* pada satu endpoint kritis (misal: *Submit Attendance* atau *Reporting*) menggunakan alat seperti K6 atau Artillery. Analisis *bottleneck* (hambatan) dan catat hasilnya.
*   **Acceptance Criteria (AC):**
    *   Skrip *load test* dilampirkan dalam repositori.
    *   Ringkasan hasil (konkurensi, metrik latensi, hambatan yang diamati, dan analisis pengoptimalan) telah didokumentasikan.

**Task 11: Finalisasi Dokumentasi (Deliverables Verification)**
*   **Deskripsi:** Lengkapi semua dokumentasi final sebelum dikirimkan. Rapikan instruksi instalasi dan pastikan *API documentation* mencatat format rute, *request*, dan respons (termasuk *error*).
*   **Acceptance Criteria (AC):**
    *   Terdapat file instalasi *Setup Instructions* yang jelas (cara *running*, konfigurasi `.env`, dan proses *seed data* awal jika ada).
    *   Dokumentasi *API*, Arsitektur, Aturan Bisnis, dan *Load Test* tersedia dan lengkap.
    *   Seluruh *source code* dipublikasikan di **Public GitHub Repository** dan siap diserahkan kepada tim rekrutmen.

Dengan disiplin memecah proyek ini ke dalam 11 *tasks* dengan target yang bisa diverifikasi, Anda telah berpikir sebagai seorang insinyur berkaliber produksi (*production-grade engineer*). 

Apakah Anda ingin kita membedah implementasi kode spesifik untuk **Task 6 (Service-to-Service Validation)** atau **Task 10 (Load Testing)** selanjutnya?