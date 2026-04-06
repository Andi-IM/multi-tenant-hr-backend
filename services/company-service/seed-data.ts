import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

// Set defaults for seeding BEFORE importing models
process.env.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
process.env.COMPANY_ID = process.env.COMPANY_ID || 'A';

async function seed() {
  // Dynamic import to ensure env vars are set before module loads
  const { getEmployeeModel } = await import('./src/models/employee.model.js');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/company_a_db';
  const companyId = process.env.COMPANY_ID || 'A';
  const companySlug = companyId === 'B' ? 'company-b' : 'company-a';

  console.log(`Connecting to ${uri}...`);
  console.log(`Company ID: ${companyId}`);
  await mongoose.connect(uri);

  const Employee = getEmployeeModel();
  await Employee.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);

  const employeeData = [
    {
      employeeId: 'EMP-000',
      fullName: 'Admin HR',
      email: `admin@${companySlug}.com`,
      companyId,
      joinDate: new Date(),
      status: 'active',
      workSchedule: {
        startTime: '08:00',
        endTime: '17:00',
        toleranceMinutes: 15,
        workDays: [1, 2, 3, 4, 5],
      },
      timezone: 'Asia/Jakarta',
      role: 'ADMIN_HR',
      passwordHash,
    },
    {
      employeeId: 'EMP-001',
      fullName: 'Employee One',
      email: `employee1@${companySlug}.com`,
      companyId,
      joinDate: new Date(),
      status: 'active',
      workSchedule: {
        startTime: '08:00',
        endTime: '17:00',
        toleranceMinutes: 15,
        workDays: [1, 2, 3, 4, 5],
      },
      timezone: 'Asia/Jakarta',
      role: 'EMPLOYEE',
      passwordHash,
    },
    {
      employeeId: 'EMP-002',
      fullName: 'Employee Two',
      email: `employee2@${companySlug}.com`,
      companyId,
      joinDate: new Date(),
      status: 'active',
      workSchedule: {
        startTime: '09:00',
        endTime: '18:00',
        toleranceMinutes: 15,
        workDays: [1, 2, 3, 4, 5],
      },
      timezone: 'Asia/Jakarta',
      role: 'EMPLOYEE',
      passwordHash,
    },
  ];

  await Employee.insertMany(employeeData);
  console.log('Seed data inserted successfully!');
  console.log('Login credentials:');
  console.log(`  Admin: admin@${companySlug}.com / password123`);
  console.log(`  Employee: employee1@${companySlug}.com / password123`);
  console.log(`  Employee: employee2@${companySlug}.com / password123`);
  await mongoose.disconnect();
}

seed().catch(console.error);
