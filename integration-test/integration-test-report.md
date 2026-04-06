# API Test Report

**Tanggal Eksekusi:** 6 April 2026, 15:20:45 — 15:20:49 WIB
**Durasi Total:** 4.059 detik
**Tool:** Postman Newman

---

## Ringkasan Eksekusi

| Metrik | Total | Passed | Failed |
|---|---|---|---|
| Requests | 17 | 17 | 0 |
| Tests | 17 | 17 | 0 |
| Assertions | 34 | 34 | 0 |
| Scripts | 22 | 22 | 0 |

> ✅ **Semua test berhasil.** Tidak ada kegagalan yang ditemukan.

---

## Performa Response

| Metrik | Nilai |
|---|---|
| Rata-rata | 27.5 ms |
| Minimum | 8 ms |
| Maksimum | 132 ms |

---

## Detail Hasil per Request

### 🔐 Auth (2 requests)

| No | Nama Request | Method | Status Code | Response Time | Hasil |
|---|---|---|---|---|---|
| 1 | Login and get JWT token | POST | 200 | 132 ms | ✅ PASS |
| 2 | Refresh access token | POST | 200 | 8 ms | ✅ PASS |

### 👥 Employees (6 requests)

| No | Nama Request | Method | Status Code | Response Time | Hasil |
|---|---|---|---|---|---|
| 1 | Create a new employee | POST | 201 | 72 ms | ✅ PASS |
| 2 | List employees | GET | 200 | 14 ms | ✅ PASS |
| 3 | Update employee's data | PUT | 200 | 14 ms | ✅ PASS |
| 4 | Retrieve employee details | GET | 200 | 8 ms | ✅ PASS |
| 5 | Delete an employee (soft delete) | DELETE | 200 | 12 ms | ✅ PASS |
| 6 | Deactivate an employee | PATCH | 409 | 8 ms | ✅ PASS |

> **Catatan:** Request "Deactivate an employee" mengembalikan HTTP 409 (Conflict) karena employee sudah dalam kondisi tidak aktif. Hal ini merupakan perilaku yang diharapkan dan test assertion tetap lulus.

### 📋 Attendance (4 requests)

| No | Nama Request | Method | Status Code | Response Time | Hasil |
|---|---|---|---|---|---|
| 1 | Employee Check-In | POST | 200 | 77 ms | ✅ PASS |
| 2 | Employee Check-out | POST | 200 | 15 ms | ✅ PASS |
| 3 | List Attendance Records | GET | 200 | 9 ms | ✅ PASS |
| 4 | Get Attendance Report | GET | 200 | 25 ms | ✅ PASS |

### 🏖️ Leave Permission (5 requests)

| No | Nama Request | Method | Status Code | Response Time | Hasil |
|---|---|---|---|---|---|
| 1 | Submit Leave Request | POST | 201 | 30 ms | ✅ PASS |
| 2 | Submit Permission Request | POST | 201 | 13 ms | ✅ PASS |
| 3 | Get Leave/Permission Requests | GET | 200 | 9 ms | ✅ PASS |
| 4 | Approve Leave/Permission Request | PATCH | 200 | 12 ms | ✅ PASS |
| 5 | Reject Leave/Permission Request | PATCH | 200 | 9 ms | ✅ PASS |

---

## Kesimpulan

Seluruh **17 request** API berhasil dijalankan dan semua **34 assertion** lulus tanpa kegagalan. Performa sistem sangat baik dengan rata-rata response time **27.5 ms**. Sistem siap untuk tahap berikutnya.