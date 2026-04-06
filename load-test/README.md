# Load Test

## Prerequisites

- k6 v0.49.0 atau lebih tinggi
- Services running (Company A, Attendance Service)
- MongoDB running

## Jalankan Load Test

```bash
k6 run load-test/src/k6-attendance.js
```

### Environment Variables

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `BASE_URL` | `http://localhost` | Base URL gateway |
| `EMPLOYEE_EMAIL_COUNT` | `2000` | Jumlah employee |

### Contoh

```bash
# Test dengan custom base URL
k6 run -e BASE_URL=http://localhost:8080 load-test/src/k6-attendance.js
```

## Output

- `http_req_duration`: p50, p95, p99
- `http_reqs`: throughput (req/s)
- `http_req_failed`: error rate