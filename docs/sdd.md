# Software Design Description

> **📋 Dokumen ini adalah sumber kebenaran untuk desain teknis sistem.**
> Semua keputusan arsitektur, algoritma, API contract, dan implementasi teknis harus konsisten dengan dokumen ini.
> Desain dalam dokumen ini dibuat berdasarkan requirements di **SRS.md**.

## Sistem Multi-Service Backend Kehadiran & Manajemen Tenaga Kerja

Version 1.2
Prepared by Andi Irham
2026

---

## Table of Contents

- [1. Introduction](#1-introduction)
  - [1.1 Document Purpose](#11-document-purpose)
  - [1.2 Subject Scope](#12-subject-scope)
  - [1.3 Definitions, Acronyms, and Abbreviations](#13-definitions-acronyms-and-abbreviations)
  - [1.4 References](#14-references)
  - [1.5 Document Overview](#15-document-overview)
- [2. Design Overview](#2-design-overview)
  - [2.1 Stakeholder Concerns](#21-stakeholder-concerns)
  - [2.2 Selected Viewpoints](#22-selected-viewpoints)
- [3. Design Views](#3-design-views)
- [4. Decisions](#4-decisions)
- [5. Appendixes](#5-appendixes)
- [6. Implementation Notes](#6-implementation-notes)
  - [6.1 ADI-001 — Implementation Deviation Record](#61-adi-001--implementation-deviation-record)
  - [6.2 Rasional Deviasi](#62-rasional-deviasi))

---

## Revision History

| Name | Date | Reason For Changes | Version |
|------|------|--------------------|---------|
| Andi-IM | 2026-04-05 | Initial draft derived from SRS | 1.0 |
| Andi-IM | 2026-04-06 | Update: Document implementation deviations (ADI-001), role name SYSTEM_ACTOR, env var changes | 1.1 |
| Andi-IM | 2026-04-06 | Decision: Tenant-aware Company Service URL selection in Attendance (Option A) | 1.2 |

---

## 1. Introduction

### 1.1 Document Purpose

Dokumen Software Design Description (SDD) ini mendeskripsikan desain arsitektur dan teknis sistem Multi-Service Backend Kehadiran & Manajemen Tenaga Kerja. Dokumen ini ditujukan bagi pengembang yang akan mengimplementasikan sistem, arsitek yang meninjau kesesuaian desain, serta penguji dan operator yang perlu memahami cara sistem beroperasi. SDD ini berfungsi sebagai jembatan antara spesifikasi kebutuhan (**SRS**) dan implementasi aktual, memastikan setiap keputusan desain dapat ditelusuri kembali ke persyaratan yang telah ditetapkan.

> **🔗 Dokumen ini berkaitan langsung dengan Software Requirements Specification (SRS) sebagai dokumen sumber normatif utama.** Seluruh keputusan desain yang tercantum di sini dapat dirujuk silang ke persyaratan pada SRS tersebut.

### 1.2 Subject Scope

Sistem yang dirancang adalah sebuah backend terdistribusi yang terdiri dari tiga layanan independen:

1. **Company A Service** — mengelola data *master* karyawan Perusahaan A secara terisolasi penuh.
2. **Company B Service** — mengelola data *master* karyawan Perusahaan B secara terisolasi penuh.
3. **Attendance Service** — layanan terpusat untuk perekaman kehadiran (*check-in/check-out*), pengajuan dan persetujuan cuti/izin, serta pelaporan rekapitulasi.

Sistem ini dirancang untuk grup perusahaan induk yang membutuhkan isolasi data antar anak perusahaan sekaligus satu titik pelaporan kehadiran yang terintegrasi. Tujuan bisnis utamanya adalah menjaga privasi data karyawan per entitas perusahaan, sekaligus memungkinkan manajemen pusat mengakses data operasional kehadiran secara konsolidasi.

**Batasan Ruang Lingkup — Sistem ini TIDAK mencakup:**

- Antarmuka pengguna grafis (GUI / frontend application)
- Integrasi langsung dengan perangkat keras fisik (mesin absensi biometrik, kartu akses)
- Sistem penggajian (*payroll*) atau perhitungan kompensasi
- Mekanisme *Single Sign-On* (SSO) eksternal

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|------|------------|
| API | Application Programming Interface |
| CRUD | Create, Read, Update, Delete |
| IANA | Internet Assigned Numbers Authority — otoritas standar nama zona waktu (contoh: `Asia/Jakarta`) |
| IDOR | Insecure Direct Object Reference — kerentanan di mana pengguna mengakses objek yang bukan haknya |
| JWT | JSON Web Token — mekanisme autentikasi stateless berbasis token terenkripsi |
| ODM | Object Document Mapper; dalam proyek ini mengacu pada Mongoose untuk MongoDB |
| PII | Personally Identifiable Information — informasi yang dapat mengidentifikasi individu |
| RBAC | Role-Based Access Control — otorisasi berbasis peran pengguna |
| REST | Representational State Transfer — gaya arsitektur komunikasi berbasis HTTP |
| SDD | Software Design Document |
| SRS | Software Requirements Specification |
| Idempotency | Kemampuan sistem menangani permintaan berulang tanpa mengubah hasil di luar eksekusi pertama |
| Leave | Cuti — ketidakhadiran terencana yang didefinisikan dalam rentang tanggal |
| Permission | Izin — ketidakhadiran dengan alasan terperinci yang wajib disertakan |
| Check-in | Perekaman waktu kedatangan karyawan |
| Check-out | Perekaman waktu kepulangan karyawan |
| Company A/B DB | Instance atau database MongoDB yang digunakan secara eksklusif oleh masing-masing Company Service |
| Attendance DB | Instance atau database MongoDB yang digunakan secara eksklusif oleh Attendance Service |

### 1.4 References

| # | Judul / Sumber | Tipe | Lokasi |
|---|----------------|------|--------|
| 1 | SRS: Sistem Multi-Service Backend Kehadiran & Manajemen Tenaga Kerja | Normative | Dokumen sumber utama |
| 2 | Jose Montoya, "Markdown Software Requirements Specification (MSRS)" | Informative | https://github.com/jam01/SRS-Template/tree/master |
| 3 | Dokumen Official Candidate Brief | Normative | Disediakan oleh tim rekrutmen |
| 4 | Repositori proyek | Informative | https://github.com/Andi-IM/multi-tenant-hr-backend |
| 5 | RFC 7519 — JSON Web Token (JWT) | Informative | https://datatracker.ietf.org/doc/html/rfc7519 |
| 6 | MongoDB Aggregation Pipeline Documentation | Informative | https://www.mongodb.com/docs/manual/aggregation/ |
| 7 | IANA Time Zone Database | Normative | https://www.iana.org/time-zones |

### 1.5 Document Overview

Bagian 2 menetapkan sudut pandang (*viewpoints*) yang digunakan untuk merepresentasikan desain beserta pemangku kepentingan yang dituju. Bagian 3 berisi elemen-elemen desain konkret yang meliputi konteks sistem, komposisi layanan, model data, antarmuka API, alur interaksi, *state machine*, topologi *deployment*, dan algoritma inti. Bagian 4 mendokumentasikan keputusan arsitektur signifikan beserta rasionalisasi dan alternatif yang dipertimbangkan. Bagian 5 memuat lampiran pendukung meliputi strategi indeks database, referensi variabel lingkungan, penanganan *edge case*, dan rencana *load testing*.

Konvensi penomoran ID elemen desain menggunakan prefix tiga huruf diikuti nomor urut tiga digit (contoh: `CTX-001`, `DEC-002`). Setiap elemen desain pada Bagian 3 menyertakan referensi silang ke ID persyaratan SRS terkait.

---

## 2. Design Overview

### 2.1 Stakeholder Concerns

| Stakeholder | Concerns Utama | Viewpoint yang Merespons |
|-------------|----------------|--------------------------|
| **Karyawan** | Kemudahan pengajuan kehadiran, cuti, dan izin; keakuratan status kehadiran | Context, Interaction, Interface |
| **Approver / Admin HR** | Alur persetujuan yang jelas; akses laporan yang akurat dan cepat | Interaction, State Dynamics, Algorithm |
| **Developer / Implementor** | Kejelasan batas layanan; struktur kode yang dapat dipelihara; kontrak API yang eksplisit | Composition, Logical, Interface, Dependency |
| **Operator / DevOps** | Cara menjalankan setiap layanan; topologi deployment; konfigurasi lingkungan | Deployment, Physical, Resources |
| **Evaluator / Auditor** | Keterlacakan keputusan desain; dokumentasi *trade-off*; keamanan sistem | Decisions, Security (Interface), Information |

### 2.2 Selected Viewpoints

Viewpoint-viewpoint berikut dipilih untuk menjawab keseluruhan kekhawatiran pemangku kepentingan yang diidentifikasi pada bagian 2.1.

| Viewpoint | Tujuan | Bahasa Representasi |
|-----------|--------|---------------------|
| **Context** | Mendefinisikan sistem sebagai kotak hitam dengan batas dan aktor eksternalnya | Deskripsi tekstual + diagram blok |
| **Composition** | Mendeskripsikan bagaimana sistem dirakit dari layanan-layanan penyusunnya | Deskripsi komponen + diagram hierarki |
| **Logical** | Menangkap struktur statis entitas domain dan hubungan antar-entitas | Deskripsi model + UML-style class diagram |
| **Information** | Memodelkan struktur data persisten, skema, dan strategi akses | Skema koleksi MongoDB + ER diagram |
| **Interface** | Mendefinisikan kontrak API yang terlihat secara eksternal dan internal | Spesifikasi endpoint REST |
| **Interaction** | Mengilustrasikan alur kolaborasi antar komponen saat runtime | Deskripsi sequence diagram |
| **State Dynamics** | Mendokumentasikan transisi status pengajuan cuti/izin | State transition table |
| **Algorithm** | Merinci logika pemrosesan internal untuk kalkulasi kehadiran dan pelaporan | Pseudocode + flowchart deskriptif |
| **Deployment** | Mendeskripsikan pemetaan layanan ke lingkungan eksekusi fisik | Deskripsi topologi + tabel pemetaan |
| **Patterns** | Mengidentifikasi pola desain yang diterapkan secara konsisten | Deskripsi pola + lokasi penerapan |

---

## 3. Design Views

---

### 3.1 Context View

- **ID:** CTX-001
- **Title:** System Context — Multi-Service HR Backend
- **Viewpoint:** Context
- **SRS Refs:** §2.1, §2.4, §3.1

**Representation:**

Sistem terdiri dari tiga layanan backend yang berdiri secara independen dan berkomunikasi melalui HTTP/REST. Seluruh lalu lintas dari klien eksternal masuk melalui satu titik masuk tunggal yaitu **API Gateway**, yang kemudian meneruskan permintaan ke layanan yang sesuai berdasarkan *path routing*.

```
+------------------+         +-------------------+
|   Client         |         |   API Gateway     |
|  (HTTP/HTTPS)    +-------->+  (Single Entry    |
|  Employee        |         |   Point)          |
|  Admin/Approver  |         +---+---+-------+---+
+------------------+             |   |       |
                                 |   |       |
              +------------------+   |       +--------------------+
              |                      |                            |
              v                      v                            v
   +----------+--------+  +----------+--------+       +----------+--------+
   |  Company A Service|  | Company B Service |       | Attendance Service |
   |  (Node.js/Express)|  | (Node.js/Express) |       | (Node.js/Express)  |
   |  Company A DB     |  | Company B DB      |       | Attendance DB      |
   |  (MongoDB)        |  | (MongoDB)         |       | (MongoDB)          |
   +-------------------+  +-------------------+       +--------+----------+
                                                               |
                                        +----------------------+---------------------+
                                        |                                            |
                              GET /internal/employees          GET /internal/employees
                              (Company A validation)           (Company B validation)
```

**Aktor Eksternal:**

| Aktor | Peran | Interaksi |
|-------|-------|-----------|
| Employee | Pengguna akhir | Check-in, check-out, pengajuan cuti/izin |
| Admin HR / Approver | Pengguna dengan elevated role | Persetujuan pengajuan, akses laporan |
| System (internal) | Layanan yang memanggil layanan lain | Validasi identitas karyawan antar-layanan |

**More Information:** Lihat DEC-005 untuk keputusan penggunaan API Gateway dan DEC-001 untuk keputusan komunikasi antar-layanan.

---

### 3.2 Composition View — Service Decomposition

- **ID:** CMP-001
- **Title:** Service Composition dan Batas Domain
- **Viewpoint:** Composition
- **SRS Refs:** §1.2, §2.6, REQ-INST-02

**Representation:**

Sistem didekomposisi menjadi tiga layanan dengan batas domain yang tegas. Setiap layanan memiliki database, konfigurasi, dan *entry point* yang sepenuhnya terpisah.

```
SISTEM HR BACKEND
│
├── Company A Service
│   ├── Tanggung Jawab : Master data karyawan Perusahaan A
│   ├── Database       : Company A DB (MongoDB — isolated)
│   ├── Entry Point    : /company-a/api/v1/...
│   └── Internal API   : GET /api/v1/internal/employees/:id/status
│
├── Company B Service
│   ├── Tanggung Jawab : Master data karyawan Perusahaan B
│   ├── Database       : Company B DB (MongoDB — isolated)
│   ├── Entry Point    : /company-b/api/v1/...
│   └── Internal API   : GET /api/v1/internal/employees/:id/status
│
└── Attendance Service
    ├── Tanggung Jawab : Check-in/out, cuti, izin, pelaporan
    ├── Database       : Attendance DB (MongoDB — isolated)
    ├── Entry Point    : /attendance/api/v1/...
    └── Dependensi     : Memanggil Company A/B Service (via HTTP internal)
```

**Aturan Isolasi (dari REQ-INST-02 dan §2.3):**

- Company A Service dan Company B Service **DILARANG** berbagi koneksi database.
- Attendance Service **DILARANG** mengakses database Company Service secara langsung; seluruh data karyawan diperoleh melalui pemanggilan API internal.
- Setiap layanan harus dapat di-*deploy* dan dijalankan secara mandiri.

**More Information:** Lihat DEC-003 untuk keputusan isolasi database dan DEC-001 untuk pola komunikasi antar-layanan.

---

### 3.3 Composition View — Layered Architecture Per Service

- **ID:** CMP-002
- **Title:** Arsitektur Berlapis Internal Setiap Layanan
- **Viewpoint:** Composition
- **SRS Refs:** REQ-MAINT-01, REQ-REUSE-01

**Representation:**

Setiap layanan (Company A, Company B, Attendance) mengikuti pola arsitektur berlapis empat lapis yang identik. Aturan ketergantungan antar-lapisan bersifat satu arah dari atas ke bawah.

```
┌─────────────────────────────────────────┐
│               ROUTES LAYER              │
│  - Definisi path HTTP                   │
│  - Penugasan middleware (auth, RBAC)    │
│  - Tidak mengandung logika bisnis       │
└────────────────────┬────────────────────┘
                     │ calls
┌────────────────────▼────────────────────┐
│            CONTROLLERS LAYER            │
│  - Parsing req/res HTTP                 │
│  - Delegasi ke Service Layer            │
│  - Sanitasi output (cegah data leakage) │
└────────────────────┬────────────────────┘
                     │ calls
┌────────────────────▼────────────────────┐
│             SERVICES LAYER              │
│  - Seluruh logika bisnis                │
│  - Kalkulasi status kehadiran           │
│  - Orkestrasi pemanggilan antar-service │
│  - DILARANG bergantung pada MongoDB     │
│    secara langsung                      │
└────────────────────┬────────────────────┘
                     │ calls
┌────────────────────▼────────────────────┐
│           REPOSITORIES LAYER            │
│  - Satu-satunya lapisan yang menyentuh  │
│    MongoDB melalui Mongoose (ODM)       │
│  - Query, insert, update, aggregate     │
└─────────────────────────────────────────┘
```

**More Information:** Lihat DEC-004 untuk keputusan pemilihan pola arsitektur berlapis ini.

---

### 3.4 Logical View — Domain Entity Model

- **ID:** LOG-001
- **Title:** Model Entitas Domain
- **Viewpoint:** Logical
- **SRS Refs:** REQ-FUNC-01, REQ-FUNC-02, REQ-FUNC-03, REQ-MAINT-02

**Representation:**

Berikut adalah entitas-entitas utama dalam sistem beserta atribut dan hubungan antar-entitasnya.

**Employee** *(dikelola oleh Company A/B Service)*

```
Employee {
  _id           : ObjectId        [PK]
  fullName      : String          [required]
  companyId     : String          [required] — identifier perusahaan pemilik
  joinDate      : Date            [required]
  employmentStatus: Enum          [active | inactive | terminated]
  workSchedule  : {
    startTime   : String          — format "HH:mm"
    endTime     : String          — format "HH:mm"
    toleranceMinutes: Number      — toleransi keterlambatan dalam menit
    workDays    : [Number]        — 0=Minggu, 1=Senin, ..., 6=Sabtu
  }
  timezone      : String          [required] — format IANA (contoh: "Asia/Jakarta")
  role          : Enum            [EMPLOYEE | ADMIN_HR]
  passwordHash  : String          [required, NEVER exposed to API response]
}
```

**Attendance** *(dikelola oleh Attendance Service)*

```
Attendance {
  _id           : ObjectId        [PK]
  employeeId    : String          [required, FK → Employee._id]
  companyId     : String          [required] — untuk isolasi query
  date          : Date            [required] — tanggal kehadiran (server-generated)
  checkInTime   : Date            — timestamp server saat check-in
  checkOutTime  : Date            — timestamp server saat check-out (nullable)
  status        : Enum            [on-time | late | absent]
  timezone      : String          — snapshot timezone saat transaksi (immutable)
  workScheduleSnapshot: Object    — snapshot jadwal kerja saat check-in (immutable)
}
```

> **Catatan Desain:** `timezone` dan `workScheduleSnapshot` disimpan sebagai snapshot pada saat transaksi untuk menjamin imutabilitas data historis meskipun data master karyawan berubah di kemudian hari. Ini menjawab REQ-CM-02.

**LeavePermissionRequest** *(dikelola oleh Attendance Service)*

```
LeavePermissionRequest {
  _id           : ObjectId        [PK]
  employeeId    : String          [required, FK → Employee._id]
  companyId     : String          [required]
  type          : Enum            [leave | permission]
  startDate     : Date            [required] — untuk type=leave
  endDate       : Date            [required] — untuk type=leave
  reason        : String          [required untuk type=permission]
  status        : Enum            [pending | approved | rejected]
  approvedBy    : String          — employeeId approver (nullable)
  approvedAt    : Date            — timestamp keputusan (nullable)
  createdAt     : Date            [auto-generated]
}
```

**Hubungan Antar-Entitas:**

```
Employee (Company A/B DB)  ──< Attendance (Attendance DB)
Employee (Company A/B DB)  ──< LeavePermissionRequest (Attendance DB)
```

> Hubungan ini bersifat *logical reference* (via `employeeId` String), bukan *foreign key* relasional, karena data berada di database yang berbeda.

---

### 3.5 Information View — Data Schema & Persistence

- **ID:** INF-001
- **Title:** Skema Data dan Strategi Persistensi MongoDB
- **Viewpoint:** Information
- **SRS Refs:** REQ-MAINT-02, REQ-QOS-05, REQ-INST-02

**Representation:**

Setiap layanan menggunakan database MongoDB yang terisolasi. Mongoose digunakan sebagai ODM untuk menerapkan validasi skema di tingkat aplikasi.

**Database Assignment:**

| Layanan | Database Name | Koleksi Utama |
|---------|--------------|---------------|
| Company A Service | `company_a_db` | `employees` |
| Company B Service | `company_b_db` | `employees` |
| Attendance Service | `attendance_db` | `attendances`, `leave_permission_requests` |

**Indeks Database (dari REQ-QOS-05):**

Lihat Appendix 5.1 untuk strategi indeks lengkap.

**Validasi Skema Mongoose:**

Seluruh koleksi mendefinisikan skema Mongoose yang mencakup tipe data, *required fields*, dan nilai `enum` yang valid. Dokumen yang tidak sesuai skema akan ditolak sebelum mencapai database.

---

### 3.6 Interface View — External REST API

- **ID:** IFC-001
- **Title:** Kontrak REST API Eksternal
- **Viewpoint:** Interface
- **SRS Refs:** §3.1.1, REQ-QOS-01, REQ-QOS-03, REQ-COMP-03

**Representation:**

Seluruh endpoint publik berjalan di bawah prefix `/api/v1/`. Format payload: `application/json`. Autentikasi menggunakan header `Authorization: Bearer <JWT>`.

**Company A/B Service — Employee Management**

| Method | Path | Role | Deskripsi |
|--------|------|------|-----------|
| POST | `/api/v1/employees` | ADMIN_HR | Buat karyawan baru |
| GET | `/api/v1/employees` | ADMIN_HR | Daftar semua karyawan (perusahaan sendiri) |
| GET | `/api/v1/employees/:id` | ADMIN_HR, EMPLOYEE (self) | Detail satu karyawan |
| PUT | `/api/v1/employees/:id` | ADMIN_HR | Perbarui data karyawan |
| DELETE | `/api/v1/employees/:id` | ADMIN_HR | Hapus / nonaktifkan karyawan |
| POST | `/api/v1/auth/login` | Public | Login, mendapat access & refresh token |
| POST | `/api/v1/auth/refresh` | Public | Refresh access token menggunakan refresh token |

> Seluruh response **DILARANG** menyertakan `passwordHash` atau field internal sistem. Controller wajib melakukan sanitasi output sebelum merespons klien (REQ-QOS-01).

**Attendance Service — Attendance & Leave**

| Method | Path | Role | Deskripsi |
|--------|------|------|-----------|
| POST | `/api/v1/attendance/check-in` | EMPLOYEE | Rekam check-in |
| POST | `/api/v1/attendance/check-out` | EMPLOYEE | Rekam check-out |
| GET | `/api/v1/attendance/report` | ADMIN_HR | Laporan rekapitulasi (filter: employeeId, dateFrom, dateTo) |
| POST | `/api/v1/leave` | EMPLOYEE | Ajukan cuti |
| POST | `/api/v1/permission` | EMPLOYEE | Ajukan izin |
| GET | `/api/v1/requests` | ADMIN_HR | Daftar pengajuan (filter status, tanggal) |
| PATCH | `/api/v1/requests/:id/approve` | ADMIN_HR | Setujui pengajuan |
| PATCH | `/api/v1/requests/:id/reject` | ADMIN_HR | Tolak pengajuan |

**Struktur Response Error (konsisten di seluruh layanan):**

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Deskripsi error yang jelas",
  "details": []
}
```

HTTP status code yang digunakan: `200`, `201`, `400`, `401`, `403`, `404`, `409`, `500`.

---

### 3.7 Interface View — Internal Inter-Service API

- **ID:** IFC-002
- **Title:** Kontrak API Internal Antar-Layanan
- **Viewpoint:** Interface
- **SRS Refs:** REQ-DIST-02, REQ-QOS-02

**Representation:**

Attendance Service memanggil Company Service melalui endpoint internal khusus yang **hanya dapat diakses oleh role `SYSTEM`** dan tidak terekspos melalui API Gateway ke klien publik.

**Endpoint Internal Company A/B Service:**

| Method | Path | Caller | Deskripsi |
|--------|------|--------|-----------|
| GET | `/api/v1/internal/employees/:employeeId/status` | Attendance Service | Validasi identitas, role, dan kepemilikan perusahaan karyawan |

**Request Header (dari Attendance Service):**

```
Authorization: Bearer <SYSTEM_JWT>
X-Internal-Service: attendance-service
```

**Response (200 OK):**

```json
{
  "employeeId": "string",
  "companyId": "string",
  "role": "EMPLOYEE | ADMIN_HR",
  "employmentStatus": "active | inactive | terminated",
  "timezone": "Asia/Jakarta",
  "workSchedule": {
    "startTime": "08:00",
    "endTime": "17:00",
    "toleranceMinutes": 15,
    "workDays": [1, 2, 3, 4, 5]
  }
}
```

> Attendance Service **DILARANG** memproses transaksi check-in sebelum mendapatkan response sukses dari endpoint ini. Lihat DEC-001 dan INT-001.

---

### 3.8 Interaction View — Check-in Flow

- **ID:** INT-001
- **Title:** Alur Interaksi Check-in Karyawan
- **Viewpoint:** Interaction
- **SRS Refs:** REQ-FUNC-03, REQ-QOS-02, REQ-PORT-01, REQ-DIST-02

**Representation:**

```
Client          API Gateway     Attendance Svc    Company Svc      Attendance DB
  |                  |                |                |                |
  |-- POST /check-in -->              |                |                |
  |                  |-- forward ---> |                |                |
  |                  |               |-- GET /internal/employees/:id -->|
  |                  |               |                |<-- 200 + data --|
  |                  |               |                |                |
  |                  |               | [validasi: karyawan aktif?]      |
  |                  |               | [hitung timestamp server]        |
  |                  |               | [konversi ke timezone karyawan]  |
  |                  |               | [derivasi status: on-time/late]  |
  |                  |               |-- insert Attendance doc -------> |
  |                  |               |                |         <-- OK --|
  |                  |<-- 201 -----  |                |                |
  |<-- 201 ----------|               |                |                |
```

**Happy Path:** Karyawan aktif, check-in di hari kerja, Company Service dapat dijangkau.

**Failure Paths:**

| Kondisi | HTTP Response |
|---------|--------------|
| Company Service tidak dapat dijangkau | 503 Service Unavailable |
| Karyawan tidak ditemukan / tidak aktif | 404 / 403 |
| Karyawan sudah check-in hari ini | 409 Conflict |
| Bukan hari kerja | 400 Bad Request |

---

### 3.9 Interaction View — Leave/Permission Approval Flow

- **ID:** INT-002
- **Title:** Alur Persetujuan Cuti / Izin
- **Viewpoint:** Interaction
- **SRS Refs:** REQ-FUNC-02, REQ-CM-01

**Representation:**

```
Employee         Attendance Svc       Attendance DB       Admin/Approver
   |                   |                   |                    |
   |-- POST /leave --> |                   |                    |
   |                   |-- insert (status=pending) -----------> |
   |<-- 201 created -- |                   |                    |
   |                   |                   |                    |
   |                   |                   | <-- PATCH /approve |
   |                   |-- validate: status=pending? --------> |
   |                   |-- update status=approved -----------> |
   |                   |   (catat approvedBy, approvedAt)      |
   |                   |<-- 200 OK                             |
```

**Aturan Transisi Status (dari REQ-CM-01):**

Transisi status bersifat satu arah dan tidak dapat dibalik. Sistem menolak permintaan yang mencoba membalik status ke `pending` dengan HTTP `409 Conflict`.

Lihat STT-001 untuk detail state machine.

---

### 3.10 State Dynamics View — Leave/Permission Request State Machine

- **ID:** STT-001
- **Title:** State Machine Status Pengajuan Cuti/Izin
- **Viewpoint:** State Dynamics
- **SRS Refs:** REQ-CM-01

**Representation:**

```
             [Karyawan Mengajukan]
                      |
                      v
               ┌─────────────┐
               │   PENDING   │ ◄─── Status awal setelah pengajuan
               └──────┬──────┘
                      │
           ┌──────────┴──────────┐
           │                     │
    [Approver: Setuju]   [Approver: Tolak]
           │                     │
           v                     v
     ┌──────────┐          ┌──────────┐
     │ APPROVED │          │ REJECTED │
     └──────────┘          └──────────┘
```

**State Transition Table:**

| Status Awal | Event | Status Akhir | Syarat | HTTP Error jika Invalid |
|-------------|-------|-------------|--------|------------------------|
| `pending` | approve | `approved` | Pelaku adalah ADMIN_HR | — |
| `pending` | reject | `rejected` | Pelaku adalah ADMIN_HR | — |
| `approved` | approve / reject | *(ditolak)* | — | 409 Conflict |
| `rejected` | approve / reject | *(ditolak)* | — | 409 Conflict |

Seluruh tindakan persetujuan yang berhasil maupun yang ditolak **WAJIB** dicatat dalam log operasional untuk keperluan jejak audit (REQ-QOS-04).

---

### 3.11 Deployment View — Topology

- **ID:** DEP-001
- **Title:** Topologi Deployment Multi-Layanan
- **Viewpoint:** Deployment
- **SRS Refs:** REQ-DIST-01, REQ-INST-01, REQ-INST-02, REQ-BUILD-01

**Representation:**

```
INTERNET
    |
    v
+--------------------+
|    API Gateway     |  ← Satu-satunya entry point publik
|  (GCP API Gateway) |
+--+--+----------+---+
   |  |          |
   |  |          |
   v  |          v
+-----+----+     +------------------+     +-------------------+
| Company  |     |  Company B Svc   |     |  Attendance Svc   |
| A Svc    |     |  (Cloud Run /    |     |  (Cloud Run /     |
|(Cloud Run)|     |   Node.js proc) |     |   Node.js proc)   |
+-----+----+     +--------+---------+     +--------+----------+
      |                   |                        |
      v                   v                        v
+----------+       +----------+            +----------+
|Company A |       |Company B |            |Attendance|
|   DB     |       |   DB     |            |    DB    |
|(MongoDB) |       |(MongoDB) |            |(MongoDB) |
+----------+       +----------+            +----------+
```

**Route Mapping di API Gateway:**

| Path Prefix | Target Service |
|-------------|---------------|
| `/company-a/*` | Company A Service |
| `/company-b/*` | Company B Service |
| `/attendance/*` | Attendance Service |

**Trade-off:** Penambahan API Gateway menambah satu *network hop* yang meningkatkan latensi per request. Namun keuntungannya berupa penyembunyian topologi internal, sentralisasi manajemen akses, dan kemudahan routing melebihi kerugian latensi tersebut (REQ-DIST-01, DEC-005).

---

### 3.12 Algorithm View — Attendance Status Derivation

- **ID:** ALG-001
- **Title:** Algoritma Derivasi Status Kehadiran
- **Viewpoint:** Algorithm
- **SRS Refs:** REQ-FUNC-03, REQ-PORT-01, REQ-CM-02

**Representation:**

Algoritma berikut dieksekusi di **Services Layer** Attendance Service saat memproses check-in.

```
FUNCTION deriveAttendanceStatus(employeeId, rawCheckInTimestamp):

  1. Ambil data karyawan dari Company Service:
       employeeData = callCompanyService(employeeId)
       // Berisi: timezone, workSchedule, employmentStatus

  2. Validasi prasyarat:
       IF employeeData.employmentStatus != "active" THEN
         THROW ForbiddenError("Karyawan tidak aktif")

  3. Hasilkan server-side timestamp (DILARANG menggunakan timestamp dari klien):
       serverTimestamp = Date.now()  // UTC

  4. Konversi ke timezone karyawan:
       localTime = convertToTimezone(serverTimestamp, employeeData.timezone)
       // Menggunakan format IANA, contoh: "Asia/Jakarta"

  5. Cek apakah hari ini adalah hari kerja:
       dayOfWeek = localTime.dayOfWeek()
       IF dayOfWeek NOT IN employeeData.workSchedule.workDays THEN
         THROW BadRequestError("Bukan hari kerja")

  6. Hitung batas waktu tepat waktu:
       scheduledStart = parseTime(employeeData.workSchedule.startTime, localDate, timezone)
       deadline = scheduledStart + employeeData.workSchedule.toleranceMinutes (menit)

  7. Derivasi status:
       IF localTime <= deadline THEN
         status = "on-time"
       ELSE
         status = "late"

  8. Simpan rekaman kehadiran (dengan snapshot jadwal dan timezone):
       save Attendance {
         employeeId, companyId, date: localDate,
         checkInTime: serverTimestamp,
         status: status,
         timezone: employeeData.timezone,            // snapshot — immutable
         workScheduleSnapshot: employeeData.workSchedule  // snapshot — immutable
       }

  9. RETURN status
```

**Edge Case — Lupa Check-out:**

Jika karyawan tidak melakukan check-out pada hari yang sama, sistem mencatat `checkOutTime = null`. Laporan akan menampilkan status check-out sebagai "tidak tercatat". Data historis tidak dimodifikasi retroaktif. Lihat Appendix 5.3.

---

### 3.13 Algorithm View — Report Aggregation

- **ID:** ALG-002
- **Title:** Algoritma Agregasi Laporan Kehadiran
- **Viewpoint:** Algorithm
- **SRS Refs:** REQ-FUNC-05, REQ-QOS-05, REQ-POC-02

**Representation:**

Laporan rekapitulasi diproses menggunakan **MongoDB Aggregation Pipeline** di tingkat database (bukan di tingkat aplikasi Node.js) untuk efisiensi memori dan latensi.

```
FUNCTION generateAttendanceReport(employeeId, dateFrom, dateTo):

  1. Bangun filter query:
       match = {
         employeeId: employeeId,
         date: { $gte: dateFrom, $lte: dateTo }
       }
       // Index pada (employeeId, date) memastikan query efisien

  2. Jalankan MongoDB Aggregation Pipeline:
       pipeline = [
         { $match: match },
         { $group: {
             _id: null,
             totalOnTime:  { $sum: { $cond: [{ $eq: ["$status","on-time"] }, 1, 0] } },
             totalLate:    { $sum: { $cond: [{ $eq: ["$status","late"]    }, 1, 0] } },
             totalAbsent:  { $sum: { $cond: [{ $eq: ["$status","absent"]  }, 1, 0] } },
             totalRecords: { $sum: 1 }
         }},
         { $lookup: {
             from: "leave_permission_requests",
             pipeline: [
               { $match: { employeeId, startDate: {$gte: dateFrom}, endDate: {$lte: dateTo} } },
               { $group: {
                   _id: "$status",
                   count: { $sum: 1 }
               }}
             ],
             as: "leaveStats"
         }}
       ]

  3. Kembalikan hasil agregasi (KPI: < 3 detik untuk rentang 1 bulan)

  4. RETURN {
       totalOnTime, totalLate, totalAbsent,
       totalLeaveApproved, totalLeaveRejected, totalLeavePending,
       totalPermissionApproved, totalPermissionRejected, totalPermissionPending
     }
```

**Rasional Pemilihan Agregasi Database:** Lihat DEC-002.

---

### 3.14 Interface View — Authentication & Authorization Design

- **ID:** SEC-001
- **Title:** Desain Autentikasi JWT dan Otorisasi RBAC
- **Viewpoint:** Interface (Security Pattern)
- **SRS Refs:** REQ-QOS-01, REQ-QOS-02, REQ-REUSE-01

**Representation:**

**Autentikasi — JWT Middleware (dapat digunakan ulang di seluruh Routes):**

```
  6. Jika gagal: respons 401 Unauthorized

**Autentikasi — Refresh Token:**

Sistem menggunakan strategi dual-token untuk menyeimbangkan keamanan dan UX:
1. **Access Token**: Berumur pendek (1 jam), digunakan untuk setiap request API.
2. **Refresh Token**: Berumur panjang (7 hari), hanya digunakan untuk mendapatkan access token baru. Implementasi saat ini bersifat stateless menggunakan JWT dengan secret terpisah.

**Rate Limiting — Brute Force Protection:**

Sistem menerapkan pembatasan jumlah permintaan untuk mencegah serangan brute force dan abuse:
1. **Gateway Level (Nginx)**: 10 req/s dengan burst 20 untuk seluruh trafik API.
2. **Service Level (Login)**: Khusus endpoint `/login` dibatasi 5 percobaan per 15 menit per IP menggunakan `express-rate-limit`.
```

**Otorisasi — RBAC Middleware (dikonfigurasi per route):**

```
MIDDLEWARE authorizeRoles(...allowedRoles):
  1. Periksa req.user.role apakah termasuk dalam allowedRoles
  2. Jika YA: panggil next()
  3. Jika TIDAK: respons 403 Forbidden

// Contoh penggunaan di Routes Layer:
router.patch('/requests/:id/approve',
  authenticateJWT,
  authorizeRoles('ADMIN_HR'),
  requestController.approve
)
```

**Proteksi IDOR:**

Controllers wajib memvalidasi bahwa `req.user.companyId` sesuai dengan `companyId` pada resource yang diakses sebelum melakukan operasi apapun.

**Internal Service Authentication:**

Attendance Service menggunakan JWT bertanda `role: SYSTEM_ACTOR` saat memanggil endpoint internal Company Service. Endpoint `/internal/*` dikonfigurasi dengan `authorizeRoles('SYSTEM_ACTOR')` dan tidak terekspos ke API Gateway.

---

### 3.15 Composition View — Configuration Design

- **ID:** CNF-001
- **Title:** Desain Konfigurasi Berbasis Variabel Lingkungan
- **Viewpoint:** Composition
- **SRS Refs:** REQ-BUILD-02, REQ-INST-01, REQ-BUILD-01

**Representation:**

Seluruh nilai konfigurasi sensitif dan spesifik lingkungan **WAJIB** dikelola melalui variabel lingkungan. Nilai *hardcoded* di kode sumber **DILARANG** (termasuk `JWT_SECRET`, URL database, dan URL antar-layanan).

Setiap layanan menyediakan file `.env.example` yang mendokumentasikan seluruh variabel yang diperlukan tanpa mengekspos nilai sesungguhnya.

Sistem **DILARANG** berjalan jika variabel lingkungan wajib tidak terdefinisi — validasi dilakukan saat *startup* dengan melempar error eksplisit.

Lihat Appendix 5.2 untuk daftar lengkap variabel lingkungan per layanan.

---

## 4. Decisions

---

### 4.1 DEC-001 — Synchronous REST for Inter-Service Communication

- **ID:** DEC-001
- **Title:** REST Sinkronus sebagai Mekanisme Komunikasi Antar-Layanan
- **Context:** Attendance Service perlu memvalidasi identitas karyawan secara real-time saat check-in. Diperlukan keputusan apakah menggunakan komunikasi sinkronus (REST HTTP) atau asinkronus (message broker seperti Kafka/RabbitMQ). (REQ-POC-01, REQ-DIST-02)
- **Options:**
  - *Option A:* REST HTTP sinkronus — Attendance Service memanggil Company Service secara langsung dan menunggu response.
  - *Option B:* Message broker asinkronus (Kafka/RabbitMQ) — validasi melalui event/queue.
- **Outcome:** Dipilih **Option A: REST HTTP sinkronus**, karena validasi identitas bersifat real-time dan blocking (check-in tidak boleh diproses sebelum identitas terverifikasi). Penggunaan message broker akan menambah kompleksitas infrastruktur yang tidak proporsional untuk skala proyek ini.
- **Trade-off yang Diakui:** Setiap transaksi check-in menambah latensi sebesar waktu round-trip ke Company Service. Jika Company Service tidak tersedia, Attendance Service tidak dapat memproses check-in (tight coupling pada availability).
- **More Information:** REQ-DIST-02, REQ-POC-01.

---

### 4.2 DEC-002 — Database-Level Aggregation for Reporting

- **ID:** DEC-002
- **Title:** MongoDB Aggregation Pipeline sebagai Pendekatan Pelaporan
- **Context:** Laporan rekapitulasi kehadiran berpotensi melibatkan volume data besar. Diperlukan keputusan apakah komputasi dilakukan di tingkat database atau di tingkat aplikasi Node.js. (REQ-POC-02, REQ-FUNC-05)
- **Options:**
  - *Option A:* MongoDB Aggregation Pipeline — komputasi di sisi database.
  - *Option B:* Aplikasi-level calculation — tarik semua raw data ke Node.js, hitung di memori.
- **Outcome:** Dipilih **Option A: MongoDB Aggregation Pipeline**, karena komputasi dilakukan di sisi database sehingga lebih hemat memori dan mengurangi data transfer antara database dan aplikasi.
- **Trade-off yang Diakui:** Pipeline aggregation yang kompleks lebih sulit di-debug dibanding kode JavaScript biasa. Namun keuntungan performa dan memori signifikan untuk data berskala besar.
- **KPI:** Waktu pembuatan laporan < 3 detik untuk rentang satu bulan, dengan dukungan indeks pada field `employeeId` dan `date`.
- **More Information:** REQ-POC-02, ALG-002.

---

### 4.3 DEC-003 — Isolated MongoDB Database Per Service

- **ID:** DEC-003
- **Title:** Isolasi Database MongoDB Per Layanan
- **Context:** Sistem harus menjamin privasi data karyawan antar-perusahaan. Diperlukan keputusan strategi isolasi data di tingkat persistence. (§2.3, REQ-INST-02)
- **Options:**
  - *Option A:* Database terpisah per layanan — setiap layanan memiliki database MongoDB eksklusif.
  - *Option B:* Shared database dengan collection berbeda — satu MongoDB instance, collection dipisahkan per perusahaan.
  - *Option C:* Shared database dengan field `companyId` sebagai discriminator.
- **Outcome:** Dipilih **Option A: Database terpisah per layanan**. Ini adalah satu-satunya pendekatan yang menjamin isolasi penuh di tingkat infrastruktur — tidak ada kemungkinan query accidental lintas perusahaan.
- **Implementation Note (2026-04-05):** Implementasi aktual menggunakan satu MongoDB instance dengan database names berbeda per service (`company_a_db`, `company_b_db`, `attendance_db`). Pendekatan ini mencapai intent yang sama dengan Option A (isolasi per service) dengan biaya infrastruktur lebih rendah. Lihat ADI-001 untuk detail evaluasi.
- **Trade-off yang Diakui:** Biaya operasional lebih tinggi karena mengelola tiga instance/database MongoDB. Namun isolasi yang tidak bisa dikompromikan adalah syarat utama sistem ini.
- **More Information:** REQ-INST-02, CMP-001, INF-001.

---

### 4.4 DEC-004 — Layered Architecture

- **ID:** DEC-004
- **Title:** Arsitektur Berlapis (Routes → Controllers → Services → Repositories)
- **Context:** Sistem membutuhkan struktur kode yang mudah diuji, dipelihara, dan konsisten di seluruh tiga layanan. (REQ-MAINT-01)
- **Options:**
  - *Option A:* Arsitektur berlapis empat lapis — Routes, Controllers, Services, Repositories.
  - *Option B:* MVC klasik — Model, View (tidak relevan untuk API), Controller.
  - *Option C:* Flat structure — semua logika di route handler.
- **Outcome:** Dipilih **Option A: Arsitektur berlapis empat lapis**. Pemisahan tanggung jawab yang tegas memudahkan pengujian unit (Services dapat diuji tanpa HTTP layer), mencegah logika bisnis bocor ke Controllers, dan memastikan satu-satunya titik interaksi dengan database adalah Repositories.
- **Trade-off yang Diakui:** Boilerplate kode lebih banyak dibanding *flat structure*. Namun keuntungan testability dan maintainability jangka panjang melebihi biaya tambahan ini.
- **More Information:** REQ-MAINT-01, REQ-REUSE-01, CMP-002.

---

### 4.5 DEC-005 — API Gateway as Single Public Entry Point

- **ID:** DEC-005
- **Title:** API Gateway sebagai Satu-satunya Titik Masuk Publik
- **Context:** Sistem terdiri dari tiga layanan yang berjalan di port/URL berbeda. Klien tidak boleh mengetahui topologi internal sistem. (REQ-DIST-01)
- **Options:**
  - *Option A:* API Gateway (GCP API Gateway + Cloud Run) — satu entry point, routing berbasis path.
  - *Option B:* Klien langsung mengakses setiap layanan — tanpa API Gateway.
- **Outcome:** Dipilih **Option A: API Gateway**. Menyembunyikan topologi internal, menyederhanakan manajemen autentikasi awal, dan memungkinkan scaling independen per layanan.
- **Trade-off yang Diakui:** Penambahan satu network hop meningkatkan latensi. Konfigurasi API Gateway perlu didokumentasikan dengan cermat. Trade-off ini dianggap dapat diterima.
- **More Information:** REQ-DIST-01, DEP-001.

---

### 4.6 DEC-008 — Tenant-Aware Company Service URL Selection (Attendance)

- **ID:** DEC-008
- **Title:** Pemilihan Endpoint Company Service Berdasarkan CompanyId di Attendance Service
- **Context:** Attendance Service perlu memanggil Company A Service atau Company B Service untuk validasi identitas karyawan secara real-time. Saat dijalankan di Cloud Run, Company A dan Company B berada pada base URL yang berbeda. Diperlukan keputusan bagaimana Attendance menentukan target Company Service yang tepat. (REQ-DIST-02, REQ-INST-01)
- **Options:**
  - *Option A:* Tenant-aware routing di Attendance Service — Attendance memilih base URL berdasarkan `companyId` menggunakan variabel lingkungan `COMPANY_A_SERVICE_URL` dan `COMPANY_B_SERVICE_URL`.
  - *Option B:* Single `COMPANY_SERVICE_URL` + routing infrastruktur — Attendance selalu memanggil satu URL dan infrastruktur melakukan routing berdasarkan header seperti `X-Company-ID`.
- **Outcome:** Dipilih **Option A: Tenant-aware routing di Attendance Service**. Alasan: mengurangi kompleksitas infrastruktur, menghindari ketergantungan pada konfigurasi routing header yang tidak selalu tersedia di API Gateway, serta tetap mempertahankan komunikasi REST sinkronus yang eksplisit dan mudah diuji.
- **Trade-off yang Diakui:** Konfigurasi environment menjadi lebih banyak dan risiko salah-konfigurasi meningkat (mis-route antar Company A/B). Mitigasi: penamaan variabel yang eksplisit (`COMPANY_A_SERVICE_URL`, `COMPANY_B_SERVICE_URL`) dan verifikasi deployment melalui smoke test.
- **More Information:** DEC-001, REQ-DIST-02, CNF-001.

---

### 4.7 DEC-006 — Server-Side Timestamp for Attendance

- **ID:** DEC-006
- **Title:** Server-Side Timestamp untuk Kalkulasi Kehadiran
- **Context:** Kalkulasi status kehadiran (tepat waktu/terlambat) harus akurat dan tidak dapat dimanipulasi oleh klien. (REQ-PORT-01)
- **Options:**
  - *Option A:* Server-side timestamp — timestamp dihasilkan oleh server Attendance Service.
  - *Option B:* Client-side timestamp — timestamp dikirim oleh klien dalam request body.
- **Outcome:** Dipilih **Option A: Server-side timestamp**. Timestamp dari klien dapat dimanipulasi dengan mudah, membuka celah kecurangan absensi. Server selalu menjadi sumber kebenaran waktu.
- **Implementation Note (2026-04-05):** Untuk menjamin keakuratan antar-layanan, sistem menggunakan sinkronisasi jam berbasis **NTP** di level host, yang diteruskan ke seluruh kontainer melalui mounting `/etc/localtime` dan pengaturan variabel lingkungan `TZ=Asia/Jakarta`. (REQ-PORT-01)
- **Trade-off yang Diakui:** Jika terjadi clock skew pada server, kalkulasi bisa tidak akurat. Mitigasi: sinkronisasi jam di level infrastruktur.
- **More Information:** REQ-PORT-01, ALG-001.

---

### 4.8 DEC-007 — Stateless Refresh Token Strategy

- **ID:** DEC-007
- **Title:** Strategi Refresh Token Stateless via JWT
- **Context:** Sistem membutuhkan mekanisme untuk memperpanjang sesi tanpa memaksa user login ulang sering-sering. (SEC-001)
- **Options:**
  - *Option A:* Database-backed Refresh Token — token disimpan di DB, bisa di-revoke secara granular.
  - *Option B:* Stateless JWT Refresh Token — token tidak disimpan di DB, validasi hanya via signature.
- **Outcome:** Dipilih **Option B: Stateless JWT Refresh Token**. Alasan: menjaga kesederhanaan infrastruktur sesuai preferensi pengembang (tidak butuh Redis/tabel tambahan) dan tetap aman karena menggunakan secret key yang berbeda dari Access Token.
- **Trade-off yang Diakui:** Token tidak bisa di-revoke secara individu sebelum masa berlakunya habis (kecuali dengan mengganti Global Secret). Namun untuk skala awal, ini dianggap cukup.
- **More Information:** SEC-001.

---

## 5. Appendixes

### 5.1 MongoDB Index Strategy

Indeks berikut WAJIB didefinisikan dan didokumentasikan sebagai bagian dari skema Mongoose (REQ-QOS-05).

**Koleksi `employees` (Company A/B DB):**

| Field(s) | Tipe Indeks | Alasan |
|----------|------------|--------|
| `_id` | Default | Pencarian karyawan by ID |
| `companyId` | Single | Filter per perusahaan |
| `employmentStatus` | Single | Filter karyawan aktif |

**Koleksi `attendances` (Attendance DB):**

| Field(s) | Tipe Indeks | Alasan |
|----------|------------|--------|
| `employeeId` | Single | Pencarian per karyawan |
| `employeeId, date` | Compound | Query laporan (filter karyawan + tanggal) |
| `companyId, date` | Compound | Query laporan per perusahaan |
| `status` | Single | Filter status kehadiran |

**Koleksi `leave_permission_requests` (Attendance DB):**

| Field(s) | Tipe Indeks | Alasan |
|----------|------------|--------|
| `employeeId` | Single | Pencarian per karyawan |
| `employeeId, startDate, endDate` | Compound | Query pengajuan per periode |
| `status` | Single | Filter status persetujuan |
| `companyId, status` | Compound | Query approver per perusahaan |

### 5.2 Environment Variable Reference

Setiap layanan menyediakan `.env.example` dengan variabel-variabel berikut:

**Company A Service & Company B Service:**

| Variable | Deskripsi | Wajib |
|----------|-----------|-------|
| `PORT` | Port HTTP layanan | Ya |
| `MONGODB_URI` | Connection string MongoDB eksklusif layanan ini | Ya |
| `JWT_SECRET` | Secret key untuk signing dan verifikasi JWT (Access Token) | Ya |
| `REFRESH_TOKEN_SECRET` | Secret key untuk signing dan verifikasi Refresh Token | Ya |
| `COMPANY_ID` | Identifier unik perusahaan (A atau B) | Ya |

**Attendance Service:**

| Variable | Deskripsi | Wajib |
|----------|-----------|-------|
| `PORT` | Port HTTP layanan | Ya |
| `MONGODB_URI` | Connection string Attendance DB | Ya |
| `JWT_SECRET` | Secret key JWT untuk user karyawan/admin | Ya |
| `COMPANY_A_SERVICE_URL` | Base URL internal untuk Company A Service | Ya |
| `COMPANY_B_SERVICE_URL` | Base URL internal untuk Company B Service | Ya |
| `COMPANY_SERVICE_URL` | Fallback base URL untuk kompatibilitas (jika `COMPANY_A_SERVICE_URL` / `COMPANY_B_SERVICE_URL` tidak di-set) | Tidak |
| `SYSTEM_JWT_SECRET` | Secret untuk signing token inter-service (role SYSTEM_ACTOR) | Ya |

Sistem DILARANG berjalan jika salah satu variabel wajib di atas tidak terdefinisi. Validasi dilakukan saat startup.

### 5.3 Edge Case Handling

| Edge Case | Penanganan yang Dirancang |
|-----------|--------------------------|
| Karyawan lupa check-out | `checkOutTime` disimpan sebagai `null`. Tidak ada modifikasi retroaktif. Laporan menampilkan "-" untuk kolom check-out. |
| Check-in di hari libur / bukan hari kerja | Ditolak dengan `400 Bad Request` berdasarkan `workSchedule.workDays`. |
| Company Service tidak tersedia saat check-in | Attendance Service merespons `503 Service Unavailable`. Check-in tidak diproses. |
| Karyawan check-in dua kali dalam satu hari | Ditolak dengan `409 Conflict`. |
| Perubahan jadwal kerja karyawan | Hanya berlaku untuk transaksi masa mendatang. Data historis menggunakan `workScheduleSnapshot` yang sudah disimpan dan bersifat immutable. |
| Pengajuan cuti dengan rentang tanggal overlapping | Sistem memeriksa konflik dengan pengajuan yang sudah `approved` untuk karyawan yang sama. |
| Token Access JWT kedaluwarsa | Middleware merespons `401 Unauthorized` dengan pesan `"Token expired"`. User diarahkan memanggil `/refresh`. |
| Serangan Brute Force Login | Dibatasi oleh Rate Limiter (429 Too Many Requests) setelah 5 percobaan dalam 15 menit. |
| Jam antar kontainer tidak sinkron | Dimigitasi dengan sinkronisasi jam host via `/etc/localtime` mnt. |

### 5.4 Load Testing Plan

Sesuai §4 SRS, load testing WAJIB dilakukan pada minimal satu endpoint kritis.

**Target Endpoint yang Direkomendasikan:**

| Endpoint | Alasan Prioritas |
|----------|-----------------|
| `POST /attendance/check-in` | Melibatkan inter-service call + DB write — jalur paling kompleks |
| `GET /attendance/report` | Melibatkan aggregation pipeline — jalur paling berat dari sisi DB |

**Komponen Wajib dalam Dokumentasi Hasil:**

1. **Alat pengujian** — nama dan versi (contoh: k6 v0.49, Artillery v2.x)
2. **Skenario** — deskripsi skenario yang dijalankan
3. **Konkurensi / volume** — jumlah virtual users dan durasi
4. **Hasil yang diamati** — p50, p95, p99 latency; throughput (req/s); error rate
5. **Bottleneck yang teridentifikasi** — komponen atau query yang menjadi titik kemacetan
6. **Analisis perbaikan** — usulan konkret (contoh: tambah indeks, caching, connection pooling)

**KPI Referensi (dari REQ-POC-02):** Laporan bulanan harus selesai < 3 detik.

---

## 6. Implementation Notes

> **Catatan:** Bagian ini mendokumentasikan deviasi antara desain dalam SDD dan implementasi aktual. Deviasi ini merupakan penyesuaian yang disadari dan telah dianalisis sebelum implementasi.

### 6.1 ADI-001 — Implementation Deviation Record

| ID | Deskripsi | SDD Original | Implementasi Aktual | Alasan Deviasi |
|----|-----------|--------------|---------------------|----------------|
| ADI-001 | Role name untuk inter-service | `SYSTEM` | `SYSTEM_ACTOR` | Menghindari konflik dengan role `SYSTEM` yang mungkin digunakan sistem lain. Nama `SYSTEM_ACTOR` lebih eksplisit menunjukkan bahwa ini adalah service actor. |
| ADI-002 | Env variable URL Company Service | `COMPANY_A_SERVICE_URL` + `COMPANY_B_SERVICE_URL` | `COMPANY_SERVICE_URL` tunggal dengan routing via `X-Company-ID` | Menyederhanakan konfigurasi. Satu endpoint Company Service (yang di-deploy dengan COMPANY_ID berbeda) dapat menangani request dari Attendance Service dengan memilih service target berdasarkan header. |
| ADI-003 | Header untuk routing antar-service | `X-Internal-Service: attendance-service` | `X-Company-ID: {companyId}` | Header `X-Company-ID` lebih sesuai karena Attendance Service perlu menentukan ingin mengakses data perusahaan mana (Company A atau B). |

### 6.2 Rasional Deviasi

#### ADI-001: SYSTEM_ACTOR Role
SDD mendefinisikan role `SYSTEM` untuk inter-service communication. Namun, implementasi menggunakan `SYSTEM_ACTOR` karena:
- `SYSTEM` terlalu generik dan dapat bentrok dengan reserved keywords di library lain
- `SYSTEM_ACTOR` lebih eksplisit menunjukkan bahwa ini adalah service account yang bertindak atas nama sistem
- Semua referensi kode telah menggunakan `SYSTEM_ACTOR`

#### ADI-002: Company Service URL Strategy
SDD mendefinisikan dua variabel URL terpisah untuk Company A dan B. Implementasi menggunakan satu variabel `COMPANY_SERVICE_URL` dengan pertimbangan:
- Company Service dijalankan dengan environment variable `COMPANY_ID` yang berbeda (A atau B)
- Request dari Attendance Service menyertakan header `X-Company-ID` untuk memilih service target
- Konfigurasi lebih sederhana: hanya perlu satu URL instead of managing two separate URLs

#### ADI-003: Internal Header Convention
Perubahan dari `X-Internal-Service` ke `X-Company-ID` karena:
- Attendance Service perlu mengetahui perusahaan mana yang menjadi target validasi
- Header `X-Company-ID` lebih intuitif dan sesuai dengan business domain
- Tidak ada kebutuhan untuk mengidentifikasi service mana yang memanggil, yang penting adalah company ID
