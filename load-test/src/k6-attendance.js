import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost';
const COMPANY_A_PREFIX = __ENV.COMPANY_A_PREFIX || '/company-a';
const ATTENDANCE_PREFIX = __ENV.ATTENDANCE_PREFIX || '/attendance';

const EMPLOYEE_PASSWORD = __ENV.EMPLOYEE_PASSWORD || 'password123';
const EMPLOYEE_EMAIL_PREFIX = __ENV.EMPLOYEE_EMAIL_PREFIX || 'employee';
const EMPLOYEE_EMAIL_DOMAIN = __ENV.EMPLOYEE_EMAIL_DOMAIN || '@company-a.com';
const EMPLOYEE_EMAIL_START = Number(__ENV.EMPLOYEE_EMAIL_START || '1');
const EMPLOYEE_EMAIL_COUNT = Number(__ENV.EMPLOYEE_EMAIL_COUNT || '2000');

const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@company-a.com';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'password123';

const REPORT_START_DATE = __ENV.REPORT_START_DATE || '2026-03-01';
const REPORT_END_DATE = __ENV.REPORT_END_DATE || '2026-03-31';
const REPORT_GROUP_BY = __ENV.REPORT_GROUP_BY || 'month';

function loginCompanyA(email, password) {
  const url = `${BASE_URL}${COMPANY_A_PREFIX}/api/v1/auth/login`;
  const payload = JSON.stringify({ email, password });
  const res = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'company-a-login' },
  });

  const ok = check(res, {
    'login status 200': (r) => r.status === 200,
    'login has token': (r) => {
      try {
        const body = r.json();
        return Boolean(body?.data?.accessToken);
      } catch {
        return false;
      }
    },
  });

  if (!ok) return null;
  return res.json().data.accessToken;
}

const scenarios = {};

if ((__ENV.ENABLE_CHECKIN || 'true') !== 'false') {
  scenarios.checkin_peak = {
    executor: 'constant-arrival-rate',
    rate: Number(__ENV.CHECKIN_RPS || '50'),
    timeUnit: '1s',
    duration: __ENV.CHECKIN_DURATION || '10m',
    preAllocatedVUs: Number(__ENV.CHECKIN_PREALLOC_VUS || '50'),
    maxVUs: Number(__ENV.CHECKIN_MAX_VUS || '250'),
    exec: 'checkinPeak',
  };
}

if ((__ENV.ENABLE_REPORT || 'true') !== 'false') {
  scenarios.report_monthly = {
    executor: 'constant-vus',
    vus: Number(__ENV.REPORT_VUS || '20'),
    duration: __ENV.REPORT_DURATION || '10m',
    exec: 'monthlyReport',
    startTime: __ENV.REPORT_START_TIME || '0s',
  };
}

if ((__ENV.ENABLE_RATELIMIT || 'false') === 'true') {
  scenarios.login_rate_limit = {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '30s', target: 5 },
      { duration: '30s', target: 5 },
      { duration: '30s', target: 1 },
    ],
    exec: 'loginRateLimit',
    startTime: __ENV.RATELIMIT_START_TIME || '0s',
  };
}

export const options = {
  scenarios,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{endpoint:attendance-checkin}': ['p(95)<1500', 'p(99)<2500'],
    'http_req_duration{endpoint:attendance-report}': ['p(95)<3000', 'p(99)<5000'],
  },
};

export function setup() {
  const adminToken = loginCompanyA(ADMIN_EMAIL, ADMIN_PASSWORD);
  return { adminToken };
}

let vuToken = null;
let vuEmail = null;

export function checkinPeak() {
  if (!vuEmail) {
    const idx = (__VU - 1) % EMPLOYEE_EMAIL_COUNT;
    const n = EMPLOYEE_EMAIL_START + idx;
    vuEmail = `${EMPLOYEE_EMAIL_PREFIX}${n}${EMPLOYEE_EMAIL_DOMAIN}`;
  }

  if (!vuToken) {
    vuToken = loginCompanyA(vuEmail, EMPLOYEE_PASSWORD);
    if (!vuToken) {
      sleep(1);
      return;
    }
  }

  const url = `${BASE_URL}${ATTENDANCE_PREFIX}/api/v1/attendance/checkin`;
  const res = http.post(
    url,
    JSON.stringify({}),
    {
      headers: {
        Authorization: `Bearer ${vuToken}`,
        'Content-Type': 'application/json',
      },
      tags: { endpoint: 'attendance-checkin' },
    }
  );

  check(res, {
    'checkin status 200/201': (r) => r.status === 200 || r.status === 201,
  });

  sleep(Number(__ENV.CHECKIN_THINK_TIME || '0.2'));
}

export function monthlyReport(data) {
  if (!data?.adminToken) {
    sleep(1);
    return;
  }

  const url =
    `${BASE_URL}${ATTENDANCE_PREFIX}/api/v1/attendances/report` +
    `?start_date=${encodeURIComponent(REPORT_START_DATE)}` +
    `&end_date=${encodeURIComponent(REPORT_END_DATE)}` +
    `&group_by=${encodeURIComponent(REPORT_GROUP_BY)}`;

  const res = http.get(url, {
    headers: {
      Authorization: `Bearer ${data.adminToken}`,
    },
    tags: { endpoint: 'attendance-report' },
  });

  check(res, {
    'report status 200': (r) => r.status === 200,
  });

  sleep(Number(__ENV.REPORT_THINK_TIME || '1'));
}

export function loginRateLimit() {
  const url = `${BASE_URL}${COMPANY_A_PREFIX}/api/v1/auth/login`;
  const payload = JSON.stringify({ email: ADMIN_EMAIL, password: 'wrong-password' });
  const res = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'company-a-login-fail' },
  });

  check(res, {
    'login fail is 401/429': (r) => r.status === 401 || r.status === 429,
  });

  sleep(0.2);
}