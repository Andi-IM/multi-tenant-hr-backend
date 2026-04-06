import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_db';
  console.log(`Connecting to ${uri}...`);
  await mongoose.connect(uri);

  const { getAttendanceModel } = await import('./src/models/attendance.model.js');
  const Attendance = getAttendanceModel();

  await Attendance.deleteMany({ companyId: 'A' });

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const attendanceData = [
    {
      employeeId: 'EMP-001',
      companyId: 'A',
      date: new Date(now.setHours(0, 0, 0, 0)),
      checkInTime: new Date(now.setHours(8, 0, 0, 0)),
      status: 'on-time',
      timezone: 'Asia/Jakarta',
      workScheduleSnapshot: {
        startTime: '08:00',
        endTime: '17:00',
        toleranceMinutes: 15,
        workDays: [1, 2, 3, 4, 5],
      },
    },
    {
      employeeId: 'EMP-002',
      companyId: 'A',
      date: new Date(now.setHours(0, 0, 0, 0)),
      checkInTime: new Date(now.setHours(9, 30, 0, 0)),
      status: 'late',
      timezone: 'Asia/Jakarta',
      workScheduleSnapshot: {
        startTime: '08:00',
        endTime: '17:00',
        toleranceMinutes: 15,
        workDays: [1, 2, 3, 4, 5],
      },
    },
    {
      employeeId: 'EMP-001',
      companyId: 'A',
      date: new Date(yesterday.setHours(0, 0, 0, 0)),
      checkInTime: new Date(yesterday.setHours(8, 5, 0, 0)),
      checkOutTime: new Date(yesterday.setHours(17, 10, 0, 0)),
      status: 'on-time',
      timezone: 'Asia/Jakarta',
      workScheduleSnapshot: {
        startTime: '08:00',
        endTime: '17:00',
        toleranceMinutes: 15,
        workDays: [1, 2, 3, 4, 5],
      },
    },
  ];

  await Attendance.insertMany(attendanceData);
  console.log('Seed data inserted successfully!');
  await mongoose.disconnect();
}

seed().catch(console.error);