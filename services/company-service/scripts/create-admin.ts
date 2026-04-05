import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { getEmployeeModel } from '../src/models/employee.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function createInitialAdmin() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/company_a_db';
  console.log(`Connecting to ${uri}...`);
  await mongoose.connect(uri);

  const Employee = getEmployeeModel();

  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const companyId = process.env.COMPANY_ID || 'A';

  if (!email || !password) {
    console.error(
      'Error: INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD environment variables are required'
    );
    console.error('');
    console.error('Usage:');
    console.error(
      '  INITIAL_ADMIN_EMAIL="admin@company-a.com" INITIAL_ADMIN_PASSWORD="secure-password-123" pnpm run create-admin'
    );
    console.error('');
    console.error('Or add to .env:');
    console.error('  INITIAL_ADMIN_EMAIL=admin@company-a.com');
    console.error('  INITIAL_ADMIN_PASSWORD=secure-password-123');
    await mongoose.disconnect();
    process.exit(1);
  }

  const existingAdmin = await Employee.findOne({ email, companyId });

  if (existingAdmin) {
    console.log(`Admin user "${email}" already exists. Skipping creation.`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const adminData = {
    employeeId: 'ADM-001',
    fullName: 'System Administrator',
    email,
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
    role: 'ADMIN_HR',
    passwordHash,
  };

  const admin = await Employee.create(adminData);
  console.log(`Initial admin created successfully!`);
  console.log('');
  console.log('Admin credentials:');
  console.log(`  Email: ${email}`);
  console.log(`  Role: ADMIN_HR`);
  console.log(`  Company: ${companyId}`);
  console.log(`  Employee ID: ${admin.employeeId}`);

  await mongoose.disconnect();
}

createInitialAdmin().catch((err) => {
  console.error('Failed to create initial admin:', err);
  process.exit(1);
});
