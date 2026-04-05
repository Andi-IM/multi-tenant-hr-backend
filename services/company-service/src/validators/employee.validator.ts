import { z } from 'zod';

const dayNameToNumber: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function normalizeWorkDays(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  if (value.every((v) => typeof v === 'number')) return value;
  if (value.every((v) => typeof v === 'string')) {
    return value.map((v) => dayNameToNumber[String(v).toLowerCase()]);
  }
  return value;
}

/**
 * Work schedule sub-schema.
 * Maps API naming (startTime/endTime) to domain concepts.
 */
const workDaysSchema = z.preprocess(
  normalizeWorkDays,
  z
    .array(z.number().int().min(0).max(6))
    .min(1, 'workDays must contain at least one day')
    .max(7, 'workDays cannot exceed 7 days')
);

const workScheduleSchema = z
  .object({
    startTime: z
      .string({ message: 'startTime is required' })
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'startTime must be in HH:MM format (e.g., "09:00")'),
    endTime: z
      .string({ message: 'endTime is required' })
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'endTime must be in HH:MM format (e.g., "17:00")'),
    toleranceMinutes: z.number().min(0).max(60).default(15),
    workDays: workDaysSchema.optional(),
    workingDays: workDaysSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.workDays == null && data.workingDays == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'workDays (or workingDays) is required',
        path: ['workDays'],
      });
    }
  })
  .transform(({ workingDays, workDays, ...rest }) => ({
    ...rest,
    workDays: workDays ?? workingDays!,
  }));

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
  employeeId: z.string({ message: 'employeeId is required' }).min(1, 'employeeId cannot be empty'),
  fullName: z
    .string({ message: 'fullName is required' })
    .min(2, 'fullName must be at least 2 characters'),
  email: z.string({ message: 'email is required' }).email('Invalid email format'),
  companyId: z.string({ message: 'companyId is required' }).min(1, 'companyId cannot be empty'),
  joinDate: z.string({ message: 'joinDate is required' }).datetime({
    message: 'joinDate must be a valid ISO 8601 date string (e.g., "2025-01-15T00:00:00.000Z")',
  }),
  employmentStatus: z.preprocess(
    (v) => (typeof v === 'string' ? v.toLowerCase() : v),
    z.enum(['active', 'inactive', 'terminated'], {
      message: 'employmentStatus must be "active", "inactive", or "terminated"',
    })
  ),
  workSchedule: workScheduleSchema,
  timezone: z
    .string({ message: 'timezone is required' })
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
      { message: 'timezone must be a valid IANA timezone (e.g., "Asia/Jakarta")' }
    ),
  role: z.enum(['EMPLOYEE', 'ADMIN_HR'], {
    message: 'role must be "EMPLOYEE" or "ADMIN_HR"',
  }),
  password: z
    .string({ message: 'password is required' })
    .min(8, 'password must be at least 8 characters'),
});

/**
 * TypeScript type inferred from the Zod schema.
 */
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

/**
 * Work schedule sub-schema for updates (all fields optional).
 */
const updateWorkScheduleSchema = z.object({
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'startTime must be in HH:MM format (e.g., "09:00")')
    .optional(),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'endTime must be in HH:MM format (e.g., "17:00")')
    .optional(),
  toleranceMinutes: z.number().min(0).max(60).optional(),
  workDays: z
    .array(z.number().min(0).max(6))
    .min(1, 'workDays must contain at least one day')
    .max(7, 'workDays cannot exceed 7 days')
    .optional(),
});

/**
 * Zod schema for the Update Employee request body (PATCH).
 *
 * Rules:
 * - employeeId, companyId, joinDate are immutable — NOT accepted.
 * - All other fields are optional (partial update semantics).
 * - At least one field must be provided to avoid no-op requests.
 *
 * Updatable fields: fullName, employmentStatus, workSchedule, timezone.
 */
export const updateEmployeeSchema = z
  .object({
    fullName: z.string().min(2, 'fullName must be at least 2 characters').optional(),
    employmentStatus: z
      .enum(['active', 'inactive', 'terminated'], {
        message: 'employmentStatus must be "active", "inactive", or "terminated"',
      })
      .optional(),
    workSchedule: updateWorkScheduleSchema.optional(),
    timezone: z
      .string()
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
        { message: 'timezone must be a valid IANA timezone (e.g., "Asia/Jakarta")' }
      )
      .optional(),
    role: z.enum(['EMPLOYEE', 'ADMIN_HR']).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Request body must contain at least one field to update',
  });

/**
 * TypeScript type inferred from the update Zod schema.
 */
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

/**
 * Zod schema for the List Employees query parameters.
 *
 * Supports:
 * - Pagination: page (default 1) and limit (default 10, max 100)
 * - Filtering: employmentStatus (ACTIVE | INACTIVE)
 * - Sorting: sortBy (fullName | joinDate) and sortOrder (asc | desc)
 *
 * Uses z.coerce for automatic string → number conversion since
 * query parameters are always received as strings.
 */
export const listEmployeesQuerySchema = z.object({
  page: z.coerce
    .number()
    .int('page must be an integer')
    .min(1, 'page must be at least 1')
    .default(1),
  limit: z.coerce
    .number()
    .int('limit must be an integer')
    .min(1, 'limit must be at least 1')
    .max(100, 'limit cannot exceed 100')
    .default(10),
  employmentStatus: z
    .enum(['active', 'inactive', 'terminated'], {
      message: 'employmentStatus must be "active", "inactive", or "terminated"',
    })
    .optional(),
  sortBy: z
    .enum(['fullName', 'joinDate'], {
      message: 'sortBy must be "fullName" or "joinDate"',
    })
    .default('joinDate'),
  sortOrder: z
    .enum(['asc', 'desc'], {
      message: 'sortOrder must be "asc" or "desc"',
    })
    .default('desc'),
});

/**
 * TypeScript type inferred from the list query schema.
 */
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;
