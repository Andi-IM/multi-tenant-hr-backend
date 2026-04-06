# Load Test Report - Check-in Peak Scenario

**Tanggal:** 2026-04-06 08:37:35 WITA  
**Durasi:** ~1.3 detik   
**Skenario:** Peak Check-in (checkin_peak)

---

## Spesifikasi Mesin Testing

| Komponen | Spesifikasi |
|----------|-------------|
| **Nama Host** | ASUSFX506HEB |
| **Merek** | ASUSTeK COMPUTER INC. |
| **Model** | ASUS TUF Gaming F15 FX506HEB |
| **Prosesor** | Intel Core i7-11600H @ 2.90GHz |
| **Core/Thread** | 6 Core / 12 Logical Processors |
| **RAM** | 16 GB (16,905,981,952 bytes) |
| **OS** | Microsoft Windows 11 Home Single Language |
| **Arsitektur** | 64-bit |

---

## Ringkasan Eksekutif

| Status | Jumlah | Persentase |
|--------|--------|------------|
| **Berhasil** | ~7 request | ~12% |
| **401 Unauthorized** | ~40 request | ~68% |
| **429 Rate Limited** | ~12 request | ~20% |

---

## Endpoint yang Diuji

### 1. Login Company A
- **URL:** `POST http://localhost/company-a/api/v1/auth/login`
- **Tipe:** Autentikasi

### 2. Check-in Attendance
- **URL:** `POST http://localhost/attendance/api/v1/attendance/checkin`
- **Tipe:** Create attendance record

---

## Metrik Per Endpoint

### Login (Company A)

| Metric | Nilai |
|--------|-------|
| **Total Request** | ~52 |
| **Berhasil (200)** | 3 |
| **Gagal (401)** | ~40 |
| **Gagal (429)** | ~12 |

#### Latency (Login Berhasil)
| Percentile | Waktu (ms) |
|------------|------------|
| p50 | ~53 |
| p95 | ~53 |
| p99 | ~53 |

#### Latency (Login Gagal - 401)
| Percentile | Waktu (ms) |
|------------|------------|
| p50 | ~4 |
| p95 | ~5 |
| p99 | ~35 |

#### Latency (Login Gagal - 429/Rate Limit)
| Percentile | Waktu (ms) |
|------------|------------|
| p50 | ~0.8 |
| p95 | ~1.1 |
| p99 | ~1.2 |

---

### Check-in (Attendance)

| Metric | Nilai |
|--------|-------|
| **Total Request** | ~5 |
| **Berhasil (200)** | 5 |
| **Gagal** | 0 |

#### Latency (Check-in)
| Percentile | Waktu (ms) | KPI Target |
|------------|------------|------------|
| p50 | ~9 | - |
| p95 | ~11 | < 1500ms ✅ |
| p99 | ~11 | < 2500ms ✅ |

---

## Analisis Error

### Error Code 1401 (Unauthorized - 401)
- **Kemungkinan Cause:** User tidak ditemukan di database
- **Deskripsi:** Credential tidak valid atau user belum terdaftar
- **Jumlah:** ~40 request

### Error Code 1429 (Rate Limited - 429)
- **Kemungkinan Cause:** Terlalu banyak percobaan login dari IP yang sama
- **Deskripsi:** Rate limiter aktif - 5 percobaan gagal dalam 15 menit
- **Jumlah:** ~12 request
- **Latency sangat rendah:** ~0.8ms (langsung di-reject)

---

## Pola Pengujian yang Teramati

### 1. Setup Phase
- Login 1x berhasil untuk mendapatkan token (status 200)
- Duration: ~52ms

### 2. Main Loop (Berulang)
```
FOR each iteration:
  1. Login → Gagal (401) × 10-15x
  2. Login → Rate Limited (429) × 3-5x
  3. (Kadang) Login berhasil → Check-in berhasil
  4. Iteration duration: ~200ms (berhasil) atau ~1000ms (rate limited)
```

### 3. Check-in yang Berhasil
- Setelah login berhasil, check-in berhasil dengan latency ~8-11ms
- Sangat cepat, jauh di bawah KPI (<1500ms)

---

## Kesimpulan

| Aspek | Status | Catatan |
|-------|--------|---------|
| **Check-in Performance** | ✅ LULUS | ~11ms, jauh di bawah KPI 1500ms |
| **Login Rate Limiter** | ✅ BERFUNGSI | 429 response setelah ~5 gagal |
| **Error Rate** | ❌ TINGGI | ~88% request gagal |
| **Data Setup** | ❌ TIDAK VALID | Banyak user tidak ditemukan (1401) |

---

## Rekomendasi

1. **Perbaiki Data User Test:**
   - Pastikan employee user tersedia di database
   - Sesuaikan `EMPLOYEE_EMAIL_START` dan `EMPLOYEE_EMAIL_COUNT` dengan data aktual

2. **Jalankan Full Test:**
   - Durasi pengujian saat ini ~1.3 detik
   - Seharusnya 10 menit seperti dalam dokumentasi

3. **Test Report Endpoint:**
   - Tidak ada data untuk monthly report dalam file ini
   - Perlu jalankan skenario report secara terpisah

4. **Pertimbangkan Caching Token:**
   - Rate limiter menyebabkan bottleneck di login
   - Dengan token yang di-cache, bisa kurangi beban login
