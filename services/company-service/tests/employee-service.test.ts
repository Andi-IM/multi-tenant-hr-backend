import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmployeeService } from '../src/services/employee.service.js';
import { employeeRepository } from '../src/repositories/employee.repository.js';
import { AppError } from '../src/errors/app-error.js';

vi.mock('../src/repositories/employee.repository.js', () => ({
  employeeRepository: {
    create: vi.fn(),
  },
}));

describe('EmployeeService', () => {
  const service = new EmployeeService();

  const validInput = {
    employeeId: 'EMP-A-001',
    fullName: 'Test Employee',
    companyId: 'A',
    joinDate: '2025-01-15T00:00:00.000Z',
    employmentStatus: 'ACTIVE' as const,
    workSchedule: {
      startTime: '09:00',
      endTime: '17:00',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    timezone: 'Asia/Jakarta',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an employee successfully', async () => {
    const mockResult = {
      _id: 'mock-id',
      employeeId: validInput.employeeId,
      fullName: validInput.fullName,
      companyId: validInput.companyId,
      joinDate: new Date(validInput.joinDate),
      status: 'ACTIVE',
      workSchedule: {
        shiftStart: '09:00',
        shiftEnd: '17:00',
        workingDays: validInput.workSchedule.workingDays,
      },
      timezone: validInput.timezone,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // @ts-ignore
    vi.mocked(employeeRepository.create).mockResolvedValue(mockResult);

    const result = await service.createEmployee(validInput, 'A');

    expect(result).toEqual(mockResult);
    expect(employeeRepository.create).toHaveBeenCalledWith('A', expect.objectContaining({
      employeeId: 'EMP-A-001',
      fullName: 'Test Employee',
      companyId: 'A',
    }));
  });

  it('should throw 403 when companyId does not match service company', async () => {
    await expect(
      service.createEmployee(validInput, 'B'),
    ).rejects.toThrow(AppError);

    await expect(
      service.createEmployee(validInput, 'B'),
    ).rejects.toMatchObject({
      statusCode: 403,
    });

    expect(employeeRepository.create).not.toHaveBeenCalled();
  });

  it('should throw 409 on duplicate employeeId (E11000)', async () => {
    const duplicateError: any = new Error('E11000 duplicate key');
    duplicateError.code = 11000;
    duplicateError.keyPattern = { employeeId: 1 };

    vi.mocked(employeeRepository.create).mockRejectedValue(duplicateError);

    await expect(
      service.createEmployee(validInput, 'A'),
    ).rejects.toThrow(AppError);

    await expect(
      service.createEmployee(validInput, 'A'),
    ).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('should re-throw non-duplicate database errors', async () => {
    const genericError = new Error('Connection timeout');

    vi.mocked(employeeRepository.create).mockRejectedValue(genericError);

    await expect(
      service.createEmployee(validInput, 'A'),
    ).rejects.toThrow('Connection timeout');
  });

  it('should re-throw 11000 errors that are not employeeId duplicates', async () => {
    const otherDuplicateError: any = new Error('E11000 duplicate key');
    otherDuplicateError.code = 11000;
    otherDuplicateError.keyPattern = { email: 1 }; // Not employeeId

    vi.mocked(employeeRepository.create).mockRejectedValue(otherDuplicateError);

    await expect(
      service.createEmployee(validInput, 'A'),
    ).rejects.toThrow('E11000 duplicate key');
  });
});
