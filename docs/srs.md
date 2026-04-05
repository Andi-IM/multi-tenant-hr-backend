# **Software Requirements Specification (SRS)**

> **📋 Dokumen ini adalah sumber kebenaran untuk tujuan dan requirements sistem.**
> Semua fitur, batasan fungsional, dan acceptance criteria harus dapat ditelusuri ke dokumen ini.

**Sistem Multi-Service Backend Kehadiran & Manajemen Tenaga Kerja**

## **1\. Pendahuluan (Introduction)**

### **1.1 Tujuan (Purpose)**

Dokumen ini menspesifikasikan kebutuhan sistem *backend* terdistribusi (terdiri dari tiga layanan utama) yang mengelola data karyawan, kehadiran, cuti, serta alur persetujuan. Fokus utama adalah penjagaan batas layanan (*service boundaries*), keamanan API, integritas data lintas perusahaan, dan efisiensi performa di bawah beban.

### **1.2 Ruang Lingkup (Scope)**

Sistem ini terdiri dari tiga layanan independen yang bekerja sama untuk mendukung manajemen karyawan perekaman kehadiran, alur persetujuan cuti/izin dan pelaporan. Layanan-layanan tersebut adalah sebagai berikut:

1. **Company A Service:** Mengelola data *master* karyawan untuk Perusahaan A secara terisolasi.  
2. **Company B Service:** Mengelola data *master* karyawan untuk Perusahaan B secara terisolasi.  
3. **Attendance Service:** Layanan terpusat untuk perekaman kehadiran, pengajuan izin/cuti, *workflow* persetujuan, dan pelaporan yang terhubung dengan layanan perusahaan masing-masing.

Fokus utamanya adalah menjaga privasi

### **1.3 Daftar Istilah (Glossary)**

* **Idempotency:** Kemampuan sistem untuk menangani permintaan yang sama berulang kali tanpa mengubah hasil akhir di luar permintaan pertama (mencegah duplikasi).  
* **RBAC:** *Role-Based Access Control*, mekanisme otorisasi berbasis peran pengguna.  
* **IDOR:** *Insecure Direct Object Reference*, kerentanan keamanan di mana pengguna dapat mengakses objek/data yang tidak berhak mereka akses.

### **1.4 References** 

\[1\] Jose Montoya, “Markdown Software Requirements Specification (MSRS)”. Tersedia di: [https://github.com/jam01/SRS-Template/tree/master](https://github.com/jam01/SRS-Template/tree/master).  
\[2\] Dokumen Official Candidate Brief

### **1.5 Document Overview** 

Dokumen ini mencakup Gambaran Umum Produk (arsitektur dan batasan dasar), Persyaratan Sistem (fungsional dan kualitas layanan yang dijabarkan dalam kriteria penerimaan yang jelas), Verifikasi (metode pengujian beban), dan lampiran (kebutuhan pengiriman kode sumber. 

**Konvensi Dokumen:**

* **WAJIB (SHALL):** Persyaratan mutlak yang harus dipenuhi oleh sistem.  
* **DIANJURKAN (SHOULD):** Rekomendasi praktik terbaik yang sebaiknya diterapkan.  
* **BOLEH (MAY):** Fitur atau pilihan yang bersifat opsional.  
* **DILARANG (SHALL NOT):** Larangan mutlak yang tidak boleh dilanggar dalam kondisi apapun.

**Manajemen Pembaruan:** Pengembang WAJIB mencatatkan setiap perubahan pada logika bisnis atau batasan teknis ke dalam tabel Riwayat Revisi disertai kenaikan nomor versi yang sesuai.

## **2\. Tinjauan Produk (Product Overview)**

### **2.1 Konteks (Context)**

Sistem ini dirancang untuk grup perusahaan induk yang menaungi banyak perusahaan. Setiap anak perusahaan harus mempertahankan kepemilikan dan privasi data karyawannya, namun manajemen pusat memerlukan satu sistem pelaporan dan kehadiran yang terintegrasi (Attendance Service).

### **2.2 Fungsi Utama (Functions)**

* Operasi CRUD data karyawan per perusahaan.  
* Perekaman validasi *check-in/check-out* serta derivasi status kehadiran (tepat waktu, terlambat, dll).  
* Pengajuan dan persetujuan (setuju, tolak, tunda) untuk cuti dan izin.  
* Pembuatan laporan rekapitulasi kehadiran dan izin karyawan berfilter rentang tanggal.

### **2.3 Batasan (Constraints)**

* Company Services DILARANG saling berbagi database atau membocorkan data karyawan antar-perusahaan.  
* Tumpukan teknologi dibatasi pada Node.js, Express.js, dan MongoDB.  
* Setiap layanan (Company A, Company B, Attendance) harus dapat berjalan secara independen.  
* Sistem DILARANG menyimpan informasi sensitif (PII) maupun rahasia sistem (*secrets*) secara *hardcoded* di dalam kode sumber.

### **2.4 Pengguna (Users)**

* **Karyawan:** Mengajukan absensi, cuti, dan izin.  
* **Approver / Administrator:** Menyetujui/menolak pengajuan dan melihat laporan.  
* **Service:** Layanan internal yang saling berkomunikasi (*service-to-service communication*).

### **2.5 Asumsi dan Dependensi (Assumptions and Dependencies)**

* *Attendance Service* bergantung pada ketersediaan API dari *Company Services* untuk keperluan validasi identitas karyawan.  
* Penentuan status "terlambat" atau "tepat waktu" bergantung pada definisi jam kerja dan toleransi keterlambatan yang ditetapkan serta didokumentasikan oleh pengembang sistem.  
* Penentuan hari kerja dan hari libur bergantung pada konfigurasi jadwal kerja yang didefinisikan pada data master karyawan.

### **2.6 Apportioning of Requirements**

* Company Services:  Bertanggung jawab penuh atas data master karyawan, mencakup ID, nama, jadwal kerja, dan zona waktu.  
* Attendance Services: Bertanggung jawab atas seluruh logika operasional kehadiran, alur persetujuan, dan pelaporan.

## **3\. Persyaratan (Requirements)**

### **3.1 Antarmuka Eksternal (External Interfaces)**

**3.1.1 API Perangkat Lunak**

Karena sistem ini sepenuhnya merupakan arsitektur *backend*, tidak ada Graphical User Interface (GUI) yang disediakan secara langsung oleh sistem. Interaksi dilakukan melalui pemanggilan REST API. Representasi antarmuka untuk pengembang dan penguji akan disediakan melalui dokumen spesifikasi API terbuka (seperti Swagger/OpenAPI atau koleksi Postman) yang menjelaskan format *request* dan *response*.

**3.1.2 Hardware Interfaces**

Sistem ini tidak memiliki antarmuka langsung dengan perangkat keras keras fisik (seperti mesin pemindai sidik jari atau kartu akses). Semua data kehadiran diasumsikan masuk melalui panggilan API standar HTTP/HTTPS dari sistem klien.

**3.1.3 Software Interfaces**

Sistem ini berinteraksi dengan beberapa antarmuka perangkat lunak:

* **Basis Data Utama:** Berinteraksi dengan MongoDB (menggunakan pustaka Mongoose pada Node.js) melalui koneksi jaringan TCP/IP (biasanya port 27017). Layanan (Company A, Company B, Attendance) harus terhubung ke basis data atau skema yang diisolasi satu sama lain.  
* **Komunikasi Antar Layanan (Inter-Service):**  
  * *Attendance Service* harus berkomunikasi dengan *Company A Service* dan *Company B Service* melalui protokol HTTP/REST untuk memvalidasi identitas karyawan dan peran (`role`) sebelum memproses pengajuan atau mencatat kehadiran.  
* **Sistem Klien (Frontend/Mobile):** Sistem klien eksternal akan mengonsumsi REST API dengan format *payload* JSON (`application/json`) melalui protokol HTTP(S).

### **3.2 Persyaratan Fungsional (Functional Requirements)**

**REQ-FUNC-01: Manajemen Master Data Karyawan (Company Services)**

* **Statement:** Sistem SEHARUSNYA menyediakan API CRUD karyawan di service masing-masing perusahaan. **Rationale:** Menjamin isolasi data dan kepemilikan data di level perusahaan.**Acceptance Criteria:** Atribut karyawan wajib mencakup: ID, Nama Lengkap, Identifier Perusahaan, Tanggal Bergabung, Status Pekerjaan, Jadwal Kerja, dan Zona Waktu. **Verification Method:** Test

**REQ-FUNC-02: Diferensiasi Cuti (*Leave*) dan Izin (*Permission*)** 

* **Statement:** Sistem WAJIB mencatat waktu kedatangan dan kepulangan karyawan serta menghitung status kehadiran secara otomatis. **Rationale:** Merupakan fungsi inti dari pelacakan produktivitas karyawan. **Acceptance Criteria:** Sistem mampu mendeteksi dan menetapkan status tepat waktu, terlambat, atau absen berdasarkan jam kerja yang telah didefinisikan. **Verification Method:** Demonstration

**REQ-FUNC-03: Perekaman Kehadiran (Check-in/out)**

* **Statement:** Sistem WAJIB memisahkan logika pengajuan cuti dan izin secara tegas. **Rationale:** Kedua jenis ketidakhadiran memiliki kebutuhan validasi yang berbeda; pengajuan Izin memerlukan keterangan alasan yang lebih terperinci dibandingkan Cuti. **Acceptance Criteria:** Pengajuan *Permission* WAJIB menyertakan deskripsi alasan yang terperinci, sementara pengajuan *Leave* berfokus pada penetapan rentang tanggal. **Verification Method:** Analysis

**REQ-FUNC-04: Penanganan Kondisi Batas (*Edge Cases*)** 

* **Statement:** Sistem WAJIB memisahkan logika pengajuan cuti dan izin secara tegas. **Rationale:** Kedua jenis ketidakhadiran memiliki kebutuhan validasi yang berbeda; pengajuan Izin memerlukan keterangan alasan yang lebih terperinci dibandingkan Cuti. **Acceptance Criteria:** Pengajuan *Permission* WAJIB menyertakan deskripsi alasan yang terperinci, sementara pengajuan *Leave* berfokus pada penetapan rentang tanggal. **Verification Method:** Analysis.

**REQ-FUNC-05: Efisiensi Pelaporan**

* **Statement:** Sistem WAJIB menghasilkan laporan rekapitulasi kehadiran dengan kueri yang efisien. **Rationale:** Pelaporan kehadiran kerap melibatkan volume data yang besar sehingga berpotensi membebani server apabila tidak dioptimalkan. **Acceptance Criteria:** Laporan WAJIB mencakup jumlah keterlambatan, absensi, cuti, izin, dan status persetujuan. Pengembang WAJIB mendokumentasikan pendekatan algoritma yang digunakan, baik agregasi di tingkat basis data maupun di tingkat aplikasi, beserta alasan pemilihannya. **Verification Method:** Test

### **3.3 Kualitas Layanan (Quality of Service)**

**3.3.1. Keamanan** 

**REQ-QOS-01: Keamanan API dan Proteksi Data**

* **Statement:** Sistem WAJIB menerapkan RBAC, proteksi terhadap IDOR, dan pencegahan *excessive data exposure*. **Rationale:** Melindungi privasi karyawan dan mencegah kebocoran data antarkaryawan maupun antarperusahaan. **Acceptance Criteria:** API DILARANG mengembalikan seluruh dokumen MongoDB secara mentah kepada klien, termasuk atribut seperti *password hash* dan *field* internal sistem. **Verification Method:** Inspection

**REQ-QOS-02: Batas Kepercayaan Antarlayanan (*Inter-service Trust Boundaries*)**

* **Statement:** *Attendance Service* DILARANG mempercayai secara langsung masukan eksternal tanpa verifikasi. Sistem WAJIB memvalidasi identitas karyawan dan kepemilikan perusahaan melalui mekanisme antarlayanan yang terdokumentasi. **Rationale:** Kepercayaan buta terhadap klaim identitas dari sisi klien merupakan celah keamanan kritis pada arsitektur multi-layanan. **Acceptance Criteria:** Pengembang WAJIB mendokumentasikan mekanisme validasi identitas lintas layanan secara eksplisit. Sistem DILARANG memproses permintaan kehadiran tanpa terlebih dahulu memverifikasi kepemilikan karyawan kepada *Company Service* yang bersangkutan. **Verification Method:** Inspection.

**3.3.2 Keandalan (Reliability)**

**REQ-QOS-03: Idempotensi dan Pencegahan Duplikasi**

* **Statement:** Seluruh API kritis WAJIB memiliki mekanisme idempotensi yang terverifikasi untuk mencegah duplikasi data akibat pengiriman permintaan berulang. **Rationale:** Gangguan jaringan pada sisi klien dapat memicu pengiriman permintaan yang sama lebih dari satu kali, yang berpotensi menghasilkan data ganda apabila tidak ditangani. **Acceptance Criteria:** Pengiriman ulang permintaan *check-in* yang identik DILARANG menghasilkan entitas baru di dalam basis data. Mekanisme pencegahan duplikasi WAJIB diterapkan pula pada: *check-out*, pembuatan cuti, pembuatan izin, dan tindakan persetujuan. Pendekatan yang dipilih WAJIB didokumentasikan. **Verification Method:** Test

**3.3.3 Validasi dan Penanganan Kesalahan (*Validation & Error Handling*)**

**REQ-QOS-03: Validasi dan Penanganan Kesalahan (*Validation & Error Handling*)**

* **Statement:** Sistem WAJIB memvalidasi seluruh *payload* permintaan, parameter kueri, parameter jalur, dan masukan tanggal sebelum diproses. Sistem DILARANG mengembalikan *stack trace* atau detail implementasi internal kepada klien. **Rationale:** Mencegah pemrosesan data tidak sah dan mencegah kebocoran informasi sistem melalui respons kesalahan yang tidak terstruktur. **Acceptance Criteria:** Validasi WAJIB mencakup: *required fields*, tipe data, enum, identifier tidak valid, tanggal tidak valid, dan rentang tanggal tidak valid. Respons kesalahan WAJIB menggunakan kode HTTP yang sesuai dengan struktur yang konsisten di seluruh layanan. **Verification Method:** Test

**3.3.4 Keterlihatan Sistem (*Observability*)**

**REQ-QOS-04: Pencatatan Log Operasional (Logging)**

* **Statement:** Sistem WAJIB menyediakan log yang bermakna untuk seluruh kejadian operasional kritis tanpa mengekspos informasi sensitif. **Rationale:** Memungkinkan diagnosis masalah operasional secara efektif di lingkungan produksi. **Acceptance Criteria:** Log WAJIB mencakup: kegagalan autentikasi, seluruh tindakan persetujuan, pembuatan laporan, dan kegagalan komunikasi antarlayanan. Log DILARANG memuat informasi sensitif karyawan secara eksplisit, seperti kata sandi atau data PII lainnya. **Verification Method:** Inspection.

**3.3.5 Performa (*Pefrormance*)**

**REQ-QOS-05: Efisiensi Kueri dan Pengindeksan Basis Data**

* **Statement:** Sistem WAJIB mendefinisikan dan mendokumentasikan strategi indeks basis data untuk seluruh jalur akses kritis. Sistem DILARANG menjalankan *unbounded queries* pada koleksi bervolume besar. **Rationale:** Kueri tanpa indeks pada volume data besar akan menyebabkan degradasi performa yang signifikan dan tidak dapat diterima di lingkungan produksi. **Acceptance Criteria:** Indeks WAJIB didefinisikan dan didokumentasikan untuk: pencarian karyawan, kehadiran berdasarkan karyawan dan tanggal, pengajuan cuti/izin berdasarkan karyawan dan periode, serta penyaringan status persetujuan. API DILARANG melakukan *round trip* basis data yang tidak diperlukan maupun pemanggilan antarlayanan yang berlebihan untuk satu permintaan tunggal. **Verification Method:** Test.

### **3.4 Compliance**

**REQ-COMP-01: Dokumentasi Asumsi Bisnis**

* **Statement:** Pengembang WAJIB mendokumentasikan secara eksplisit seluruh aturan bisnis yang ambigu atau tidak terdefinisi dalam dokumen spesifikasi ini. **Rationale:** Asumsi yang tertanam secara implisit di dalam kode tanpa dokumentasi merupakan risiko pemeliharaan dan evaluasi yang tidak dapat diterima. **Acceptance Criteria:** Setiap aturan bisnis yang hilang atau ambigu WAJIB dicatatkan dalam bagian Asumsi pada dokumentasi teknis repositori. Pengembang DILARANG membiarkan asumsi tersirat hanya di dalam kode tanpa penjelasan tertulis yang menyertainya. **Verification Method:** Inspection

**REQ-COMP-02: Dokumentasi *Trade-off* Desain**

* **Statement:** Pengembang WAJIB menyatakan secara eksplisit seluruh *trade-off* desain yang diambil selama implementasi. Pintasan teknis yang tidak terdokumentasi DILARANG ada dalam hasil pengerjaan. **Rationale:** Evaluasi sistem mencakup penilaian terhadap kualitas penalaran teknis, bukan hanya kelengkapan fitur. *Trade-off* yang beralasan dan terdokumentasi dinilai lebih tinggi daripada implementasi lengkap tanpa penjelasan. **Acceptance Criteria:** Dokumentasi teknis WAJIB mencakup: penjelasan batas layanan, strategi autentikasi, model otorisasi, algoritma pelaporan, strategi pengindeksan, penanganan *edge case*, dan *trade-off* yang dipilih beserta alasannya. **Verification Method:** Inspection.

**REQ-COMP-03: Kelengkapan Dokumentasi Teknis**

* **Statement:** Dokumentasi WAJIB cukup lengkap sehingga pengembang lain dapat melakukan *clone*, menjalankan, meninjau, dan memahami proyek tanpa perlu menebak-nebak. **Rationale:** Dokumentasi yang tidak lengkap merupakan indikator ketidakmatangan rekayasa perangkat lunak. **Acceptance Criteria:** Dokumentasi WAJIB mencakup: instruksi instalasi dan konfigurasi lingkungan, cara menjalankan setiap layanan, dokumentasi API (metode, jalur, autentikasi, bentuk permintaan, contoh respons, dan kemungkinan respons kesalahan), serta penjelasan desain arsitektur secara menyeluruh. **Verification Method:** Inspection.

### **3.5 Design and Implementation**

**3.5.1 Installation**

**REQ-INST-01: Prasyarat dan Konfigurasi Lingkungan**

* **Statement:** Sistem WAJIB dapat dijalankan pada lingkungan yang menyediakan runtime Node.js, instance MongoDB yang terjangkau oleh ketiga layanan, dan konfigurasi variabel lingkungan yang lengkap. **Rationale:** Setiap layanan berjalan secara independen dan membutuhkan konfigurasi terisolasi agar tidak terjadi kontaminasi antar-lingkungan. **Acceptance Criteria:** Pengembang WAJIB mendokumentasikan seluruh variabel lingkungan yang diperlukan oleh masing-masing layanan, mencakup namun tidak terbatas pada: `JWT_SECRET`, `COMPANY_ID`, string koneksi MongoDB per layanan, dan URL internal antarlayanan. Sistem DILARANG berjalan apabila variabel lingkungan wajib tidak terdefinisi. **Verification Method:** Inspection

**REQ-INST-02: Isolasi Basis Data Per Layanan**

* **Statement:** Setiap layanan WAJIB terhubung ke instance atau basis data MongoDB yang terpisah secara logis. Company A Service WAJIB menggunakan Company A DB, Company B Service WAJIB menggunakan Company B DB, dan Attendance Service WAJIB menggunakan Attendance DB yang terpisah. **Rationale:** Pemisahan basis data di tingkat instalasi merupakan lapisan pertama pencegahan kebocoran data lintas perusahaan, sebagaimana didefinisikan dalam arsitektur sistem. **Acceptance Criteria:** Ketiga layanan DILARANG berbagi string koneksi MongoDB yang sama. Pengembang WAJIB mendokumentasikan skema penamaan basis data beserta cara menjalankan masing-masing layanan secara mandiri dalam berkas README. **Verification Method:** Inspection

**3.5.2 Build and Delivery**

**REQ-BUILD-01: Struktur Monorepo atau Multi-Repositori yang Bersih**

* **Statement:** Sistem WAJIB diorganisasikan dalam struktur monorepo atau multi-repositori yang bersih, dengan pemisahan direktori yang tegas antara Company A Service, Company B Service, dan Attendance Service. **Rationale:** Struktur kode yang tidak terpisah dengan jelas akan mempersulit penelaahan, pengujian independen, dan penerapan layanan secara mandiri. **Acceptance Criteria:** Setiap layanan WAJIB memiliki berkas konfigurasi, dependensi (`package.json`), dan titik masuk (*entry point*) yang independen. Struktur direktori WAJIB mencerminkan pemisahan domain secara visual tanpa ambiguitas. **Verification Method:** Inspection.

**REQ-BUILD-02: Manajemen Konfigurasi Berbasis Variabel Lingkungan**

* **Statement:** Sistem DILARANG menyimpan nilai rahasia atau konfigurasi spesifik lingkungan secara *hardcoded* di dalam kode sumber. Seluruh nilai tersebut WAJIB dikelola melalui variabel lingkungan. **Rationale:** Penyimpanan rahasia secara *hardcoded* merupakan kerentanan keamanan kritis yang dapat membahayakan seluruh sistem apabila kode sumber bocor. **Acceptance Criteria:** Nilai-nilai seperti `JWT_SECRET`, URL basis data, `COMPANY_ID`, dan URL antarlayanan WAJIB dibaca dari variabel lingkungan. Repositori WAJIB menyertakan berkas `.env.example` sebagai panduan konfigurasi tanpa mengekspos nilai sesungguhnya. **Verification Method:** Inspection.

**3.5.3 Distribution**

**REQ-DIST-01: Topologi Deployment Multi-Layanan dengan API Gateway**

* **Statement:** Sistem WAJIB menggunakan API Gateway sebagai satu-satunya titik masuk publik. Klien DILARANG berkomunikasi langsung dengan layanan individual tanpa melewati API Gateway. **Rationale:** API Gateway berfungsi sebagai lapisan keamanan awal yang menyederhanakan manajemen lalu lintas, menangani penolakan permintaan tidak dikenal, dan menyembunyikan topologi internal dari klien. Berdasarkan SDD, implementasi referensi menggunakan GCP API Gateway dengan masing-masing layanan berjalan di Cloud Run. **Acceptance Criteria:** API Gateway WAJIB meneruskan permintaan ke layanan yang tepat berdasarkan jalur (*path*) dan konteks token. Pengembang WAJIB mendokumentasikan pemetaan rute API Gateway ke masing-masing layanan. *Trade-off* latensi tambahan akibat penambahan *hop* jaringan WAJIB didokumentasikan. **Verification Method:** Inspection.

**REQ-DIST-02: Komunikasi Antarlayanan Sinkronus via REST**

* **Statement:** Attendance Service WAJIB berkomunikasi dengan Company Service melalui pemanggilan HTTP/REST sinkronus untuk keperluan validasi identitas karyawan. Sistem DILARANG menggunakan *message broker* asinkronus (seperti Kafka atau RabbitMQ) untuk komunikasi ini. **Rationale:** Penggunaan REST sinkronus dipilih secara sadar untuk mencegah *overengineering* pada tahap ini. *Trade-off* yang diterima adalah peningkatan latensi per transaksi *check-in* akibat pemanggilan antarlayanan, namun kompleksitas infrastruktur tetap terjaga seminimal mungkin. **Acceptance Criteria:** Attendance Service WAJIB memanggil *endpoint* internal `GET /api/v1/internal/employees/{employeeId}/status` pada Company Service yang bersangkutan sebelum memproses setiap transaksi *check-in*. *Endpoint* internal ini WAJIB dilindungi otorisasi khusus peran `SYSTEM` dan DILARANG dapat diakses oleh peran `EMPLOYEE` atau `ADMIN_HR`. **Verification Method:** Test.

**3.5.4 Maintainability**

**REQ-MAINT-01: Arsitektur Berlapis (*Layered Architecture*)**

* **Statement:** Kode setiap layanan WAJIB diorganisasikan menggunakan arsitektur berlapis yang memisahkan tanggung jawab secara tegas ke dalam empat lapisan: Routes, Controllers, Services, dan Repositories. **Rationale:** Pemisahan lapisan meningkatkan kemampuan pengujian (*testability*), keterbacaan, dan kemudahan pemeliharaan jangka panjang. Lapisan *Services* berisi seluruh logika bisnis utama dan DILARANG bergantung langsung pada detail implementasi basis data. **Acceptance Criteria:** Lapisan *Routes* WAJIB hanya menangani definisi jalur dan penugasan *middleware*. Lapisan *Controllers* WAJIB hanya menangani penerjemahan permintaan dan respons HTTP. Lapisan *Services* WAJIB mengandung seluruh logika bisnis. Lapisan *Repositories* WAJIB menjadi satu-satunya lapisan yang berinteraksi langsung dengan MongoDB melalui ODM (Mongoose). **Verification Method:** Inspection

**REQ-MAINT-02: Validasi Skema dengan ODM**

* **Statement:** Sistem WAJIB menggunakan ODM (Mongoose) untuk mendefinisikan dan menegakkan validasi skema pada seluruh koleksi MongoDB di tingkat aplikasi. **Rationale:** MongoDB bersifat *schema-less* secara bawaan; tanpa validasi skema di tingkat aplikasi, integritas data tidak dapat dijamin, terutama untuk atribut wajib seperti `employeeId`, `status`, dan `date`. **Acceptance Criteria:** Seluruh koleksi (employees, attendances, leave\_permission\_requests) WAJIB memiliki definisi skema Mongoose yang mencakup tipe data, atribut wajib, dan nilai enum yang valid. Penyimpanan dokumen yang tidak sesuai skema WAJIB ditolak sebelum mencapai basis data. **Verification Method: Test**

**3.5.5 Reusability**

**REQ-REUSE-01: Modul Middleware yang Dapat Digunakan Ulang**

* **Statement:** Logika autentikasi JWT dan otorisasi RBAC WAJIB diimplementasikan sebagai modul *middleware* yang dapat digunakan ulang di seluruh lapisan Routes tanpa duplikasi kode. **Rationale:** Duplikasi logika keamanan di berbagai *endpoint* meningkatkan risiko inkonsistensi dan celah keamanan yang sulit dilacak. **Acceptance Criteria:** Middleware autentikasi WAJIB memverifikasi token JWT, mendekode *payload* (`userId`, `role`, `companyId`), dan menempelkannya ke objek `req.user` untuk digunakan oleh lapisan *Controllers* dan *Services*. Middleware otorisasi RBAC WAJIB dapat dikonfigurasi per rute dengan menentukan peran yang diizinkan sebagai parameter. **Verification Method:** Inspection.

**3.5.6 Portability**

**REQ-PORT-01: Portabilitas Konfigurasi Zona Waktu**

* **Statement:** Sistem WAJIB menggunakan *server-side timestamp* yang disesuaikan dengan zona waktu karyawan untuk seluruh kalkulasi kehadiran. Sistem DILARANG mempercayai *timestamp* yang berasal dari sisi klien. **Rationale:** Penggunaan *timestamp* sisi klien membuka celah manipulasi waktu *check-in*. Karyawan dari berbagai zona waktu WAJIB mendapatkan kalkulasi kehadiran yang akurat berdasarkan atribut `timezone` pada data master mereka. **Acceptance Criteria:** Seluruh kalkulasi status tepat waktu dan terlambat WAJIB menggunakan *timestamp* yang dihasilkan oleh server dan dikonversi ke zona waktu karyawan yang diambil dari Company Service. Atribut `timezone` pada data master karyawan WAJIB menggunakan format standar IANA (contoh: `Asia/Jakarta`). **Verification Method:** Test.

**3.5.7 Deadline**

**REQ-DEAD-01: Batas Waktu Pengiriman Akhir**

* **Statement:** Seluruh *deliverable* WAJIB dikirimkan melalui repositori GitHub publik yang dapat dijalankan sesuai instruksi yang disediakan, dalam batas waktu yang ditetapkan oleh tim rekrutmen. **Rationale:** Pengiriman yang tidak dapat dijalankan atau tidak memiliki dokumentasi lengkap akan dievaluasi sebagai pengiriman tidak sah tanpa memandang kelengkapan fitur. **Acceptance Criteria:** Repositori WAJIB dapat di-*clone* dan dijalankan oleh pihak evaluator menggunakan instruksi pada README tanpa memerlukan bantuan tambahan dari kandidat. *Trade-off* desain yang dibuat WAJIB dinyatakan secara eksplisit dalam dokumentasi; pintasan yang tidak terdokumentasi DILARANG ada dalam hasil pengiriman. **Verification Method:** Demonstration.

**3.5.8 Proof of Concept**

**REQ-POC-01: Validasi Strategi Komunikasi Antarlayanan**

* **Statement:** Pengembang WAJIB mendokumentasikan hasil validasi atas pemilihan strategi komunikasi antarlayanan sebelum implementasi penuh, mencakup perbandingan pendekatan yang dipertimbangkan beserta alasan pemilihan akhirnya. **Rationale:** Keputusan arsitektur pada komunikasi antarlayanan bersifat sulit diubah setelah implementasi berjalan. Validasi awal mencegah *rework* yang mahal di kemudian hari. **Acceptance Criteria:** Dokumentasi teknis WAJIB mencantumkan perbandingan eksplisit antara pendekatan REST sinkronus dan *message broker* asinkronus (seperti Kafka atau RabbitMQ). Dokumen WAJIB menyatakan bahwa REST sinkronus dipilih karena mencukupi kebutuhan validasi identitas *real-time* pada *check-in* tanpa menambah kompleksitas infrastruktur yang tidak proporsional untuk skala proyek ini. *Trade-off* berupa peningkatan latensi per transaksi akibat pemanggilan antarlayanan WAJIB diakui secara eksplisit. **Verification Method:** Inspection.

**REQ-POC-02: Validasi Skema dengan ODM**

* **Statement:** Pengembang WAJIB mendokumentasikan hasil validasi atas pemilihan pendekatan komputasi laporan, mencakup perbandingan antara agregasi di tingkat basis data dan kalkulasi di tingkat aplikasi. **Rationale:** Laporan rentang tanggal berpotensi melibatkan volume data yang sangat besar. Keputusan di mana komputasi dilakukan secara langsung berdampak pada konsumsi memori, latensi respons, dan skalabilitas sistem. **Acceptance Criteria:** Dokumentasi teknis WAJIB menyatakan bahwa MongoDB Aggregation Pipeline dipilih sebagai pendekatan utama karena komputasi dilakukan di tingkat basis data sehingga lebih hemat memori dibandingkan menarik seluruh *raw data* ke dalam proses Node.js. KPI waktu pembuatan laporan WAJIB didefinisikan sebagai kurang dari 3 detik untuk rentang satu bulan dengan dukungan indeks pada *field* `employeeId` dan `date`. **Verification Method:** Test.

**3.5.9 Change Management**

**REQ-CM-01: Pengelolaan Transisi Status yang Tidak Dapat Dibalik**

* **Statement:** Sistem WAJIB memperlakukan transisi status pengajuan cuti dan izin sebagai perubahan satu arah yang tidak dapat dibalik. Sistem DILARANG memproses permintaan yang mencoba mengembalikan status *approved* atau *rejected* ke status *pending*. **Rationale:** Konsistensi transisi status adalah fondasi integritas alur persetujuan. Pembalikan status yang tidak terkontrol dapat menyebabkan ketidakpastian data payroll dan ketidakpercayaan pengguna terhadap sistem. **Acceptance Criteria:** Sistem WAJIB menolak seluruh percobaan transisi status yang tidak valid dengan respons HTTP 409 Conflict disertai pesan kesalahan yang jelas. Seluruh tindakan persetujuan yang berhasil maupun yang ditolak WAJIB dicatat dalam log operasional untuk keperluan jejak audit. **Verification Method:** Test.

**REQ-CM-02: Pengelolaan Perubahan Jadwal Kerja Karyawan**

* **Statement:** Sistem WAJIB memastikan bahwa perubahan pada atribut jadwal kerja (`workSchedule`) atau zona waktu (`timezone`) karyawan di Company Service hanya berdampak pada kalkulasi kehadiran di masa mendatang dan DILARANG mengubah data kehadiran historis yang sudah tercatat. **Rationale:** Data kehadiran historis merupakan rekam jejak yang sudah final pada saat pencatatannya. Perubahan jadwal yang memodifikasi data historis akan merusak integritas laporan payroll dan evaluasi performa. **Acceptance Criteria:** Attendance Service WAJIB selalu mengambil data jadwal kerja terkini dari Company Service pada saat transaksi berlangsung, bukan menyimpan salinan lokal yang dapat menjadi usang. Rekaman kehadiran yang sudah tersimpan di koleksi `attendances` DILARANG dimodifikasi oleh perubahan data master karyawan apapun setelah pencatatan dilakukan. **Verification Method:** Analysis.

**REQ-CM-03:  Dokumentasi *Trade-off* sebagai Syarat Pengiriman**

* **Statement:** Pengembang WAJIB menyertakan dokumentasi eksplisit atas seluruh *trade-off* desain yang diambil selama proses implementasi sebagai bagian yang tidak terpisahkan dari pengiriman akhir. **Rationale:** Evaluasi sistem mencakup penilaian kualitas penalaran teknis. *Trade-off* yang beralasan dan terdokumentasi dinilai lebih tinggi daripada implementasi lengkap tanpa penjelasan, dan pintasan yang tidak terdokumentasi secara eksplisit dinyatakan tidak dapat diterima dalam penilaian ini. **Acceptance Criteria:** Dokumentasi WAJIB mencakup seluruh keputusan desain utama beserta alternatif yang dipertimbangkan dan alasan pemilihan akhirnya. Contoh *trade-off* yang WAJIB terdokumentasi mencakup: REST sinkronus vs. *message broker*, agregasi MongoDB vs. kalkulasi aplikasi, dan strategi penanganan *edge case* lupa *check-out*. **Verification Method:** Inspection.

## **4\. Verifikasi (Verification)**

* **Pengujian Beban (Load Testing):** Kualitas performa sistem WAJIB divalidasi melalui **Load Testing** pada minimal satu *endpoint* kritis, seperti pengajuan kehadiran (*attendance submission*), pembuatan cuti (*leave request creation*), atau pembuatan laporan karyawan (*employee report generation*).  
  Hasil pengujian WAJIB mencakup enam komponen berikut secara lengkap:  
* **Alat pengujian:** Nama dan versi alat *load testing* yang digunakan.  
* **Skenario:** Deskripsi skenario pengujian yang dijalankan.  
* **Konkurensi atau volume:** Jumlah pengguna konkuren atau volume permintaan yang disimulasikan.  
* **Hasil yang diamati:** Data metrik performa yang diperoleh dari pengujian.  
* **Bottleneck yang teridentifikasi:** Komponen atau jalur yang menjadi titik kemacetan performa.  
* **Analisis perbaikan:** Usulan konkret untuk mengatasi *bottleneck* yang ditemukan.  
* **Artefak Dokumentasi:** Semua *endpoint* harus terdokumentasi (metode, jalur, *payload*, *response*, *error*). Keputusan pertukaran desain (*trade-off*), strategi batas layanan, struktur *index* DB, algoritma komputasi cuti, serta penanganan *edge-cases* dan asumsi wajib diserahkan dalam wujud fail *Markdown* (misal: README.md).

## **5\. Lampiran (Appendixes)**

* **Tautan repositorI**: https://github.com/Andi-IM/multi-tenant-hr-backend.  
* **Instruksi Setup:** Tersedia pada berkas README.md di dalam repositori.  
* **Dokumentasi Keputusan:** Pengembang WAJIB menyertakan penjelasan mengenai *trade-off* desain dan strategi indeks basis data di dalam dokumentasi teknis.  
* **Variabel Lingkungan:** Pengembang WAJIB mendokumentasikan seluruh variabel lingkungan (*environment variables*) yang diperlukan untuk menjalankan setiap layanan.  
* **Skrip dan Hasil Load Test:** Skrip pengujian beban beserta ringkasan hasil WAJIB disertakan sebagai bagian dari pengiriman akhir.