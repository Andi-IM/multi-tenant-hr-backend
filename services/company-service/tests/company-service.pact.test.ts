import { describe, it, beforeAll, afterAll, vi } from 'vitest';
import { Verifier } from '@pact-foundation/pact';
import path from 'path';
import app from '../src/app';
import { employeeRepository } from '../src/repositories/employee.repository';
import http from 'http';

vi.mock('../src/repositories/employee.repository', () => ({
  employeeRepository: {
    findActiveEmployeeForInternal: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', async () => {
  const actual = await vi.importActual('jsonwebtoken');
  return {
    default: {
      ...(actual as any),
      verify: vi.fn((token: string, secret: string) => {
        if (token === 'fake-token') {
          return { companyId: 'comp_abc', role: 'SYSTEM_ACTOR' };
        }
        return (actual as any).verify(token, secret);
      }),
    },
  };
});

describe('Company Service - Pact Provider', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    // Start Express app
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        port = (server.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  it('validates the expectations of Attendance Service', async () => {
    // We must pass COMPANY_ID matching the expected auth claims
    process.env.COMPANY_ID = 'comp_abc';

    // @ts-ignore
    vi.mocked(employeeRepository.findActiveEmployeeForInternal).mockResolvedValue({
      status: 'ACTIVE',
      workSchedule: {
        shiftStart: '09:00',
        shiftEnd: '17:00',
        workingDays: ['Monday'],
      },
      timezone: 'Asia/Jakarta',
    });

    const opts = {
      provider: 'CompanyService',
      providerBaseUrl: `http://localhost:${port}`,
      pactUrls: [path.resolve(process.cwd(), '../../pacts/AttendanceService-CompanyService.json')],
      stateHandlers: {
        'an active employee exists': async () => {
          // The mock is already set up above, but stateHandlers allows dynamic setup if needed
          return Promise.resolve('ok');
        },
      },
    };

    const verifier = new Verifier(opts);
    await verifier.verifyProvider();
  });
});
