import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding employee data...');

  const employees = [
    {
      employeeId: 'EMP001',
      fullName: 'Andi Jaga',
      companyId: 'COMP_A',
      joinDate: new Date('2023-01-15'),
      status: 'Active',
      timezone: 'Asia/Jakarta',
      workSchedule: {
        shiftStart: '09:00',
        shiftEnd: '17:00',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
    },
    {
      employeeId: 'EMP002',
      fullName: 'Fauzan Ahsan',
      companyId: 'COMP_B',
      joinDate: new Date('2023-06-01'),
      status: 'Active',
      timezone: 'Asia/Jakarta',
      workSchedule: {
        shiftStart: '08:00',
        shiftEnd: '16:00',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
    },
  ];

  for (const employee of employees) {
    const existing = await prisma.employee.findUnique({
      where: { employeeId: employee.employeeId },
    }).catch(() => null);

    if (existing) {
      await prisma.$runCommandRaw({
        update: "Employee",
        updates: [
          {
            q: { employeeId: employee.employeeId },
            u: { $set: { ...employee, joinDate: { $date: employee.joinDate.toISOString() } } },
          }
        ]
      });
    } else {
      await prisma.$runCommandRaw({
        insert: "Employee",
        documents: [
          { ...employee, joinDate: { $date: employee.joinDate.toISOString() } }
        ]
      });
    }
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
