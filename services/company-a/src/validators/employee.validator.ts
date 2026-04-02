import { z } from 'zod';

/**
 * Work schedule sub-schema.
 * Maps API naming (startTime/endTime) to domain concepts.
 */
const workScheduleSchema = z.object({
  startTime: z
    .string({ required_error: 'startTime is required' })
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'startTime must be in HH:MM format (e.g., "09:00")'),
  endTime: z
    .string({ required_error: 'endTime is required' })
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'endTime must be in HH:MM format (e.g., "17:00")'),
  workingDays: z
    .array(
      z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], {
        message: 'Each working day must be a valid day name (e.g., "Monday")',
      }),
    )
    .min(1, 'workingDays must contain at least one day')
    .max(7, 'workingDays cannot exceed 7 days'),
});

/**
 * Zod schema for the Create Employee request body.
 *
 * Validates:
 * - employeeId: non-empty string
 * - fullName: minimum 2 characters
 * - companyId: non-empty string
 * - joinDate: valid ISO 8601 date string
 * - employmentStatus: "ACTIVE" or "INACTIVE"
 * - workSchedule: object with startTime, endTime, workingDays
 * - timezone: valid IANA timezone string
 */
export const createEmployeeSchema = z.object({
  employeeId: z
    .string({ required_error: 'employeeId is required' })
    .min(1, 'employeeId cannot be empty'),
  fullName: z
    .string({ required_error: 'fullName is required' })
    .min(2, 'fullName must be at least 2 characters'),
  companyId: z
    .string({ required_error: 'companyId is required' })
    .min(1, 'companyId cannot be empty'),
  joinDate: z
    .string({ required_error: 'joinDate is required' })
    .datetime({ message: 'joinDate must be a valid ISO 8601 date string (e.g., "2025-01-15T00:00:00.000Z")' }),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE'], {
    required_error: 'employmentStatus is required',
    message: 'employmentStatus must be either "ACTIVE" or "INACTIVE"',
  }),
  workSchedule: workScheduleSchema,
  timezone: z
    .string({ required_error: 'timezone is required' })
    .min(1, 'timezone cannot be empty')
    .refine(
      (tz) => {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: tz });
          return true;
        } catch {
          return false;
        }
      },
      { message: 'timezone must be a valid IANA timezone (e.g., "Asia/Jakarta")' },
    ),
});

/**
 * TypeScript type inferred from the Zod schema.
 */
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
