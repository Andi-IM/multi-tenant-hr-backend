import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { getEmployeeModel } from './src/models/employee.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/company_a_db';
  console.log(`Connecting to ${uri}...`);
  await mongoose.connect(uri);

  const Employee = getEmployeeModel();

  await Employee.deleteMany({ companyId: 'A' });

  const passwordHash = await bcrypt.hash('password123', 10);

  const employeeData = [
    {
      employeeId: 'EMP-000',
      fullName: 'Admin HR',
      email: 'admin@company-a.com',
      companyId: 'A',
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
      email: 'employee1@company-a.com',
      companyId: 'A',
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
      email: 'employee2@company-a.com',
      companyId: 'A',
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
  console.log('Employee seed data inserted successfully!');
  console.log('');
  console.log('Login credentials (for integration testing):');
  console.log('  Admin HR:  admin@company-a.com / password123');
  console.log('  Employee: employee1@company-a.com / password123');
  console.log('  Employee: employee2@company-a.com / password123');
  await mongoose.disconnect();
}

seed().catch(console.error);
