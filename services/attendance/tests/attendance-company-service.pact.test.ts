import { describe, it, expect, beforeAll } from 'vitest';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';
import { AttendanceService } from '../src/services/attendance.service';

const { like, string, eachLike } = MatchersV3;

const provider = new PactV3({
  consumer: 'AttendanceService',
  provider: 'CompanyService',
  dir: path.resolve(process.cwd(), '../../pacts'), // write pacts to workspace root
});

describe('Attendance Service - Company Service Contract', () => {
  it('should successfully verify employee status when employee is active', async () => {
    const employeeId = 'emp_123';
    const companyId = 'comp_abc';
    const token = 'fake-token';

    // 1. Arrange: Setup the expected interaction
    provider
      .given('an active employee exists')
      .uponReceiving('a request for employee status')
      .withRequest({
        method: 'GET',
        path: `/api/v1/internal/employees/${employeeId}/status`,
        headers: {
          'X-Company-ID': companyId,
          Authorization: `Bearer ${token}`,
        },
      })
      .willRespondWith({
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: {
          status: 'success',
          data: {
            employmentStatus: 'ACTIVE',
            workSchedule: {
              startTime: like('09:00'),
              endTime: like('17:00'),
              workingDays: eachLike('Monday'),
            },
            timezone: string('Asia/Jakarta'),
          },
        },
      });

    // 2. Act & Assert: Execute the test within the pact context
    await provider.executeTest(async (mockServer) => {
      const attendanceService = new AttendanceService();

      // Override the URL to point to the mock provider
      process.env.COMPANY_SERVICE_URL = mockServer.url;
      // Re-initialize the service to pick up the mocked URL
      // Since attendanceService is a class and it reads env in constructor
      // We will instantiate it here
      const service = new AttendanceService();

      const result = await service.verifyEmployeeStatus(employeeId, companyId, token);

      expect(result.employmentStatus).toBe('ACTIVE');
      expect(result.workSchedule.startTime).toBeDefined();
      expect(result.timezone).toBeDefined();
    });
  });
});
