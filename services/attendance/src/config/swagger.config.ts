import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Attendance Service API',
      version: '1.0.0',
      description: 'API for managing employee attendance with multi-tenant database isolation.',
    },
    servers: [
      {
        url: '/attendance',
        description: 'Gateway (Attendance)',
      },
      {
        url: 'http://localhost:3003',
        description: 'Local Direct Port (3003)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Attendance: {
          type: 'object',
          properties: {
            employeeId: { type: 'string', example: 'EMP-A-001' },
            companyId: { type: 'string', example: 'A' },
            date: { type: 'string', format: 'date', example: '2025-01-15' },
            checkInTime: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-15T08:55:00.000Z',
            },
            checkOutTime: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-15T17:05:00.000Z',
            },
            status: {
              type: 'string',
              enum: ['on-time', 'late', 'absent', 'incomplete'],
              example: 'on-time',
            },
            timezone: { type: 'string', example: 'Asia/Jakarta' },
            workScheduleSnapshot: {
              type: 'object',
              properties: {
                startTime: { type: 'string', example: '08:00' },
                endTime: { type: 'string', example: '17:00' },
                toleranceMinutes: { type: 'number', example: 15 },
                workDays: { type: 'array', items: { type: 'number' }, example: [1, 2, 3, 4, 5] },
              },
            },
          },
        },
        LeavePermissionRequest: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '674fabc1234567890abcdef' },
            employeeId: { type: 'string', example: 'EMP-A-001' },
            companyId: { type: 'string', example: 'A' },
            type: {
              type: 'string',
              enum: ['leave', 'permission'],
              example: 'leave',
            },
            startDate: {
              type: 'string',
              format: 'date',
              example: '2026-04-10',
            },
            endDate: {
              type: 'string',
              format: 'date',
              example: '2026-04-12',
            },
            reason: {
              type: 'string',
              example: 'Family emergency',
            },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected'],
              example: 'pending',
            },
            approvedBy: { type: 'string', example: null },
            approvedAt: { type: 'string', format: 'date-time', example: null },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-05T10:30:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-05T10:30:00.000Z',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string', example: 'Error message detail' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    '**/src/routes/*.ts',
    '**/src/controllers/*.ts',
    '**/dist/routes/*.js',
    '**/dist/controllers/*.js',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
