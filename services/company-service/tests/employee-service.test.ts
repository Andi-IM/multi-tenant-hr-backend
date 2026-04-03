import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmployeeService } from '../src/services/employee.service.js';
import { employeeRepository } from '../src/repositories/employee.repository.js';
import { AppError } from '../src/errors/app-error.js';

vi.mock('../src/repositories/employee.repository.js', () => ({
  employeeRepository: {
    create: vi.fn(),
    updateByEmployeeId: vi.fn(),
    findByEmployeeId: vi.fn(),
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
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[],
    },
    timezone: 'Asia/Jakarta',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────
  // createEmployee tests (existing)
  // ──────────────────────────────────────────────

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

  // ──────────────────────────────────────────────
  // updateEmployee tests
  // ──────────────────────────────────────────────

  const mockExistingEmployee = {
    _id: 'mock-id',
    employeeId: 'EMP-A-001',
    fullName: 'Updated Name',
    companyId: 'A',
    joinDate: new Date('2025-01-15T00:00:00.000Z'),
    status: 'ACTIVE',
    workSchedule: {
      shiftStart: '09:00',
      shiftEnd: '17:00',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    timezone: 'Asia/Jakarta',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should update an employee with partial data successfully', async () => {
    const updateInput = { fullName: 'Updated Name' };

    // @ts-ignore
    vi.mocked(employeeRepository.updateByEmployeeId).mockResolvedValue(mockExistingEmployee);

    const result = await service.updateEmployee('EMP-A-001', updateInput, 'A');

    expect(result).toEqual(mockExistingEmployee);
    expect(employeeRepository.updateByEmployeeId).toHaveBeenCalledWith(
      'A',
      'EMP-A-001',
      { fullName: 'Updated Name' },
    );
  });

  it('should throw 404 when employee is not found', async () => {
    vi.mocked(employeeRepository.updateByEmployeeId).mockResolvedValue(null);

    await expect(
      service.updateEmployee('EMP-NONE', { fullName: 'Ghost' }, 'A'),
    ).rejects.toThrow(AppError);

    await expect(
      service.updateEmployee('EMP-NONE', { fullName: 'Ghost' }, 'A'),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Employee with ID "EMP-NONE" not found',
    });
  });

  it('should map employmentStatus to status in the DB payload', async () => {
    const updateInput = { employmentStatus: 'INACTIVE' as const };

    // @ts-ignore
    vi.mocked(employeeRepository.updateByEmployeeId).mockResolvedValue({
      ...mockExistingEmployee,
      status: 'INACTIVE',
    });

    await service.updateEmployee('EMP-A-001', updateInput, 'A');

    expect(employeeRepository.updateByEmployeeId).toHaveBeenCalledWith(
      'A',
      'EMP-A-001',
      { status: 'INACTIVE' },
    );
  });

  it('should map workSchedule fields using dot notation for partial nested updates', async () => {
    const updateInput = {
      workSchedule: {
        startTime: '08:00',
        endTime: '16:00',
      },
    };

    // @ts-ignore
    vi.mocked(employeeRepository.updateByEmployeeId).mockResolvedValue(mockExistingEmployee);

    await service.updateEmployee('EMP-A-001', updateInput, 'A');

    expect(employeeRepository.updateByEmployeeId).toHaveBeenCalledWith(
      'A',
      'EMP-A-001',
      {
        'workSchedule.shiftStart': '08:00',
        'workSchedule.shiftEnd': '16:00',
      },
    );
  });

  it('should handle workSchedule with only workingDays update', async () => {
    const updateInput = {
      workSchedule: {
        workingDays: ['Monday', 'Tuesday', 'Wednesday'] as ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[],
      },
    };

    // @ts-ignore
    vi.mocked(employeeRepository.updateByEmployeeId).mockResolvedValue(mockExistingEmployee);

    await service.updateEmployee('EMP-A-001', updateInput, 'A');

    expect(employeeRepository.updateByEmployeeId).toHaveBeenCalledWith(
      'A',
      'EMP-A-001',
      {
        'workSchedule.workingDays': ['Monday', 'Tuesday', 'Wednesday'],
      },
    );
  });

  it('should handle multiple fields updated at once', async () => {
    const updateInput = {
      fullName: 'New Name',
      employmentStatus: 'INACTIVE' as const,
      timezone: 'America/New_York',
    };

    // @ts-ignore
    vi.mocked(employeeRepository.updateByEmployeeId).mockResolvedValue({
      ...mockExistingEmployee,
      ...updateInput,
      status: 'INACTIVE',
    });

    await service.updateEmployee('EMP-A-001', updateInput, 'A');

    expect(employeeRepository.updateByEmployeeId).toHaveBeenCalledWith(
      'A',
      'EMP-A-001',
      {
        fullName: 'New Name',
        status: 'INACTIVE',
        timezone: 'America/New_York',
      },
    );
  });

  it('should re-throw unexpected database errors during update', async () => {
    const dbError = new Error('Connection refused');
    vi.mocked(employeeRepository.updateByEmployeeId).mockRejectedValue(dbError);

    await expect(
      service.updateEmployee('EMP-A-001', { fullName: 'Test' }, 'A'),
    ).rejects.toThrow('Connection refused');
  });

  // ──────────────────────────────────────────────
  // getEmployeeById tests
  // ──────────────────────────────────────────────

  it('should return employee when found by employeeId', async () => {
    // @ts-ignore
    vi.mocked(employeeRepository.findByEmployeeId).mockResolvedValue(mockExistingEmployee);

    const result = await service.getEmployeeById('EMP-A-001', 'A');

    expect(result).toEqual(mockExistingEmployee);
    expect(employeeRepository.findByEmployeeId).toHaveBeenCalledWith('A', 'EMP-A-001');
  });

  it('should throw 404 when employee is not found by employeeId', async () => {
    vi.mocked(employeeRepository.findByEmployeeId).mockResolvedValue(null);

    await expect(
      service.getEmployeeById('EMP-GHOST', 'A'),
    ).rejects.toThrow(AppError);

    await expect(
      service.getEmployeeById('EMP-GHOST', 'A'),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Employee with ID "EMP-GHOST" not found',
    });
  });

  it('should re-throw unexpected database errors during getById', async () => {
    const dbError = new Error('Read timeout');
    vi.mocked(employeeRepository.findByEmployeeId).mockRejectedValue(dbError);

    await expect(
      service.getEmployeeById('EMP-A-001', 'A'),
    ).rejects.toThrow('Read timeout');
  });
});
