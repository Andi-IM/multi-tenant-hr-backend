# Load Test

Implementasi load test menggunakan k6 berdasarkan `docs/load-test-report.md`.

## Prerequisites

- k6 v0.49.0 atau lebih tinggi
- Services running (Company A, Company B, Attendance Service)
- Nginx API Gateway berjalan

## Skenario

| Skenario | Deskripsi | Target |
|----------|-----------|--------|
| A - Peak Check-in | Morning burst check-in | 50 req/s, p95 < 1.5s |
| B - Monthly Report | Report generation under load | 20 VUs, p95 < 3s |
| C - Rate Limiter | Login rate limit test | 429 after 5 failed attempts |

## Menjalankan Load Test

### Semua Skenario (A + B)

```bash
k6 run -e BASE_URL=http://localhost load-test/src/k6-attendance.js
```

### Hanya Check-in Peak (Skenario A)

```bash
k6 run -e BASE_URL=http://localhost -e ENABLE_REPORT=false load-test/src/k6-attendance.js
```

### Hanya Monthly Report (Skenario B)

```bash
k6 run -e BASE_URL=http://localhost -e ENABLE_CHECKIN=false load-test/src/k6-attendance.js
```

### Dengan Rate Limiter (Skenario C)

```bash
k6 run -e BASE_URL=http://localhost -e ENABLE_RATELIMIT=true load-test/src/k6-attendance.js
```

## Environment Variables

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `BASE_URL` | `http://localhost` | Base URL gateway |
| `COMPANY_A_PREFIX` | `/company-a` | Company A API prefix |
| `ATTENDANCE_PREFIX` | `/attendance` | Attendance API prefix |
| `EMPLOYEE_EMAIL_PREFIX` | `employee` | Prefix untuk employee email |
| `EMPLOYEE_EMAIL_DOMAIN` | `@company-a.com` | Domain untuk employee email |
| `EMPLOYEE_EMAIL_START` | `1` | Awal nomor employee |
| `EMPLOYEE_EMAIL_COUNT` | `2000` | Jumlah employee yang diuji |
| `EMPLOYEE_PASSWORD` | `password123` | Password employee |
| `ADMIN_EMAIL` | `admin@company-a.com` | Admin email untuk report |
| `ADMIN_PASSWORD` | `password123` | Password admin |
| `REPORT_START_DATE` | `2026-03-01` | Tanggal mulai report |
| `REPORT_END_DATE` | `2026-03-31` | Tanggal akhir report |
| `REPORT_GROUP_BY` | `month` | Grup report |
| `CHECKIN_RPS` | `50` | Request per second untuk check-in |
| `CHECKIN_DURATION` | `10m` | Durasi check-in test |
| `CHECKIN_PREALLOC_VUS` | `50` | Pre-allocated VUs |
| `CHECKIN_MAX_VUS` | `250` | Max VUs |
| `REPORT_VUS` | `20` | Virtual users untuk report |
| `REPORT_DURATION` | `10m` | Durasi report test |

## Contoh dengan Custom Parameters

```bash
k6 run \
  -e BASE_URL=http://localhost \
  -e CHECKIN_RPS=100 \
  -e REPORT_VUS=50 \
  load-test/src/k6-attendance.js
```

## Output

k6 akan menampilkan:
- `http_req_duration`: p50, p95, p99
- `http_reqs`: throughput (req/s)
- `http_req_failed`: error rate

Threshold yang dikonfigurasi:
- `http_req_failed`: rate < 0.01 (1%)
- Check-in p95 < 1500ms, p99 < 2500ms
- Report p95 < 3000ms, p99 < 5000ms