import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Company Service API',
      version: '1.0.0',
      description: 'API for managing employee data with multi-tenant database isolation.',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
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
        Employee: {
          type: 'object',
          required: ['employeeId', 'fullName', 'companyId', 'joinDate', 'employmentStatus', 'workSchedule', 'timezone'],
          properties: {
            employeeId: { type: 'string', example: 'EMP-A-001' },
            fullName: { type: 'string', example: 'John Doe' },
            companyId: { type: 'string', example: 'A' },
            joinDate: { type: 'string', format: 'date-time', example: '2025-01-15T00:00:00.000Z' },
            employmentStatus: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], example: 'ACTIVE' },
            workSchedule: {
              type: 'object',
              properties: {
                startTime: { type: 'string', example: '09:00' },
                endTime: { type: 'string', example: '17:00' },
                workingDays: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                },
              },
            },
            timezone: { type: 'string', example: 'Asia/Jakarta' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string', example: 'Error message detail' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
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
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
