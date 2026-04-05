import { z } from 'zod';

export const workScheduleSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  toleranceMinutes: z.number(),
  workDays: z.array(z.number()),
});

export type WorkSchedule = z.infer<typeof workScheduleSchema>;

export const employeeStatusResponseSchema = z.object({
  status: z.string(),
  data: z.object({
    employeeId: z.string(),
    companyId: z.string(),
    role: z.string(),
    employmentStatus: z.string(),
    workSchedule: workScheduleSchema,
    timezone: z.string(),
  }),
});

export type EmployeeStatusResponse = z.infer<typeof employeeStatusResponseSchema>;

export const employeeListResponseSchema = z.object({
  status: z.string(),
  data: z.array(
    z.object({
      employeeId: z.string(),
      fullName: z.string(),
      workSchedule: workScheduleSchema,
      timezone: z.string(),
    })
  ),
});

export type EmployeeListResponse = z.infer<typeof employeeListResponseSchema>;
