# Load Test Report - Attendance Service

**Tanggal:** 2026-04-06  
**Durasi:** 10 menit  
**Skenario:** Peak Check-in + Monthly Report

---

## Ringkasan Eksekutif

| Metrik | Nilai |
|--------|-------|
| **Total Request** | 38,864 |
| **Berhasil** | 38,864 (100%) |
| **Gagal** | 0 (0%) |
| **Total Checks** | 38,953 |
| **Checks Passed** | 100% |

---

## Metrik Per Skenario

### 1. Check-in Peak (checkin_peak)

| Percentile | Latency | KPI Target | Status |
|------------|---------|------------|--------|
| avg | 248.59 ms | - | ✅ |
| p95 | 470.45 ms | < 1500ms | ✅ |
| p99 | 968.61 ms | < 2500ms | ✅ |

### 2. Monthly Report (report_monthly)

| Percentile | Latency | KPI Target | Status |
|------------|---------|------------|--------|
| avg | 363.18 ms | - | ✅ |
| p95 | 655.98 ms | < 3000ms | ✅ |
| p99 | 1091.44 ms | < 5000ms | ✅ |

---

## Thresholds

| Threshold | Target | Actual | Status |
|-----------|--------|--------|--------|
| `http_req_failed` | < 1% | 0.00% | ✅ PASS |
| Check-in p(95) | < 1500ms | 470.45ms | ✅ PASS |
| Check-in p(99) | < 2500ms | 968.61ms | ✅ PASS |
| Report p(95) | < 3000ms | 655.98ms | ✅ PASS |
| Report p(99) | < 5000ms | 1.09s | ✅ PASS |

---

## Kesimpulan

| Aspek | Status |
|-------|--------|
| **Check-in Performance** | ✅ LULUS |
| **Report Performance** | ✅ LULUS |
| **Error Rate** | ✅ LULUS |
| **All Thresholds** | ✅ PASS |

Semua target KPI tercapai. Sistem siap untuk production.